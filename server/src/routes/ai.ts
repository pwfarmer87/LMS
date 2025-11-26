import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  generateCourseOutline,
  generateModuleContent,
  generateSyllabus,
  suggestImprovements,
} from '../ai/course-builder';
import {
  answerStudentQuestion,
  generalAssistantChat,
  generateQuizQuestions,
  summarizeStudentProgress,
  ChatMessage,
} from '../ai/teaching-assistant';

const router = Router();

router.use(authMiddleware);

// --- Course Builder AI ---

// Generate course outline
router.post('/course-builder/outline', async (req: AuthRequest, res: Response) => {
  try {
    const { topic, level, duration, additionalContext } = req.body;

    if (!topic || !level || !duration) {
      res.status(400).json({ error: 'Topic, level, and duration are required' });
      return;
    }

    const outline = await generateCourseOutline(topic, level, duration, additionalContext);
    res.json({ outline });
  } catch (error) {
    console.error('Generate outline error:', error);
    res.status(500).json({ error: 'Failed to generate course outline' });
  }
});

// Generate module content
router.post('/course-builder/content', async (req: AuthRequest, res: Response) => {
  try {
    const { courseTitle, moduleTitle, moduleDescription, contentType, topic } = req.body;

    if (!courseTitle || !moduleTitle || !contentType || !topic) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const content = await generateModuleContent(
      courseTitle,
      moduleTitle,
      moduleDescription || '',
      contentType,
      topic
    );

    res.json({ content });
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Generate syllabus
router.post('/course-builder/syllabus', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    // Get course details
    const course = get<{
      id: string;
      title: string;
      code: string;
      description: string;
      semester: string;
      year: number;
    }>(
      'SELECT id, title, code, description, semester, year FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, req.user!.id]
    );

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get modules
    const modules = all<{ title: string; description: string }>(
      'SELECT title, description FROM modules WHERE course_id = ? ORDER BY order_index',
      [courseId]
    );

    const syllabus = await generateSyllabus({
      ...course,
      instructorName: `${req.user!.firstName} ${req.user!.lastName}`,
      modules,
    });

    res.json({ syllabus });
  } catch (error) {
    console.error('Generate syllabus error:', error);
    res.status(500).json({ error: 'Failed to generate syllabus' });
  }
});

// Suggest improvements for content
router.post('/course-builder/improve', async (req: AuthRequest, res: Response) => {
  try {
    const { content, contentType } = req.body;

    if (!content || !contentType) {
      res.status(400).json({ error: 'Content and content type are required' });
      return;
    }

    const suggestions = await suggestImprovements(content, contentType);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggest improvements error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Create course from AI outline
router.post('/course-builder/create-from-outline', async (req: AuthRequest, res: Response) => {
  try {
    const { outline } = req.body;

    if (!outline || !outline.title) {
      res.status(400).json({ error: 'Valid outline is required' });
      return;
    }

    // Create course
    const courseId = uuidv4();
    run(
      `INSERT INTO courses (id, instructor_id, title, code, description, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
      [courseId, req.user!.id, outline.title, outline.code, outline.description]
    );

    // Create modules
    for (let i = 0; i < outline.modules.length; i++) {
      const moduleOutline = outline.modules[i];
      const moduleId = uuidv4();

      run(
        `INSERT INTO modules (id, course_id, title, description, order_index)
         VALUES (?, ?, ?, ?, ?)`,
        [moduleId, courseId, moduleOutline.title, moduleOutline.description, i + 1]
      );

      // Create content items
      if (moduleOutline.contentItems) {
        for (let j = 0; j < moduleOutline.contentItems.length; j++) {
          const item = moduleOutline.contentItems[j];
          run(
            `INSERT INTO content_items (id, module_id, title, content_type, ai_generated, order_index, duration_minutes)
             VALUES (?, ?, ?, ?, 1, ?, ?)`,
            [uuidv4(), moduleId, item.title, item.type, j + 1, item.estimatedMinutes || null]
          );
        }
      }
    }

    const course = get('SELECT * FROM courses WHERE id = ?', [courseId]);
    res.status(201).json({ course, message: 'Course created from outline' });
  } catch (error) {
    console.error('Create from outline error:', error);
    res.status(500).json({ error: 'Failed to create course from outline' });
  }
});

// --- Teaching Assistant AI ---

// General chat with AI assistant
router.post('/assistant/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    let conversation: any;
    let messages: ChatMessage[] = [];

    if (conversationId) {
      // Get existing conversation
      conversation = get(
        'SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?',
        [conversationId, req.user!.id]
      );

      if (conversation) {
        const dbMessages = all<{ role: string; content: string }>(
          'SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY created_at',
          [conversationId]
        );
        messages = dbMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      }
    }

    // Create new conversation if needed
    if (!conversation) {
      const newConvId = uuidv4();
      run(
        `INSERT INTO ai_conversations (id, user_id, title, conversation_type)
         VALUES (?, ?, ?, 'general')`,
        [newConvId, req.user!.id, message.substring(0, 50)]
      );
      conversation = { id: newConvId };
    }

    // Get user's courses for context
    const courses = all<{ title: string }>(
      'SELECT title FROM courses WHERE instructor_id = ?',
      [req.user!.id]
    );

    // Generate response
    messages.push({ role: 'user', content: message });
    const response = await generalAssistantChat(messages, {
      courses: courses.map(c => c.title),
    });

    // Save messages
    run(
      'INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      [uuidv4(), conversation.id, 'user', message]
    );
    run(
      'INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      [uuidv4(), conversation.id, 'assistant', response]
    );

    // Update conversation timestamp
    run('UPDATE ai_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [conversation.id]);

    res.json({ response, conversationId: conversation.id });
  } catch (error) {
    console.error('Assistant chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Student Q&A simulation (for course preview)
router.post('/assistant/student-qa', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, question, conversationHistory } = req.body;

    if (!courseId || !question) {
      res.status(400).json({ error: 'Course ID and question are required' });
      return;
    }

    const course = get<{ title: string; description: string }>(
      'SELECT title, description FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, req.user!.id]
    );

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const response = await answerStudentQuestion(
      { title: course.title, description: course.description },
      question,
      conversationHistory || []
    );

    res.json({ response });
  } catch (error) {
    console.error('Student QA error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Generate quiz questions
router.post('/assistant/generate-quiz', async (req: AuthRequest, res: Response) => {
  try {
    const { topic, difficulty, count, questionTypes } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    const questions = await generateQuizQuestions(
      topic,
      difficulty || 'medium',
      count || 5,
      questionTypes
    );

    res.json({ questions });
  } catch (error) {
    console.error('Generate quiz error:', error);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

// Get student progress summary
router.post('/assistant/student-summary', async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      res.status(400).json({ error: 'Student ID and course ID are required' });
      return;
    }

    // Verify course ownership
    const course = get('SELECT id FROM courses WHERE id = ? AND instructor_id = ?', [
      courseId,
      req.user!.id,
    ]);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Get student assignments
    const assignments = all<{
      title: string;
      grade: number;
      max_points: number;
      feedback: string;
    }>(
      `SELECT a.title, s.grade, a.max_points, s.feedback
       FROM submissions s
       JOIN assignments a ON s.assignment_id = a.id
       WHERE s.student_id = ? AND a.course_id = ? AND s.grade IS NOT NULL`,
      [studentId, courseId]
    );

    const summary = await summarizeStudentProgress({
      assignments: assignments.map(a => ({
        title: a.title,
        grade: a.grade,
        maxPoints: a.max_points,
        feedback: a.feedback,
      })),
    });

    res.json({ summary });
  } catch (error) {
    console.error('Student summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get AI conversations
router.get('/conversations', (req: AuthRequest, res: Response) => {
  try {
    const conversations = all(
      `SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`,
      [req.user!.id]
    );

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation messages
router.get('/conversations/:id', (req: AuthRequest, res: Response) => {
  try {
    const conversation = get(
      'SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.id]
    );

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    const messages = all(
      'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at',
      [req.params.id]
    );

    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Delete conversation
router.delete('/conversations/:id', (req: AuthRequest, res: Response) => {
  try {
    const existing = get(
      'SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?',
      [req.params.id, req.user!.id]
    );

    if (!existing) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    run('DELETE FROM ai_conversations WHERE id = ?', [req.params.id]);
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
