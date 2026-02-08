import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_DURATION = 45 * 60; // 45 minutes in seconds
const WARNING_THRESHOLD = 5 * 60; // 5 minutes
const CRITICAL_THRESHOLD = 1 * 60; // 1 minute

export function PracticeTimer() {
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem('practiceTimer.enabled');
    return stored === 'true';
  });
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_DURATION);
  const intervalRef = useRef<number | null>(null);

  // Save enabled state to localStorage
  useEffect(() => {
    localStorage.setItem('practiceTimer.enabled', String(isEnabled));
  }, [isEnabled]);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = useCallback(() => {
    setIsEnabled((prev) => !prev);
    if (!isEnabled) {
      // When enabling, reset and start
      setTimeRemaining(DEFAULT_DURATION);
      setIsRunning(false);
    }
  }, [isEnabled]);

  const handleStartPause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(DEFAULT_DURATION);
  }, []);

  if (!isEnabled) {
    return (
      <button
        onClick={handleToggleTimer}
        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
        title="Enable Practice Timer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
        </svg>
        <span className="hidden sm:inline">Timer</span>
      </button>
    );
  }

  const getColorClass = () => {
    if (timeRemaining <= CRITICAL_THRESHOLD) {
      return 'text-red-600 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
    }
    if (timeRemaining <= WARNING_THRESHOLD) {
      return 'text-amber-600 bg-amber-50 dark:bg-yellow-900/30 border-amber-200 dark:border-yellow-800';
    }
    return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`px-3 py-1.5 rounded-lg border ${getColorClass()} font-mono text-sm font-semibold`}>
        {formatTime(timeRemaining)}
      </div>
      <button
        onClick={handleStartPause}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={isRunning ? 'Pause Timer' : 'Start Timer'}
      >
        {isRunning ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      <button
        onClick={handleReset}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Reset Timer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <button
        onClick={handleToggleTimer}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Disable Timer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
