import openai, { AI_MODEL } from './openai-client';
import { v4 as uuidv4 } from 'uuid';

export interface CourseOutline {
  title: string;
  code: string;
  description: string;
  learningObjectives: string[];
  modules: ModuleOutline[];
  estimatedDuration: string;
  prerequisites: string[];
}

export interface ModuleOutline {
  title: string;
  description: string;
  topics: string[];
  estimatedHours: number;
  contentItems: ContentItemOutline[];
}

export interface ContentItemOutline {
  title: string;
  type: 'lecture' | 'reading' | 'video' | 'quiz' | 'assignment' | 'discussion';
  description: string;
  estimatedMinutes: number;
}

export async function generateCourseOutline(
  topic: string,
  level: 'beginner' | 'intermediate' | 'advanced',
  duration: string,
  additionalContext?: string
): Promise<CourseOutline> {
  const prompt = `Create a comprehensive course outline for teaching "${topic}" at the ${level} level.
The course should be designed to run for approximately ${duration}.

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Generate a detailed course structure in JSON format with the following structure:
{
  "title": "Course Title",
  "code": "SUBJ101",
  "description": "Course description (2-3 sentences)",
  "learningObjectives": ["objective 1", "objective 2", ...],
  "prerequisites": ["prerequisite 1", ...],
  "estimatedDuration": "${duration}",
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description",
      "topics": ["topic 1", "topic 2"],
      "estimatedHours": 4,
      "contentItems": [
        {
          "title": "Content Item Title",
          "type": "lecture|reading|video|quiz|assignment|discussion",
          "description": "Brief description",
          "estimatedMinutes": 45
        }
      ]
    }
  ]
}

Create 4-8 modules depending on the course duration, each with appropriate content items.
Ensure the content follows a logical progression from foundational to advanced concepts.
Include a mix of content types: lectures, readings, quizzes, and assignments.`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert curriculum designer and educator. Create well-structured, pedagogically sound course outlines. Always respond with valid JSON only, no additional text.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate course outline');
  }

  return JSON.parse(content) as CourseOutline;
}

export async function generateModuleContent(
  courseTitle: string,
  moduleTitle: string,
  moduleDescription: string,
  contentType: 'lecture' | 'reading' | 'quiz' | 'assignment' | 'discussion',
  topic: string
): Promise<string> {
  const prompts: Record<string, string> = {
    lecture: `Create detailed lecture notes for "${topic}" in the module "${moduleTitle}" of the course "${courseTitle}".
Include:
- Introduction and learning objectives
- Main content with clear explanations
- Examples and illustrations
- Key takeaways
- Questions for reflection
Format in Markdown.`,
    reading: `Create a comprehensive reading material for "${topic}" in the course "${courseTitle}".
Include:
- Overview
- Detailed explanations with examples
- Key concepts highlighted
- Further reading suggestions
Format in Markdown.`,
    quiz: `Create a quiz for "${topic}" in the course "${courseTitle}".
Include 5-10 questions of varying types:
- Multiple choice
- True/False
- Short answer
Format as JSON with structure:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "..."
    }
  ]
}`,
    assignment: `Create an assignment for "${topic}" in the course "${courseTitle}".
Include:
- Clear title
- Learning objectives
- Detailed instructions
- Requirements and deliverables
- Grading rubric with criteria and point values
- Suggested resources
Format in Markdown.`,
    discussion: `Create a discussion prompt for "${topic}" in the course "${courseTitle}".
Include:
- Engaging discussion question
- Context and background
- Guidelines for participation
- Suggested discussion points
Format in Markdown.`,
  };

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert educator creating high-quality educational content. Create engaging, informative, and pedagogically sound materials.',
      },
      { role: 'user', content: prompts[contentType] || prompts.lecture },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateSyllabus(course: {
  title: string;
  code: string;
  description: string;
  semester: string;
  year: number;
  instructorName: string;
  modules: Array<{ title: string; description: string }>;
}): Promise<string> {
  const prompt = `Create a professional course syllabus for:
Course: ${course.title} (${course.code})
Semester: ${course.semester} ${course.year}
Instructor: ${course.instructorName}
Description: ${course.description}

Modules:
${course.modules.map((m, i) => `${i + 1}. ${m.title}: ${m.description}`).join('\n')}

Create a comprehensive syllabus including:
- Course information
- Instructor contact (use placeholder)
- Course description and objectives
- Required materials
- Course schedule/outline
- Grading policy
- Academic integrity policy
- Accessibility statement
- Course policies

Format in professional Markdown.`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an experienced academic creating professional course syllabi. Create clear, comprehensive, and well-organized syllabi.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

export async function suggestImprovements(
  content: string,
  contentType: string
): Promise<{
  suggestions: string[];
  enhancedContent?: string;
}> {
  const prompt = `Analyze the following ${contentType} content and suggest improvements:

${content}

Provide:
1. A list of specific, actionable suggestions for improvement
2. An enhanced version of the content incorporating the suggestions

Respond in JSON format:
{
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "enhancedContent": "improved content here"
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert educational content reviewer. Provide constructive feedback to improve educational materials.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const result = response.choices[0]?.message?.content;
  if (!result) {
    return { suggestions: [] };
  }

  return JSON.parse(result);
}
