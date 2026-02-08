import { useState } from 'react';
import { GenerateModal } from './GenerateModal';
import { PreviewTree } from './PreviewTree';
import { PublishButton } from './PublishButton';
import type { Problem } from '@/types/tree';

/**
 * Example component showing how to use the generator components together.
 * This is a reference implementation - adapt it to your specific needs.
 */
export function GeneratorExample() {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedProblem, setGeneratedProblem] = useState<Problem | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);

  const handleGenerated = (problem: Problem) => {
    setGeneratedProblem(problem);
    setShowGenerateModal(false);
  };

  const handleAccept = () => {
    setIsAccepted(true);
  };


  const handleDiscard = () => {
    if (window.confirm('Are you sure you want to start over?')) {
      setGeneratedProblem(null);
      setIsAccepted(false);
    }
  };

  const handlePublished = () => {
    // After successful publish, you might want to:
    // - Navigate to the drafts page
    // - Show a success message
    // - Reset the form
    console.log('Problem published successfully!');

    // Optional: Start over
    setTimeout(() => {
      setGeneratedProblem(null);
      setIsAccepted(false);
    }, 2000);
  };

  const handleStartOver = () => {
    setGeneratedProblem(null);
    setIsAccepted(false);
    setShowGenerateModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ML Problem Tree Generator
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate interview decision trees using AI
          </p>
        </div>

        {/* Initial State - Show Generate Button */}
        {!generatedProblem && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No problem generated yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Click the button below to generate a new ML system design problem
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Generate New Problem
            </button>
          </div>
        )}

        {/* Preview State - Show Tree Preview */}
        {generatedProblem && !isAccepted && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Preview Your Generated Tree
              </h2>
              <button
                onClick={handleStartOver}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Start Over
              </button>
            </div>
            <PreviewTree
              problem={generatedProblem}
              onAccept={handleAccept}
              onDiscard={handleDiscard}
            />
          </div>
        )}

        {/* Accepted State - Show Publish Options */}
        {generatedProblem && isAccepted && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {generatedProblem.title}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tree accepted and ready to publish
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
                <p className="text-gray-700 dark:text-gray-300">
                  {generatedProblem.description}
                </p>
              </div>

              <PublishButton
                problem={generatedProblem}
                onPublished={handlePublished}
              />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsAccepted(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Back to Preview
              </button>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Generate Another
              </button>
            </div>
          </div>
        )}

        {/* Generate Modal */}
        <GenerateModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerated={handleGenerated}
        />
      </div>
    </div>
  );
}
