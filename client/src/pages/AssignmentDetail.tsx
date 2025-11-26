import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  SparklesIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { assignmentsAPI } from '../services/api';
import { Assignment, Submission } from '../types';
import ReactMarkdown from 'react-markdown';

export default function AssignmentDetail() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGrading, setIsGrading] = useState(false);
  const [gradeData, setGradeData] = useState({ grade: 0, feedback: '' });
  const [aiResult, setAiResult] = useState<any>(null);

  useEffect(() => {
    if (id) loadAssignment();
  }, [id]);

  const loadAssignment = async () => {
    try {
      const data = await assignmentsAPI.getOne(id!);
      setAssignment(data.assignment);
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Failed to load assignment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIGrade = async (submissionId: string) => {
    setIsGrading(true);
    try {
      const { result } = await assignmentsAPI.aiGradeSubmission(submissionId);
      setAiResult(result);
      setGradeData({
        grade: result.suggestedGrade,
        feedback: result.feedback,
      });
    } catch (error) {
      console.error('Failed to AI grade:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleAIGradeAll = async () => {
    if (!assignment) return;
    setIsGrading(true);
    try {
      await assignmentsAPI.aiGradeAll(assignment.id);
      loadAssignment();
    } catch (error) {
      console.error('Failed to AI grade all:', error);
    } finally {
      setIsGrading(false);
    }
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission) return;
    try {
      await assignmentsAPI.gradeSubmission(selectedSubmission.id, gradeData);
      loadAssignment();
      setSelectedSubmission(null);
      setAiResult(null);
    } catch (error) {
      console.error('Failed to submit grade:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return <div className="text-center py-12">Assignment not found</div>;
  }

  const ungradedCount = submissions.filter((s) => s.grade === null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/assignments" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-gray-500">
            {assignment.course_title} | {assignment.max_points} points
          </p>
        </div>
        {ungradedCount > 0 && assignment.ai_grading_enabled && (
          <button
            onClick={handleAIGradeAll}
            disabled={isGrading}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            {isGrading ? 'Grading...' : `AI Grade All (${ungradedCount})`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment Info */}
        <div className="lg:col-span-2 space-y-6">
          {assignment.description && (
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-600">{assignment.description}</p>
            </div>
          )}

          {assignment.instructions && (
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <h2 className="font-semibold text-gray-900 mb-2">Instructions</h2>
              <div className="prose prose-sm max-w-none markdown-content">
                <ReactMarkdown>{assignment.instructions}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Submissions */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b">
              <h2 className="font-semibold text-gray-900">Submissions ({submissions.length})</h2>
            </div>
            <div className="divide-y">
              {submissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No submissions yet</div>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedSubmission?.id === submission.id ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setGradeData({
                        grade: submission.grade || submission.ai_suggested_grade || 0,
                        feedback: submission.feedback || '',
                      });
                      if (submission.ai_feedback) {
                        try {
                          setAiResult(JSON.parse(submission.ai_feedback));
                        } catch {
                          setAiResult(null);
                        }
                      } else {
                        setAiResult(null);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {submission.first_name} {submission.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{submission.email}</p>
                      </div>
                      <div className="text-right">
                        {submission.grade !== null ? (
                          <div className="flex items-center text-green-600">
                            <CheckIcon className="h-4 w-4 mr-1" />
                            <span className="font-medium">
                              {submission.grade}/{assignment.max_points}
                            </span>
                          </div>
                        ) : submission.ai_suggested_grade !== null ? (
                          <div className="flex items-center text-purple-600">
                            <SparklesIcon className="h-4 w-4 mr-1" />
                            <span className="font-medium">
                              AI: {submission.ai_suggested_grade}/{assignment.max_points}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center text-yellow-600">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            <span>Pending</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Grading Panel */}
        <div className="space-y-6">
          {selectedSubmission ? (
            <>
              <div className="bg-white rounded-xl p-5 shadow-sm border">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Grade: {selectedSubmission.first_name} {selectedSubmission.last_name}
                </h2>

                {selectedSubmission.content && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Submission
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg text-sm max-h-40 overflow-y-auto">
                      {selectedSubmission.content}
                    </div>
                  </div>
                )}

                {assignment.ai_grading_enabled && (
                  <button
                    onClick={() => handleAIGrade(selectedSubmission.id)}
                    disabled={isGrading}
                    className="w-full mb-4 inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    {isGrading ? 'Analyzing...' : 'AI Analyze'}
                  </button>
                )}

                {aiResult && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="text-sm font-medium text-purple-800 mb-2">AI Suggestions</h4>
                    <p className="text-sm text-purple-700">
                      Suggested Grade: {aiResult.suggestedGrade}/{assignment.max_points}
                    </p>
                    {aiResult.strengths && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-purple-800">Strengths:</p>
                        <ul className="text-xs text-purple-700 list-disc pl-4">
                          {aiResult.strengths.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiResult.areasForImprovement && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-purple-800">Areas for Improvement:</p>
                        <ul className="text-xs text-purple-700 list-disc pl-4">
                          {aiResult.areasForImprovement.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade (out of {assignment.max_points})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={assignment.max_points}
                      value={gradeData.grade}
                      onChange={(e) =>
                        setGradeData({ ...gradeData, grade: parseFloat(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                    <textarea
                      value={gradeData.feedback}
                      onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Provide feedback to the student..."
                    />
                  </div>

                  <button
                    onClick={handleSubmitGrade}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Save Grade
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl p-5 shadow-sm border text-center">
              <p className="text-gray-500">Select a submission to grade</p>
            </div>
          )}

          {/* Assignment Stats */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Statistics</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Submissions</span>
                <span className="font-medium">{submissions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Graded</span>
                <span className="font-medium">
                  {submissions.filter((s) => s.grade !== null).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pending</span>
                <span className="font-medium">{ungradedCount}</span>
              </div>
              {submissions.filter((s) => s.grade !== null).length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Grade</span>
                  <span className="font-medium">
                    {(
                      submissions
                        .filter((s) => s.grade !== null)
                        .reduce((sum, s) => sum + (s.grade || 0), 0) /
                      submissions.filter((s) => s.grade !== null).length
                    ).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
