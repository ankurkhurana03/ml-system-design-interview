import { useState } from 'react';
import type { Problem, PathEntry, TreeNode } from '@/types/tree';
import { generateTranscript } from './generateTranscript';

interface TranscriptButtonProps {
  problem: Problem;
  path: PathEntry[];
  nodeMap: Map<string, TreeNode>;
  disabled?: boolean;
}

export function TranscriptButton({
  problem,
  path,
  nodeMap,
  disabled = false,
}: TranscriptButtonProps) {
  const [showToast, setShowToast] = useState(false);

  const handleDownload = () => {
    // Generate the transcript markdown
    const markdown = generateTranscript(problem, path, nodeMap);

    // Create a blob and download URL
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${problem.id}-transcript-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show toast notification
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleDownload}
        disabled={disabled || path.length === 0}
        className={`
          px-6 py-2.5 font-medium rounded-lg transition-all duration-200
          flex items-center justify-center gap-2
          ${
            disabled || path.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg'
          }
        `}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download Transcript
      </button>

      {/* Toast notification */}
      {showToast && (
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg transition-opacity duration-200"
          role="alert"
        >
          Downloaded!
        </div>
      )}
    </div>
  );
}
