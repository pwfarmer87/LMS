import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run, transaction } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation schemas
const courseSchema = z.object({
  title: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  syllabus: z.string().optional(),
  semester: z.string().optional(),
  year: z.number().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  maxStudents: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Get all courses for the current instructor
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const courses = all(
      `SELECT c.*,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count,
        (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as module_count,
        (SELECT COUNT(*) FROM assignments WHERE course_id = c.id) as assignment_count
       FROM courses c
       WHERE c.instructor_id = ?
       ORDER BY c.updated_at DESC`,
      [req.user!.id]
    );

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get single course with details
router.get('/:id', (req: AuthRequest, res: Response) => {
  try {
    const course = get(
      `SELECT c.*,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count
       FROM courses c
       WHERE c.id = ? AND c.instructor_id = ?`,
      [req.params.id, req.user!.id]
    );

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get modules
    const modules = all(
      `SELECT m.*,
        (SELECT COUNT(*) FROM content_items WHERE module_id = m.id) as content_count
       FROM modules m
       WHERE m.course_id = ?
       ORDER BY m.order_index`,
      [req.params.id]
    );

    // Get assignments
    const assignments = all(
      `SELECT a.*,
        (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count
       FROM assignments a
       WHERE a.course_id = ?
       ORDER BY a.due_date`,
      [req.params.id]
    );

    res.json({ course, modules, assignments });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create new course
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = courseSchema.parse(req.body);
    const courseId = uuidv4();

    run(
      `INSERT INTO courses (id, instructor_id, title, code, description, syllabus, semester, year, status, max_students, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        req.user!.id,
        data.title,
        data.code,
        data.description || null,
        data.syllabus || null,
        data.semester || null,
        data.year || null,
        data.status || 'draft',
        data.maxStudents || 30,
        data.startDate || null,
        data.endDate || null,
      ]
    );

    const course = get('SELECT * FROM courses WHERE id = ?', [courseId]);
    res.status(201).json({ course });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Update course
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = courseSchema.partial().parse(req.body);

    // Verify ownership
    const existing = get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [
      req.params.id,
      req.user!.id,
    ]);

    if (!existing) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.code !== undefined) {
      updates.push('code = ?');
      values.push(data.code);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.syllabus !== undefined) {
      updates.push('syllabus = ?');
      values.push(data.syllabus);
    }
    if (data.semester !== undefined) {
      updates.push('semester = ?');
      values.push(data.semester);
    }
    if (data.year !== undefined) {
      updates.push('year = ?');
      values.push(data.year);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.maxStudents !== undefined) {
      updates.push('max_students = ?');
      values.push(data.maxStudents);
    }
    if (data.startDate !== undefined) {
      updates.push('start_date = ?');
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      updates.push('end_date = ?');
      values.push(data.endDate);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.params.id);
      run(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    const course = get('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    res.json({ course });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// Delete course
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const existing = get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [
      req.params.id,
      req.user!.id,
    ]);

    if (!existing) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    run('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// Get course students/enrollments
router.get('/:id/students', (req: AuthRequest, res: Response) => {
  try {
    const students = all(
      `SELECT s.*, e.status as enrollment_status, e.enrolled_at, e.final_grade
       FROM students s
       JOIN enrollments e ON s.id = e.student_id
       WHERE e.course_id = ?
       ORDER BY s.last_name, s.first_name`,
      [req.params.id]
    );

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Enroll student
router.post('/:id/students', (req: AuthRequest, res: Response) => {
  try {
    const { studentId, email, firstName, lastName, studentIdNumber } = req.body;

    let actualStudentId = studentId;

    // If no studentId provided, create new student
    if (!studentId && email) {
      // Check if student exists
      const existing = get<{ id: string }>('SELECT id FROM students WHERE email = ?', [email]);

      if (existing) {
        actualStudentId = existing.id;
      } else {
        actualStudentId = uuidv4();
        run(
          'INSERT INTO students (id, email, first_name, last_name, student_id) VALUES (?, ?, ?, ?, ?)',
          [actualStudentId, email, firstName, lastName, studentIdNumber]
        );
      }
    }

    // Check if already enrolled
    const existingEnrollment = get(
      'SELECT id FROM enrollments WHERE course_id = ? AND student_id = ?',
      [req.params.id, actualStudentId]
    );

    if (existingEnrollment) {
      res.status(400).json({ error: 'Student already enrolled' });
      return;
    }

    // Create enrollment
    const enrollmentId = uuidv4();
    run('INSERT INTO enrollments (id, course_id, student_id) VALUES (?, ?, ?)', [
      enrollmentId,
      req.params.id,
      actualStudentId,
    ]);

    res.status(201).json({ message: 'Student enrolled successfully', enrollmentId });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

export default router;
