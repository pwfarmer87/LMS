export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'faculty' | 'admin';
  department?: string;
}

export interface Course {
  id: string;
  instructor_id: string;
  title: string;
  code: string;
  description?: string;
  syllabus?: string;
  semester?: string;
  year?: number;
  status: 'draft' | 'active' | 'archived';
  max_students: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  student_count?: number;
  module_count?: number;
  assignment_count?: number;
  ungraded_count?: number;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  content_count?: number;
}

export interface ContentItem {
  id: string;
  module_id: string;
  title: string;
  content_type: 'lecture' | 'reading' | 'video' | 'quiz' | 'assignment' | 'discussion';
  content?: string;
  ai_generated: boolean;
  order_index: number;
  duration_minutes?: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  module_id?: string;
  title: string;
  description?: string;
  instructions?: string;
  rubric?: string;
  max_points: number;
  due_date?: string;
  allow_late: boolean;
  late_penalty_percent: number;
  assignment_type: 'assignment' | 'quiz' | 'exam' | 'project' | 'discussion';
  ai_grading_enabled: boolean;
  created_at: string;
  updated_at: string;
  submission_count?: number;
  graded_count?: number;
  course_title?: string;
  course_code?: string;
}

export interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  student_id?: string;
  created_at: string;
  enrollment_status?: string;
  enrolled_at?: string;
  final_grade?: number;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  file_url?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  ai_feedback?: string;
  ai_suggested_grade?: number;
  graded_at?: string;
  graded_by?: string;
  is_late: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  student_id_number?: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  course_id?: string;
  title?: string;
  conversation_type: 'general' | 'course_builder' | 'grading' | 'qa' | 'content_generation';
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string;
  created_at: string;
}

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

export interface DashboardStats {
  courses: {
    total: number;
    active: number;
    draft: number;
  };
  students: {
    total: number;
  };
  assignments: {
    total: number;
    pendingGrading: number;
  };
  upcomingAssignments: Array<{
    id: string;
    title: string;
    due_date: string;
    course_title: string;
    course_code: string;
  }>;
  pendingGrading: Array<{
    id: string;
    submitted_at: string;
    first_name: string;
    last_name: string;
    assignment_title: string;
    course_title: string;
  }>;
}
