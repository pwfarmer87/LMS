import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { gradeSubmission } from '../ai/teaching-assistant';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

// Validation schemas
const assignmentSchema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  instructions: z.string().optional(),
  rubric: z.string().optional(),
  maxPoints: z.number().default(100),
  dueDate: z.string().optional(),
  allowLate: z.boolean().optional(),
  latePenaltyPercent: z.number().optional(),
  assignmentType: z.enum(['assignment', 'quiz', 'exam', 'project', 'discussion']).optional(),
  aiGradingEnabled: z.boolean().optional(),
});

// Get all assignments for instructor
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const assignments = all(
      `SELECT a.*, c.title as course_title, c.code as course_code,
        (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count,
        (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id AND grade IS NOT NULL) as graded_count
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = ?
       ORDER BY a.due_date DESC`,
      [req.user!.id]
    );

    res.json({ assignments });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get assignments for a course
router.get('/course/:courseId', (req: AuthRequest, res: Response) => {
  try {
    const assignments = all(
      `SELECT a.*,
        (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count,
        (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id AND grade IS NOT NULL) as graded_count
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.course_id = ? AND c.instructor_id = ?
       ORDER BY a.due_date`,
      [req.params.courseId, req.user!.id]
    );

    res.json({ assignments });
  } catch (error) {
    console.error('Get course assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get single assignment with submissions
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const assignment = get(
      `SELECT a.*, c.title as course_title FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const submissions = all(
      `SELECT s.*, st.first_name, st.last_name, st.email, st.student_id
       FROM submissions s
       JOIN students st ON s.student_id = st.id
       WHERE s.assignment_id = ?
       ORDER BY s.submitted_at DESC`,
      [req.params.id]
    );

    res.json({ assignment, submissions });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// Create assignment
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = assignmentSchema.parse(req.body);

    // Verify course ownership
    const course = get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [
      data.courseId,
      req.user!.id,
    ]);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const assignmentId = uuidv4();
    run(
      `INSERT INTO assignments (id, course_id, module_id, title, description, instructions, rubric, max_points, due_date, allow_late, late_penalty_percent, assignment_type, ai_grading_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        data.courseId,
        data.moduleId || null,
        data.title,
        data.description || null,
        data.instructions || null,
        data.rubric || null,
        data.maxPoints,
        data.dueDate || null,
        data.allowLate ? 1 : 0,
        data.latePenaltyPercent || 10,
        data.assignmentType || 'assignment',
        data.aiGradingEnabled !== false ? 1 : 0,
      ]
    );

    const assignment = get('SELECT * FROM assignments WHERE id = ?', [assignmentId]);
    res.status(201).json({ assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Update assignment
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = assignmentSchema.partial().parse(req.body);

    const existing = get(
      `SELECT a.id FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      res.status(404).json({ error: 'Assignment not found' });
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
    if (data.instructions !== undefined) {
      updates.push('instructions = ?');
      values.push(data.instructions);
    }
    if (data.rubric !== undefined) {
      updates.push('rubric = ?');
      values.push(data.rubric);
    }
    if (data.maxPoints !== undefined) {
      updates.push('max_points = ?');
      values.push(data.maxPoints);
    }
    if (data.dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(data.dueDate);
    }
    if (data.allowLate !== undefined) {
      updates.push('allow_late = ?');
      values.push(data.allowLate ? 1 : 0);
    }
    if (data.latePenaltyPercent !== undefined) {
      updates.push('late_penalty_percent = ?');
      values.push(data.latePenaltyPercent);
    }
    if (data.assignmentType !== undefined) {
      updates.push('assignment_type = ?');
      values.push(data.assignmentType);
    }
    if (data.aiGradingEnabled !== undefined) {
      updates.push('ai_grading_enabled = ?');
      values.push(data.aiGradingEnabled ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      run(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const assignment = get('SELECT * FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ assignment });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Delete assignment
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const existing = get(
      `SELECT a.id FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    run('DELETE FROM assignments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// --- Submissions ---

// Get submission
router.get('/submissions/:id', (req: AuthRequest, res: Response) => {
  try {
    const submission = get(
      `SELECT s.*, st.first_name, st.last_name, st.email, st.student_id,
        a.title as assignment_title, a.instructions, a.rubric, a.max_points
       FROM submissions s
       JOIN students st ON s.student_id = st.id
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE s.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// Grade submission manually
router.put('/submissions/:id/grade', (req: AuthRequest, res: Response) => {
  try {
    const { grade, feedback } = req.body;

    const submission = get(
      `SELECT s.id FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE s.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    run(
      `UPDATE submissions SET grade = ?, feedback = ?, graded_at = CURRENT_TIMESTAMP, graded_by = ? WHERE id = ?`,
      [grade, feedback, req.user!.id, req.params.id]
    );

    res.json({ message: 'Submission graded successfully' });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

// AI Grade submission
router.post('/submissions/:id/ai-grade', async (req: AuthRequest, res: Response) => {
  try {
    const submission = get<{
      id: string;
      content: string;
      assignment_title: string;
      instructions: string;
      rubric: string;
      max_points: number;
    }>(
      `SELECT s.id, s.content, a.title as assignment_title, a.instructions, a.rubric, a.max_points
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE s.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const result = await gradeSubmission(
      {
        title: submission.assignment_title,
        instructions: submission.instructions,
        rubric: submission.rubric,
        maxPoints: submission.max_points,
      },
      { content: submission.content }
    );

    // Save AI feedback
    run(
      `UPDATE submissions SET ai_feedback = ?, ai_suggested_grade = ? WHERE id = ?`,
      [JSON.stringify(result), result.suggestedGrade, req.params.id]
    );

    res.json({ result });
  } catch (error) {
    console.error('AI grade submission error:', error);
    res.status(500).json({ error: 'Failed to generate AI grade' });
  }
});

// Batch AI grading
router.post('/:id/ai-grade-all', async (req: AuthRequest, res: Response) => {
  try {
    const assignment = get<{
      id: string;
      title: string;
      instructions: string;
      rubric: string;
      max_points: number;
    }>(
      `SELECT a.id, a.title, a.instructions, a.rubric, a.max_points
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const submissions = all<{ id: string; content: string }>(
      `SELECT id, content FROM submissions WHERE assignment_id = ? AND ai_suggested_grade IS NULL`,
      [req.params.id]
    );

    const results = [];
    for (const submission of submissions) {
      try {
        const result = await gradeSubmission(
          {
            title: assignment.title,
            instructions: assignment.instructions,
            rubric: assignment.rubric,
            maxPoints: assignment.max_points,
          },
          { content: submission.content }
        );

        run(
          `UPDATE submissions SET ai_feedback = ?, ai_suggested_grade = ? WHERE id = ?`,
          [JSON.stringify(result), result.suggestedGrade, submission.id]
        );

        results.push({ submissionId: submission.id, success: true, result });
      } catch (error) {
        results.push({ submissionId: submission.id, success: false, error: 'Failed to grade' });
      }
    }

    res.json({ results, processed: results.length });
  } catch (error) {
    console.error('Batch AI grade error:', error);
    res.status(500).json({ error: 'Failed to process batch grading' });
  }
});

export default router;
