import { useMemo } from 'react';
import type { PathEntry, TreeNode } from '@/types/tree';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ComparisonModeProps {
  isOpen: boolean;
  onClose: () => void;
  path: PathEntry[];
  nodeMap: Map<string, TreeNode>;
}

interface AlternatePath {
  decisionNode: TreeNode;
  chosenIndex: number;
  alternateChoices: Array<{
    index: number;
    label: string;
    answer: string;
    previewNode: TreeNode | null;
  }>;
}

export function ComparisonMode({ isOpen, onClose, path, nodeMap }: ComparisonModeProps) {
  // Find all decision points and their alternate paths
  const alternatePaths = useMemo(() => {
    const paths: AlternatePath[] = [];

    for (const entry of path) {
      const node = nodeMap.get(entry.nodeId);
      if (!node || node.type !== 'question' || !node.choices) continue;

      const chosenIndex = entry.choiceIndex ?? -1;
      if (chosenIndex === -1) continue;

      const alternateChoices = node.choices
        .map((choice, index) => {
          if (index === chosenIndex) return null; // Skip the chosen path
          const nextNode = nodeMap.get(choice.next);
          return {
            index,
            label: choice.label,
            answer: choice.answer,
            previewNode: nextNode || null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (alternateChoices.length > 0) {
        paths.push({
          decisionNode: node,
          chosenIndex,
          alternateChoices,
        });
      }
    }

    return paths;
  }, [path, nodeMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl dark:shadow-gray-900/50 max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Compare Paths</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {alternatePaths.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No decision points found in this path.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {alternatePaths.map((altPath, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Decision Node */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-3 border-b border-blue-100 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                      Decision Point {idx + 1}
                    </h3>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {altPath.decisionNode.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Chosen Path */}
                  <div className="bg-green-50 dark:bg-green-900/30 px-4 py-3 border-b border-green-100 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <h4 className="text-sm font-semibold text-green-900 dark:text-green-300">Your Choice</h4>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium mb-1">
                      {altPath.decisionNode.choices![altPath.chosenIndex].label}
                    </p>
                    {altPath.decisionNode.choices![altPath.chosenIndex].answer && (
                      <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {altPath.decisionNode.choices![altPath.chosenIndex].answer}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Alternate Paths */}
                  <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Alternate Paths Not Taken
                    </h4>
                    <div className="space-y-3">
                      {altPath.alternateChoices.map((alt) => (
                        <div
                          key={alt.index}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {alt.label}
                          </p>
                          {alt.answer && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {alt.answer}
                              </ReactMarkdown>
                            </div>
                          )}
                          {alt.previewNode && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next step:</p>
                              <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {alt.previewNode.content.substring(0, 150) +
                                    (alt.previewNode.content.length > 150 ? '...' : '')}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
