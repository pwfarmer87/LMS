import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    department?: string;
  }) => {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },
  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
  updateProfile: async (profileData: { firstName: string; lastName: string; department?: string }) => {
    const { data } = await api.put('/auth/profile', profileData);
    return data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const { data } = await api.get('/dashboard/stats');
    return data;
  },
  getActivity: async () => {
    const { data } = await api.get('/dashboard/activity');
    return data;
  },
  getCoursesOverview: async () => {
    const { data } = await api.get('/dashboard/courses-overview');
    return data;
  },
};

// Courses API
export const coursesAPI = {
  getAll: async () => {
    const { data } = await api.get('/courses');
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/courses/${id}`);
    return data;
  },
  create: async (courseData: any) => {
    const { data } = await api.post('/courses', courseData);
    return data;
  },
  update: async (id: string, courseData: any) => {
    const { data } = await api.put(`/courses/${id}`, courseData);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/courses/${id}`);
    return data;
  },
  getStudents: async (id: string) => {
    const { data } = await api.get(`/courses/${id}/students`);
    return data;
  },
  enrollStudent: async (id: string, studentData: any) => {
    const { data } = await api.post(`/courses/${id}/students`, studentData);
    return data;
  },
};

// Modules API
export const modulesAPI = {
  getByCourse: async (courseId: string) => {
    const { data } = await api.get(`/modules/course/${courseId}`);
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/modules/${id}`);
    return data;
  },
  create: async (moduleData: any) => {
    const { data } = await api.post('/modules', moduleData);
    return data;
  },
  update: async (id: string, moduleData: any) => {
    const { data } = await api.put(`/modules/${id}`, moduleData);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/modules/${id}`);
    return data;
  },
  // Content items
  getContent: async (id: string) => {
    const { data } = await api.get(`/modules/content/${id}`);
    return data;
  },
  createContent: async (contentData: any) => {
    const { data } = await api.post('/modules/content', contentData);
    return data;
  },
  updateContent: async (id: string, contentData: any) => {
    const { data } = await api.put(`/modules/content/${id}`, contentData);
    return data;
  },
  deleteContent: async (id: string) => {
    const { data } = await api.delete(`/modules/content/${id}`);
    return data;
  },
};

// Assignments API
export const assignmentsAPI = {
  getAll: async () => {
    const { data } = await api.get('/assignments');
    return data;
  },
  getByCourse: async (courseId: string) => {
    const { data } = await api.get(`/assignments/course/${courseId}`);
    return data;
  },
  getOne: async (id: string) => {
    const { data } = await api.get(`/assignments/${id}`);
    return data;
  },
  create: async (assignmentData: any) => {
    const { data } = await api.post('/assignments', assignmentData);
    return data;
  },
  update: async (id: string, assignmentData: any) => {
    const { data } = await api.put(`/assignments/${id}`, assignmentData);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await api.delete(`/assignments/${id}`);
    return data;
  },
  // Submissions
  getSubmission: async (id: string) => {
    const { data } = await api.get(`/assignments/submissions/${id}`);
    return data;
  },
  gradeSubmission: async (id: string, gradeData: { grade: number; feedback: string }) => {
    const { data } = await api.put(`/assignments/submissions/${id}/grade`, gradeData);
    return data;
  },
  aiGradeSubmission: async (id: string) => {
    const { data } = await api.post(`/assignments/submissions/${id}/ai-grade`);
    return data;
  },
  aiGradeAll: async (assignmentId: string) => {
    const { data } = await api.post(`/assignments/${assignmentId}/ai-grade-all`);
    return data;
  },
};

// AI API
export const aiAPI = {
  // Course Builder
  generateOutline: async (params: {
    topic: string;
    level: string;
    duration: string;
    additionalContext?: string;
  }) => {
    const { data } = await api.post('/ai/course-builder/outline', params);
    return data;
  },
  generateContent: async (params: {
    courseTitle: string;
    moduleTitle: string;
    moduleDescription?: string;
    contentType: string;
    topic: string;
  }) => {
    const { data } = await api.post('/ai/course-builder/content', params);
    return data;
  },
  generateSyllabus: async (courseId: string) => {
    const { data } = await api.post('/ai/course-builder/syllabus', { courseId });
    return data;
  },
  suggestImprovements: async (content: string, contentType: string) => {
    const { data } = await api.post('/ai/course-builder/improve', { content, contentType });
    return data;
  },
  createFromOutline: async (outline: any) => {
    const { data } = await api.post('/ai/course-builder/create-from-outline', { outline });
    return data;
  },

  // Teaching Assistant
  chat: async (message: string, conversationId?: string) => {
    const { data } = await api.post('/ai/assistant/chat', { message, conversationId });
    return data;
  },
  studentQA: async (courseId: string, question: string, conversationHistory?: any[]) => {
    const { data } = await api.post('/ai/assistant/student-qa', {
      courseId,
      question,
      conversationHistory,
    });
    return data;
  },
  generateQuiz: async (params: {
    topic: string;
    difficulty?: string;
    count?: number;
    questionTypes?: string[];
  }) => {
    const { data } = await api.post('/ai/assistant/generate-quiz', params);
    return data;
  },
  getStudentSummary: async (studentId: string, courseId: string) => {
    const { data } = await api.post('/ai/assistant/student-summary', { studentId, courseId });
    return data;
  },

  // Conversations
  getConversations: async () => {
    const { data } = await api.get('/ai/conversations');
    return data;
  },
  getConversation: async (id: string) => {
    const { data } = await api.get(`/ai/conversations/${id}`);
    return data;
  },
  deleteConversation: async (id: string) => {
    const { data } = await api.delete(`/ai/conversations/${id}`);
    return data;
  },
};
