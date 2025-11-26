import openai, { AI_MODEL } from './openai-client';

export interface GradingResult {
  suggestedGrade: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
  rubricBreakdown?: Record<string, { score: number; maxScore: number; comment: string }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function gradeSubmission(
  assignment: {
    title: string;
    instructions: string;
    rubric?: string;
    maxPoints: number;
  },
  submission: {
    content: string;
    studentName?: string;
  }
): Promise<GradingResult> {
  const prompt = `Grade the following student submission for the assignment "${assignment.title}".

Assignment Instructions:
${assignment.instructions}

${assignment.rubric ? `Grading Rubric:\n${assignment.rubric}` : ''}

Maximum Points: ${assignment.maxPoints}

Student Submission:
${submission.content}

Provide a detailed assessment in JSON format:
{
  "suggestedGrade": <number between 0 and ${assignment.maxPoints}>,
  "feedback": "Detailed feedback for the student",
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "rubricBreakdown": {
    "criterion1": { "score": X, "maxScore": Y, "comment": "..." },
    ...
  }
}

Be fair, constructive, and educational in your feedback.`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an experienced educator providing fair and constructive feedback on student work. Grade consistently and provide actionable feedback that helps students improve.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to grade submission');
  }

  return JSON.parse(content) as GradingResult;
}

export async function answerStudentQuestion(
  courseContext: {
    title: string;
    description: string;
    currentModule?: string;
    relevantContent?: string;
  },
  question: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  const systemPrompt = `You are an AI teaching assistant for the course "${courseContext.title}".
Course Description: ${courseContext.description}
${courseContext.currentModule ? `Current Module: ${courseContext.currentModule}` : ''}

Your role is to:
- Answer student questions clearly and helpfully
- Explain concepts in multiple ways if needed
- Encourage learning without giving away answers directly
- Point students to relevant resources when appropriate
- Be patient, supportive, and encouraging

${courseContext.relevantContent ? `Relevant course content:\n${courseContext.relevantContent}` : ''}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: question },
  ];

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
}

export async function generateFeedbackSuggestions(
  studentWork: string,
  assignmentContext: string
): Promise<string[]> {
  const prompt = `Based on this student work for the assignment "${assignmentContext}", suggest specific feedback points:

${studentWork}

Provide 3-5 specific, actionable feedback suggestions as a JSON array of strings.`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an experienced educator. Provide constructive, specific feedback that helps students improve.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return [];
  }

  const result = JSON.parse(content);
  return result.suggestions || result.feedback || [];
}

export async function summarizeStudentProgress(
  studentData: {
    assignments: Array<{ title: string; grade: number; maxPoints: number; feedback?: string }>;
    attendance?: number;
    participation?: number;
  }
): Promise<{
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}> {
  const prompt = `Analyze this student's progress and provide insights:

Assignments:
${studentData.assignments.map(a => `- ${a.title}: ${a.grade}/${a.maxPoints} ${a.feedback ? `(${a.feedback})` : ''}`).join('\n')}

${studentData.attendance !== undefined ? `Attendance: ${studentData.attendance}%` : ''}
${studentData.participation !== undefined ? `Participation: ${studentData.participation}%` : ''}

Provide a JSON response:
{
  "summary": "Brief overall assessment",
  "strengths": ["strength 1", ...],
  "concerns": ["concern 1", ...],
  "recommendations": ["recommendation 1", ...]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an educational analyst providing insights on student progress. Be constructive and focus on actionable insights.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { summary: '', strengths: [], concerns: [], recommendations: [] };
  }

  return JSON.parse(content);
}

export async function generalAssistantChat(
  messages: ChatMessage[],
  context?: {
    courses?: string[];
    currentTask?: string;
  }
): Promise<string> {
  const systemPrompt = `You are an AI assistant helping a faculty member manage their courses and teaching responsibilities.

${context?.courses?.length ? `Faculty's current courses: ${context.courses.join(', ')}` : ''}
${context?.currentTask ? `Current task: ${context.currentTask}` : ''}

You can help with:
- Course planning and development
- Creating educational content
- Grading strategies and feedback
- Student engagement ideas
- Time management for teaching multiple courses
- Educational technology recommendations
- Best practices in pedagogy

Be helpful, professional, and knowledgeable about higher education.`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
}

export async function generateQuizQuestions(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number,
  questionTypes: string[] = ['multiple_choice', 'true_false', 'short_answer']
): Promise<any[]> {
  const prompt = `Generate ${count} quiz questions about "${topic}" at ${difficulty} difficulty level.

Include these question types: ${questionTypes.join(', ')}

Respond in JSON format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why this is correct"
    },
    {
      "type": "true_false",
      "question": "...",
      "correctAnswer": true,
      "explanation": "..."
    },
    {
      "type": "short_answer",
      "question": "...",
      "sampleAnswer": "...",
      "keyPoints": ["point1", "point2"]
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert educator creating assessment questions. Create clear, well-crafted questions that effectively test understanding.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return [];
  }

  const result = JSON.parse(content);
  return result.questions || [];
}
