import { useState, useEffect, useCallback } from 'react';

interface NotesPanelProps {
  problemId: string;
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_PREFIX = 'notes.';

export function NotesPanel({ problemId, isOpen, onClose }: NotesPanelProps) {
  const [notes, setNotes] = useState('');

  // Load notes from localStorage when problemId changes
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${problemId}`;
    const savedNotes = localStorage.getItem(storageKey) || '';
    setNotes(savedNotes);
  }, [problemId]);

  // Save notes to localStorage
  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newNotes = e.target.value;
      setNotes(newNotes);
      const storageKey = `${STORAGE_KEY_PREFIX}${problemId}`;
      localStorage.setItem(storageKey, newNotes);
    },
    [problemId]
  );

  const handleClearNotes = useCallback(() => {
    if (confirm('Are you sure you want to clear all notes for this problem?')) {
      setNotes('');
      const storageKey = `${STORAGE_KEY_PREFIX}${problemId}`;
      localStorage.removeItem(storageKey);
    }
  }, [problemId]);

  if (!isOpen) return null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">({notes.length} characters)</span>
        </div>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <button
              onClick={handleClearNotes}
              className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              title="Clear Notes"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Close Notes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Take notes during your interview practice..."
          className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Notes are automatically saved and will be included when you download the transcript.
        </p>
      </div>
    </div>
  );
}

/**
 * Get notes for a specific problem from localStorage
 */
export function getNotesForProblem(problemId: string): string {
  const storageKey = `${STORAGE_KEY_PREFIX}${problemId}`;
  return localStorage.getItem(storageKey) || '';
}
