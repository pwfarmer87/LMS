import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { assignmentsAPI, coursesAPI } from '../services/api';
import { Assignment, Course } from '../types';

export default function Assignments() {
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get('courseId');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(courseIdParam || '');

  const [newAssignment, setNewAssignment] = useState({
    courseId: courseIdParam || '',
    title: '',
    description: '',
    instructions: '',
    maxPoints: 100,
    dueDate: '',
    assignmentType: 'assignment' as const,
    aiGradingEnabled: true,
  });

  useEffect(() => {
    loadData();
  }, [courseIdParam]);

  const loadData = async () => {
    try {
      const [assignmentsData, coursesData] = await Promise.all([
        courseIdParam ? assignmentsAPI.getByCourse(courseIdParam) : assignmentsAPI.getAll(),
        coursesAPI.getAll(),
      ]);
      setAssignments(assignmentsData.assignments);
      setCourses(coursesData.courses);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignmentsAPI.create(newAssignment);
      setShowCreateModal(false);
      setNewAssignment({
        courseId: '',
        title: '',
        description: '',
        instructions: '',
        maxPoints: 100,
        dueDate: '',
        assignmentType: 'assignment',
        aiGradingEnabled: true,
      });
      loadData();
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'bg-blue-100 text-blue-800';
      case 'quiz':
        return 'bg-purple-100 text-purple-800';
      case 'exam':
        return 'bg-red-100 text-red-800';
      case 'project':
        return 'bg-green-100 text-green-800';
      case 'discussion':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAssignments = selectedCourse
    ? assignments.filter((a) => a.course_id === selectedCourse)
    : assignments;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600">Manage assignments across your courses</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Assignment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Course:</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment List */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No assignments yet</h3>
          <p className="text-gray-500 mt-1">Create your first assignment to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Assignment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => (
            <Link
              key={assignment.id}
              to={`/assignments/${assignment.id}`}
              className="block bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(assignment.assignment_type)}`}>
                      {assignment.assignment_type}
                    </span>
                    {assignment.ai_grading_enabled && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        AI Grading
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {assignment.course_code} - {assignment.course_title}
                  </p>
                  {assignment.description && (
                    <p className="text-gray-600 mt-2 line-clamp-2">{assignment.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{assignment.max_points} pts</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
                {assignment.due_date && (
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  {assignment.submission_count || 0} submissions
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  {assignment.graded_count || 0} graded
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Create Assignment</h2>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Course</label>
                  <select
                    required
                    value={newAssignment.courseId}
                    onChange={(e) => setNewAssignment({ ...newAssignment, courseId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    required
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={newAssignment.assignmentType}
                    onChange={(e) => setNewAssignment({ ...newAssignment, assignmentType: e.target.value as any })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="project">Project</option>
                    <option value="discussion">Discussion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Instructions</label>
                  <textarea
                    value={newAssignment.instructions}
                    onChange={(e) => setNewAssignment({ ...newAssignment, instructions: e.target.value })}
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Points</label>
                    <input
                      type="number"
                      value={newAssignment.maxPoints}
                      onChange={(e) => setNewAssignment({ ...newAssignment, maxPoints: parseInt(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="aiGrading"
                    checked={newAssignment.aiGradingEnabled}
                    onChange={(e) => setNewAssignment({ ...newAssignment, aiGradingEnabled: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="aiGrading" className="ml-2 text-sm text-gray-700">
                    Enable AI-assisted grading
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
