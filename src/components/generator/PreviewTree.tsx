import { useState } from 'react';
import { stringify } from 'yaml';
import type { Problem, TreeNode } from '@/types/tree';
import { parseYaml } from '@/utils/yamlLoader';
import { validateTree } from '@/utils/validateTree';

interface PreviewTreeProps {
  problem: Problem;
  onAccept: () => void;
  onDiscard: () => void;
}

export function PreviewTree({ problem, onAccept, onDiscard }: PreviewTreeProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [yamlText, setYamlText] = useState(() => stringify(problem));
  const [editError, setEditError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Calculate tree statistics
  const nodeCount = problem.nodes.length;
  const questionNodes = problem.nodes.filter(n => n.type === 'question');
  const branchCount = questionNodes.length;

  // Get stage summary
  const stageGroups = problem.nodes.reduce((acc, node) => {
    if (!acc[node.stage]) {
      acc[node.stage] = [];
    }
    acc[node.stage].push(node);
    return acc;
  }, {} as Record<string, TreeNode[]>);

  const stages = [
    'problem_definition',
    'metrics',
    'data',
    'features',
    'model',
    'training',
    'deployment',
    'monitoring',
  ];

  const handleSaveEdit = () => {
    try {
      const updatedProblem = parseYaml(yamlText);
      const errors = validateTree(updatedProblem);

      if (errors.length > 0) {
        setEditError(`Validation errors: ${errors.join(', ')}`);
        return;
      }

      // Update the problem with the new data
      Object.assign(problem, updatedProblem);
      setIsEditMode(false);
      setEditError(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to parse YAML');
    }
  };

  const handleCancelEdit = () => {
    setYamlText(stringify(problem));
    setIsEditMode(false);
    setEditError(null);
  };

  const handleDiscardClick = () => {
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onDiscard();
  };

  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
  };

  if (isEditMode) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit YAML
          </h3>
          <button
            onClick={handleCancelEdit}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          value={yamlText}
          onChange={(e) => setYamlText(e.target.value)}
          className="w-full h-96 px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
        />

        {editError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">{editError}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {problem.title}
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {problem.description}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Nodes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{nodeCount}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Branch Points</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{branchCount}</p>
        </div>
      </div>

      {/* Stage Summary */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Stage Coverage
        </h4>
        <div className="space-y-2">
          {stages.map((stage) => {
            const nodes = stageGroups[stage] || [];
            const hasNodes = nodes.length > 0;
            const questionCount = nodes.filter(n => n.type === 'question').length;

            return (
              <div
                key={stage}
                className={`flex items-center justify-between p-3 rounded-md ${
                  hasNodes
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {hasNodes ? (
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {stage.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {nodes.length} node{nodes.length !== 1 ? 's' : ''}
                  {questionCount > 0 && ` (${questionCount} branch${questionCount !== 1 ? 'es' : ''})`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Branch Points */}
      {questionNodes.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Decision Points
          </h4>
          <div className="space-y-2">
            {questionNodes.map((node) => (
              <div
                key={node.id}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {node.label}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {node.choices?.length || 0} choice{node.choices?.length !== 1 ? 's' : ''} in{' '}
                  <span className="capitalize">{node.stage.replace('_', ' ')}</span> stage
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleDiscardClick}
          className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Discard
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsEditMode(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit YAML
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Accept
          </button>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelDiscard} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Discard Generated Tree?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to discard this generated tree? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDiscard}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDiscard}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
