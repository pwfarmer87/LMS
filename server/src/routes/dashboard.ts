import { Router, Response } from 'express';
import { all, get } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Get dashboard statistics
router.get('/stats', (req: AuthRequest, res: Response) => {
  try {
    // Total courses
    const courseStats = get<{ total: number; active: number; draft: number }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
       FROM courses WHERE instructor_id = ?`,
      [req.user!.id]
    );

    // Total students (unique across all courses)
    const studentStats = get<{ total: number }>(
      `SELECT COUNT(DISTINCT e.student_id) as total
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = ? AND e.status = 'active'`,
      [req.user!.id]
    );

    // Assignment stats
    const assignmentStats = get<{ total: number; pending_submissions: number }>(
      `SELECT
        COUNT(DISTINCT a.id) as total,
        (SELECT COUNT(*) FROM submissions s
         JOIN assignments a2 ON s.assignment_id = a2.id
         JOIN courses c2 ON a2.course_id = c2.id
         WHERE c2.instructor_id = ? AND s.grade IS NULL) as pending_submissions
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = ?`,
      [req.user!.id, req.user!.id]
    );

    // Upcoming due dates
    const upcomingAssignments = all(
      `SELECT a.id, a.title, a.due_date, c.title as course_title, c.code as course_code
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = ? AND a.due_date >= date('now') AND a.due_date <= date('now', '+7 days')
       ORDER BY a.due_date
       LIMIT 5`,
      [req.user!.id]
    );

    // Recent submissions needing grading
    const pendingGrading = all(
      `SELECT s.id, s.submitted_at, st.first_name, st.last_name,
        a.title as assignment_title, c.title as course_title
       FROM submissions s
       JOIN students st ON s.student_id = st.id
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = ? AND s.grade IS NULL
       ORDER BY s.submitted_at DESC
       LIMIT 10`,
      [req.user!.id]
    );

    res.json({
      courses: {
        total: courseStats?.total || 0,
        active: courseStats?.active || 0,
        draft: courseStats?.draft || 0,
      },
      students: {
        total: studentStats?.total || 0,
      },
      assignments: {
        total: assignmentStats?.total || 0,
        pendingGrading: assignmentStats?.pending_submissions || 0,
      },
      upcomingAssignments,
      pendingGrading,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get recent activity
router.get('/activity', (req: AuthRequest, res: Response) => {
  try {
    const recentSubmissions = all(
      `SELECT 'submission' as type, s.submitted_at as timestamp,
        st.first_name || ' ' || st.last_name as student_name,
        a.title as assignment_title, c.title as course_title
       FROM submissions s
       JOIN students st ON s.student_id = st.id
       JOIN assignments a ON s.assignment_id = a.id
       JOIN courses c ON a.course_id = c.id
       WHERE c.instructor_id = ?
       ORDER BY s.submitted_at DESC
       LIMIT 10`,
      [req.user!.id]
    );

    const recentEnrollments = all(
      `SELECT 'enrollment' as type, e.enrolled_at as timestamp,
        st.first_name || ' ' || st.last_name as student_name,
        c.title as course_title
       FROM enrollments e
       JOIN students st ON e.student_id = st.id
       JOIN courses c ON e.course_id = c.id
       WHERE c.instructor_id = ?
       ORDER BY e.enrolled_at DESC
       LIMIT 10`,
      [req.user!.id]
    );

    // Combine and sort
    const activity = [...recentSubmissions, ...recentEnrollments]
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    res.json({ activity });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get course overview for all courses
router.get('/courses-overview', (req: AuthRequest, res: Response) => {
  try {
    const courses = all(
      `SELECT c.*,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as student_count,
        (SELECT COUNT(*) FROM modules WHERE course_id = c.id) as module_count,
        (SELECT COUNT(*) FROM assignments WHERE course_id = c.id) as assignment_count,
        (SELECT COUNT(*) FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = c.id AND s.grade IS NULL) as ungraded_count
       FROM courses c
       WHERE c.instructor_id = ?
       ORDER BY c.status DESC, c.updated_at DESC`,
      [req.user!.id]
    );

    res.json({ courses });
  } catch (error) {
    console.error('Courses overview error:', error);
    res.status(500).json({ error: 'Failed to fetch courses overview' });
  }
});

export default router;
