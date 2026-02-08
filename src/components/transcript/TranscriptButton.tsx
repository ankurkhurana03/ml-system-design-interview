import { useState, useRef, useEffect } from 'react';
import type { Problem, PathEntry, TreeNode } from '@/types/tree';
import { generateTranscript } from './generateTranscript';
import { printTranscript } from '@/utils/printTranscript';

interface TranscriptButtonProps {
  problem: Problem;
  path: PathEntry[];
  nodeMap: Map<string, TreeNode>;
  disabled?: boolean;
  notes?: string;
}

export function TranscriptButton({
  problem,
  path,
  nodeMap,
  disabled = false,
  notes,
}: TranscriptButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Downloaded!');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDisabled = disabled || path.length === 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleDownload = () => {
    const markdown = generateTranscript(problem, path, nodeMap, notes);

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${problem.id}-transcript-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDropdownOpen(false);
    showToastNotification('Downloaded!');
  };

  const handlePrint = () => {
    printTranscript(problem, path, nodeMap, notes);
    setDropdownOpen(false);
    showToastNotification('Print dialog opened!');
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Main button + dropdown toggle */}
      <div className="flex">
        {/* Main download button */}
        <button
          onClick={handleDownload}
          disabled={isDisabled}
          className={`
            px-4 py-2.5 font-medium rounded-l-lg transition-all duration-200
            flex items-center justify-center gap-2
            ${
              isDisabled
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
          Transcript
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => !isDisabled && setDropdownOpen(!dropdownOpen)}
          disabled={isDisabled}
          className={`
            px-2 py-2.5 font-medium rounded-r-lg transition-all duration-200
            flex items-center justify-center border-l
            ${
              isDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-400'
                : 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg border-gray-500'
            }
          `}
          aria-label="Transcript export options"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
          role="menu"
        >
          <button
            onClick={handleDownload}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div>
              <div className="font-medium">Download Markdown</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">.md file</div>
            </div>
          </button>
          <button
            onClick={handlePrint}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors border-t border-gray-100 dark:border-gray-700"
            role="menuitem"
          >
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <div>
              <div className="font-medium">Print / Save PDF</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">Via print dialog</div>
            </div>
          </button>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <div
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg transition-opacity duration-200 whitespace-nowrap z-50"
          role="alert"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
