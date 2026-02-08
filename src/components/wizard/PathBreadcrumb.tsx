import type { PathEntry, TreeNode } from '@/types/tree';

interface PathBreadcrumbProps {
  path: PathEntry[];
  nodeMap: Map<string, TreeNode>;
}

export function PathBreadcrumb({ path, nodeMap }: PathBreadcrumbProps) {
  if (path.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center flex-wrap gap-2 text-sm">
          <span className="text-gray-500 font-medium">Path:</span>
          {path.map((entry, index) => {
            const node = nodeMap.get(entry.nodeId);
            const isLast = index === path.length - 1;

            return (
              <div key={`${entry.nodeId}-${index}`} className="flex items-center gap-2">
                {entry.choiceLabel && (
                  <>
                    <span className="px-2 py-1 bg-white rounded border border-gray-300 text-gray-700">
                      {entry.choiceLabel}
                    </span>
                    {!isLast && (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </>
                )}
                {!entry.choiceLabel && node && (
                  <>
                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 text-xs">
                      {node.label}
                    </span>
                    {!isLast && (
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
