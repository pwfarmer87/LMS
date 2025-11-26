import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ClockIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { aiAPI } from '../services/api';
import { CourseOutline, ModuleOutline } from '../types';
import ReactMarkdown from 'react-markdown';

export default function AICourseBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [outline, setOutline] = useState<CourseOutline | null>(null);

  const [formData, setFormData] = useState({
    topic: '',
    level: 'beginner' as const,
    duration: '16 weeks',
    additionalContext: '',
  });

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { outline } = await aiAPI.generateOutline(formData);
      setOutline(outline);
      setStep(2);
    } catch (error) {
      console.error('Failed to generate outline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!outline) return;
    setIsLoading(true);
    try {
      const { course } = await aiAPI.createFromOutline(outline);
      navigate(`/courses/${course.id}`);
    } catch (error) {
      console.error('Failed to create course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mb-4">
          <SparklesIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Course Builder</h1>
        <p className="text-gray-600 mt-2">
          Create comprehensive courses in minutes with AI assistance
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'
            }`}
          >
            1
          </div>
          <span className="ml-2 font-medium">Define Course</span>
        </div>
        <ArrowRightIcon className="h-5 w-5 text-gray-300" />
        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'
            }`}
          >
            2
          </div>
          <span className="ml-2 font-medium">Review Outline</span>
        </div>
        <ArrowRightIcon className="h-5 w-5 text-gray-300" />
        <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'
            }`}
          >
            3
          </div>
          <span className="ml-2 font-medium">Create Course</span>
        </div>
      </div>

      {/* Step 1: Define Course */}
      {step === 1 && (
        <div className="bg-white rounded-xl p-8 shadow-sm border">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">What do you want to teach?</h2>
          <form onSubmit={handleGenerateOutline} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Topic</label>
              <input
                type="text"
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Introduction to Machine Learning, Web Development with React"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Duration</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="4 weeks">4 weeks (Mini Course)</option>
                  <option value="8 weeks">8 weeks (Short Course)</option>
                  <option value="12 weeks">12 weeks (Quarter)</option>
                  <option value="16 weeks">16 weeks (Semester)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Context (Optional)
              </label>
              <textarea
                value={formData.additionalContext}
                onChange={(e) => setFormData({ ...formData, additionalContext: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any specific topics to cover, prerequisites, target audience, or special requirements..."
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Course Outline...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Generate Course Outline
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Review Outline */}
      {step === 2 && outline && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{outline.title}</h2>
                <p className="text-gray-500">{outline.code}</p>
              </div>
              <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {outline.estimatedDuration}
              </span>
            </div>
            <p className="text-gray-600">{outline.description}</p>

            {outline.learningObjectives && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">Learning Objectives</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  {outline.learningObjectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            {outline.prerequisites && outline.prerequisites.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">Prerequisites</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  {outline.prerequisites.map((prereq, i) => (
                    <li key={i}>{prereq}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-900">
                Course Modules ({outline.modules.length})
              </h3>
            </div>
            <div className="divide-y">
              {outline.modules.map((module: ModuleOutline, index: number) => (
                <div key={index} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        Module {index + 1}: {module.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    </div>
                    <span className="flex items-center text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {module.estimatedHours}h
                    </span>
                  </div>

                  {module.topics && module.topics.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Topics:</p>
                      <div className="flex flex-wrap gap-2">
                        {module.topics.map((topic, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {module.contentItems && module.contentItems.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {module.contentItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center text-sm text-gray-600 bg-gray-50 p-2 rounded"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="flex-1 truncate">{item.title}</span>
                          <span className="text-xs text-gray-400 capitalize">{item.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Edit
            </button>
            <button
              onClick={handleCreateCourse}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Course...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Create Course
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
