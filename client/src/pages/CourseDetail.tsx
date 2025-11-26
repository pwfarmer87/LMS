import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  BookOpenIcon,
  VideoCameraIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { coursesAPI, modulesAPI, aiAPI } from '../services/api';
import { Course, Module, ContentItem, Assignment } from '../types';
import ReactMarkdown from 'react-markdown';

const contentTypeIcons: Record<string, React.ElementType> = {
  lecture: DocumentTextIcon,
  reading: BookOpenIcon,
  video: VideoCameraIcon,
  quiz: QuestionMarkCircleIcon,
  assignment: ClipboardDocumentListIcon,
  discussion: ChatBubbleLeftRightIcon,
};

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleContents, setModuleContents] = useState<Record<string, ContentItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [newModule, setNewModule] = useState({ title: '', description: '' });
  const [newContent, setNewContent] = useState({
    title: '',
    contentType: 'lecture' as const,
    content: '',
  });

  useEffect(() => {
    if (id) loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const data = await coursesAPI.getOne(id!);
      setCourse(data.course);
      setModules(data.modules || []);
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Failed to load course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = async (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
      // Load content if not already loaded
      if (!moduleContents[moduleId]) {
        try {
          const { contentItems } = await modulesAPI.getOne(moduleId);
          setModuleContents((prev) => ({ ...prev, [moduleId]: contentItems }));
        } catch (error) {
          console.error('Failed to load module content:', error);
        }
      }
    }
    setExpandedModules(newExpanded);
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await modulesAPI.create({ ...newModule, courseId: id });
      setShowModuleModal(false);
      setNewModule({ title: '', description: '' });
      loadCourse();
    } catch (error) {
      console.error('Failed to create module:', error);
    }
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;
    try {
      await modulesAPI.createContent({ ...newContent, moduleId: selectedModule });
      setShowContentModal(false);
      setNewContent({ title: '', contentType: 'lecture', content: '' });
      // Reload module content
      const { contentItems } = await modulesAPI.getOne(selectedModule);
      setModuleContents((prev) => ({ ...prev, [selectedModule]: contentItems }));
    } catch (error) {
      console.error('Failed to create content:', error);
    }
  };

  const handleGenerateContent = async (moduleId: string, contentType: string, topic: string) => {
    if (!course) return;
    setIsGenerating(true);
    try {
      const module = modules.find((m) => m.id === moduleId);
      const { content } = await aiAPI.generateContent({
        courseTitle: course.title,
        moduleTitle: module?.title || '',
        moduleDescription: module?.description,
        contentType,
        topic,
      });
      setNewContent((prev) => ({ ...prev, content }));
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSyllabus = async () => {
    if (!course) return;
    setIsGenerating(true);
    try {
      const { syllabus } = await aiAPI.generateSyllabus(course.id);
      await coursesAPI.update(course.id, { syllabus });
      setCourse({ ...course, syllabus });
    } catch (error) {
      console.error('Failed to generate syllabus:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-12">Course not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/courses" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                course.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : course.status === 'draft'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {course.status}
            </span>
          </div>
          <p className="text-gray-500">
            {course.code} | {course.semester} {course.year}
          </p>
        </div>
        <button
          onClick={handleGenerateSyllabus}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <SparklesIcon className="h-5 w-5 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Syllabus'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Description */}
          {course.description && (
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-600">{course.description}</p>
            </div>
          )}

          {/* Modules */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Course Modules</h2>
              <button
                onClick={() => setShowModuleModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Module
              </button>
            </div>
            <div className="divide-y">
              {modules.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No modules yet. Add your first module to get started.
                </div>
              ) : (
                modules.map((module) => (
                  <div key={module.id}>
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        {expandedModules.has(module.id) ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-2" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-400 mr-2" />
                        )}
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{module.title}</p>
                          {module.description && (
                            <p className="text-sm text-gray-500">{module.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-400">
                        {module.content_count || 0} items
                      </span>
                    </button>
                    {expandedModules.has(module.id) && (
                      <div className="bg-gray-50 border-t px-4 py-3">
                        <div className="space-y-2">
                          {moduleContents[module.id]?.map((item) => {
                            const Icon = contentTypeIcons[item.content_type] || DocumentTextIcon;
                            return (
                              <div
                                key={item.id}
                                className="flex items-center p-2 bg-white rounded-lg border"
                              >
                                <Icon className="h-5 w-5 text-gray-400 mr-3" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                  <p className="text-xs text-gray-500 capitalize">
                                    {item.content_type}
                                    {item.ai_generated && ' - AI Generated'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={() => {
                              setSelectedModule(module.id);
                              setShowContentModal(true);
                            }}
                            className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Add Content
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Syllabus */}
          {course.syllabus && (
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <h2 className="font-semibold text-gray-900 mb-4">Syllabus</h2>
              <div className="prose prose-sm max-w-none markdown-content">
                <ReactMarkdown>{course.syllabus}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl p-5 shadow-sm border">
            <h2 className="font-semibold text-gray-900 mb-4">Course Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Students</span>
                <span className="font-medium">{course.student_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Modules</span>
                <span className="font-medium">{modules.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Assignments</span>
                <span className="font-medium">{assignments.length}</span>
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Assignments</h2>
              <Link
                to={`/assignments?courseId=${course.id}`}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                View All
              </Link>
            </div>
            <div className="p-5">
              {assignments.length === 0 ? (
                <p className="text-sm text-gray-500">No assignments yet</p>
              ) : (
                <div className="space-y-2">
                  {assignments.slice(0, 5).map((assignment) => (
                    <Link
                      key={assignment.id}
                      to={`/assignments/${assignment.id}`}
                      className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                      {assignment.due_date && (
                        <p className="text-xs text-gray-500">
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Module Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={() => setShowModuleModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Module</h2>
              <form onSubmit={handleCreateModule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    required
                    value={newModule.title}
                    onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newModule.description}
                    onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModuleModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Content Modal */}
      {showContentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={() => setShowContentModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Content</h2>
              <form onSubmit={handleCreateContent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    required
                    value={newContent.title}
                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={newContent.contentType}
                    onChange={(e) =>
                      setNewContent({ ...newContent, contentType: e.target.value as any })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="reading">Reading</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="discussion">Discussion</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <button
                      type="button"
                      onClick={() =>
                        handleGenerateContent(
                          selectedModule!,
                          newContent.contentType,
                          newContent.title
                        )
                      }
                      disabled={!newContent.title || isGenerating}
                      className="inline-flex items-center px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      <SparklesIcon className="h-4 w-4 mr-1" />
                      {isGenerating ? 'Generating...' : 'AI Generate'}
                    </button>
                  </div>
                  <textarea
                    value={newContent.content}
                    onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                    rows={10}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                    placeholder="Enter content or use AI Generate..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContentModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Create
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
