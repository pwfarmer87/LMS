import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

// Validation schemas
const moduleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
  isPublished: z.boolean().optional(),
});

const contentItemSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(1),
  contentType: z.enum(['lecture', 'reading', 'video', 'quiz', 'assignment', 'discussion']),
  content: z.string().optional(),
  aiGenerated: z.boolean().optional(),
  orderIndex: z.number().optional(),
  durationMinutes: z.number().optional(),
  isPublished: z.boolean().optional(),
});

// Get all modules for a course
router.get('/course/:courseId', (req: AuthRequest, res: Response) => {
  try {
    // Verify course ownership
    const course = get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [
      req.params.courseId,
      req.user!.id,
    ]);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const modules = all(
      `SELECT m.*,
        (SELECT COUNT(*) FROM content_items WHERE module_id = m.id) as content_count
       FROM modules m
       WHERE m.course_id = ?
       ORDER BY m.order_index`,
      [req.params.courseId]
    );

    res.json({ modules });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
});

// Get single module with content
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const module = get(
      `SELECT m.* FROM modules m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!module) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }

    const contentItems = all(
      'SELECT * FROM content_items WHERE module_id = ? ORDER BY order_index',
      [req.params.id]
    );

    res.json({ module, contentItems });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({ error: 'Failed to fetch module' });
  }
});

// Create module
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = moduleSchema.parse(req.body);

    // Verify course ownership
    const course = get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [
      data.courseId,
      req.user!.id,
    ]);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get next order index
    const maxOrder = get<{ max: number }>(
      'SELECT COALESCE(MAX(order_index), 0) as max FROM modules WHERE course_id = ?',
      [data.courseId]
    );

    const moduleId = uuidv4();
    run(
      `INSERT INTO modules (id, course_id, title, description, order_index, is_published)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        moduleId,
        data.courseId,
        data.title,
        data.description || null,
        data.orderIndex ?? (maxOrder?.max || 0) + 1,
        data.isPublished ? 1 : 0,
      ]
    );

    const module = get('SELECT * FROM modules WHERE id = ?', [moduleId]);
    res.status(201).json({ module });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// Update module
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = moduleSchema.partial().parse(req.body);

    // Verify ownership
    const existing = get(
      `SELECT m.id FROM modules m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.orderIndex !== undefined) {
      updates.push('order_index = ?');
      values.push(data.orderIndex);
    }
    if (data.isPublished !== undefined) {
      updates.push('is_published = ?');
      values.push(data.isPublished ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      run(`UPDATE modules SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const module = get('SELECT * FROM modules WHERE id = ?', [req.params.id]);
    res.json({ module });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// Delete module
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const existing = get(
      `SELECT m.id FROM modules m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }

    run('DELETE FROM modules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// --- Content Items ---

// Get content item
router.get('/content/:id', (req: AuthRequest, res: Response) => {
  try {
    const item = get(
      `SELECT ci.* FROM content_items ci
       JOIN modules m ON ci.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE ci.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!item) {
      res.status(404).json({ error: 'Content item not found' });
      return;
    }

    res.json({ item });
  } catch (error) {
    console.error('Get content item error:', error);
    res.status(500).json({ error: 'Failed to fetch content item' });
  }
});

// Create content item
router.post('/content', (req: AuthRequest, res: Response) => {
  try {
    const data = contentItemSchema.parse(req.body);

    // Verify module ownership
    const module = get(
      `SELECT m.id FROM modules m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = ? AND c.instructor_id = ?`,
      [data.moduleId, req.user!.id]
    );

    if (!module) {
      res.status(404).json({ error: 'Module not found' });
      return;
    }

    // Get next order index
    const maxOrder = get<{ max: number }>(
      'SELECT COALESCE(MAX(order_index), 0) as max FROM content_items WHERE module_id = ?',
      [data.moduleId]
    );

    const itemId = uuidv4();
    run(
      `INSERT INTO content_items (id, module_id, title, content_type, content, ai_generated, order_index, duration_minutes, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        data.moduleId,
        data.title,
        data.contentType,
        data.content || null,
        data.aiGenerated ? 1 : 0,
        data.orderIndex ?? (maxOrder?.max || 0) + 1,
        data.durationMinutes || null,
        data.isPublished ? 1 : 0,
      ]
    );

    const item = get('SELECT * FROM content_items WHERE id = ?', [itemId]);
    res.status(201).json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create content item error:', error);
    res.status(500).json({ error: 'Failed to create content item' });
  }
});

// Update content item
router.put('/content/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = contentItemSchema.partial().parse(req.body);

    const existing = get(
      `SELECT ci.id FROM content_items ci
       JOIN modules m ON ci.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE ci.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      res.status(404).json({ error: 'Content item not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.contentType !== undefined) {
      updates.push('content_type = ?');
      values.push(data.contentType);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.aiGenerated !== undefined) {
      updates.push('ai_generated = ?');
      values.push(data.aiGenerated ? 1 : 0);
    }
    if (data.orderIndex !== undefined) {
      updates.push('order_index = ?');
      values.push(data.orderIndex);
    }
    if (data.durationMinutes !== undefined) {
      updates.push('duration_minutes = ?');
      values.push(data.durationMinutes);
    }
    if (data.isPublished !== undefined) {
      updates.push('is_published = ?');
      values.push(data.isPublished ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      run(`UPDATE content_items SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const item = get('SELECT * FROM content_items WHERE id = ?', [req.params.id]);
    res.json({ item });
  } catch (error) {
    console.error('Update content item error:', error);
    res.status(500).json({ error: 'Failed to update content item' });
  }
});

// Delete content item
router.delete('/content/:id', (req: AuthRequest, res: Response) => {
  try {
    const existing = get(
      `SELECT ci.id FROM content_items ci
       JOIN modules m ON ci.module_id = m.id
       JOIN courses c ON m.course_id = c.id
       WHERE ci.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      res.status(404).json({ error: 'Content item not found' });
      return;
    }

    run('DELETE FROM content_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Content item deleted successfully' });
  } catch (error) {
    console.error('Delete content item error:', error);
    res.status(500).json({ error: 'Failed to delete content item' });
  }
});

export default router;
