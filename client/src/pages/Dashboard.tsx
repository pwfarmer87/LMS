import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  SparklesIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { dashboardAPI } from '../services/api';
import { DashboardStats } from '../types';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="mt-1 text-primary-100">
          Here's an overview of your teaching activities
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 rounded-lg">
              <AcademicCapIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Courses</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.courses.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.students.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.assignments.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Pending Grading</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.assignments.pendingGrading || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/ai-course-builder"
          className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white hover:from-purple-600 hover:to-indigo-600 transition-all group"
        >
          <div className="flex items-center">
            <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <PlusCircleIcon className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">AI Course Builder</h3>
              <p className="text-purple-100 text-sm">
                Create a new course with AI assistance
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/ai-assistant"
          className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-6 text-white hover:from-teal-600 hover:to-cyan-600 transition-all group"
        >
          <div className="flex items-center">
            <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
              <SparklesIcon className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">AI Teaching Assistant</h3>
              <p className="text-teal-100 text-sm">Get help with teaching tasks</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Assignments */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Due Dates</h2>
          </div>
          <div className="p-5">
            {stats?.upcomingAssignments && stats.upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingAssignments.map((assignment) => (
                  <Link
                    key={assignment.id}
                    to={`/assignments/${assignment.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-500">
                        {assignment.course_code} - {assignment.course_title}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming assignments</p>
            )}
          </div>
        </div>

        {/* Pending Grading */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Submissions to Grade</h2>
          </div>
          <div className="p-5">
            {stats?.pendingGrading && stats.pendingGrading.length > 0 ? (
              <div className="space-y-3">
                {stats.pendingGrading.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {submission.first_name} {submission.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{submission.assignment_title}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">All caught up!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
