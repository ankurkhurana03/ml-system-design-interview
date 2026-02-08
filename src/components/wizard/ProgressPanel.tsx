/**
 * ProgressPanel — Collapsible panel showing study analytics and per-problem progress.
 *
 * Shows:
 *   - Overall stats: problems attempted, completed, total study time
 *   - Per-problem: progress bar, nodes visited, time spent, last visited
 *   - Visual progress bars for each problem
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAllProgress,
  getAggregateStats,
  clearProgress,
  clearAllProgress,
  type ProblemProgress,
  type AggregateStats,
} from '@/utils/progressStore';

interface ProgressPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'unknown';
  }
}

function getCompletionColor(percent: number): string {
  if (percent >= 80) return 'bg-green-500';
  if (percent >= 50) return 'bg-blue-500';
  if (percent >= 25) return 'bg-amber-500';
  return 'bg-gray-400';
}

function getCompletionTextColor(percent: number): string {
  if (percent >= 80) return 'text-green-700';
  if (percent >= 50) return 'text-blue-700';
  if (percent >= 25) return 'text-amber-700';
  return 'text-gray-600';
}

export function ProgressPanel({ isOpen, onClose }: ProgressPanelProps) {
  const [progress, setProgress] = useState<ProblemProgress[]>([]);
  const [stats, setStats] = useState<AggregateStats>({
    totalProblemsAttempted: 0,
    totalProblemsCompleted: 0,
    totalStudyTimeSeconds: 0,
    averageCompletionPercent: 0,
  });

  // Refresh data when panel opens
  useEffect(() => {
    if (isOpen) {
      setProgress(getAllProgress());
      setStats(getAggregateStats());
    }
  }, [isOpen]);

  // Refresh periodically while open (to update time spent)
  useEffect(() => {
    if (!isOpen) return;

    const interval = window.setInterval(() => {
      setProgress(getAllProgress());
      setStats(getAggregateStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearProblem = useCallback((problemId: string) => {
    if (confirm('Clear progress for this problem?')) {
      clearProgress(problemId);
      setProgress(getAllProgress());
      setStats(getAggregateStats());
    }
  }, []);

  const handleClearAll = useCallback(() => {
    if (confirm('Clear ALL progress data? This cannot be undone.')) {
      clearAllProgress();
      setProgress([]);
      setStats({
        totalProblemsAttempted: 0,
        totalProblemsCompleted: 0,
        totalStudyTimeSeconds: 0,
        averageCompletionPercent: 0,
      });
    }
  }, []);

  if (!isOpen) return null;

  // Sort by last visited (most recent first)
  const sorted = [...progress].sort(
    (a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime(),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-gray-900/50 w-full max-w-lg max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Study Progress</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Aggregate stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Attempted"
              value={String(stats.totalProblemsAttempted)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
            />
            <StatCard
              label="Completed"
              value={String(stats.totalProblemsCompleted)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
            />
            <StatCard
              label="Study Time"
              value={formatDuration(stats.totalStudyTimeSeconds)}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                </svg>
              }
              color="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30"
            />
            <StatCard
              label="Avg Progress"
              value={`${stats.averageCompletionPercent}%`}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              color="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30"
            />
          </div>

          {/* Progress overview bar chart */}
          {sorted.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Progress Overview</h3>
              <div className="space-y-1.5">
                {sorted.map((p) => (
                  <div key={p.problemId} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-24 truncate flex-shrink-0" title={p.problemTitle}>
                      {p.problemTitle}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getCompletionColor(p.completionPercent)}`}
                        style={{ width: `${Math.min(100, p.completionPercent)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-9 text-right ${getCompletionTextColor(p.completionPercent)}`}>
                      {p.completionPercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-problem details */}
          {sorted.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Problem Details</h3>
                {sorted.length > 1 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {sorted.map((p) => (
                  <ProblemProgressCard
                    key={p.problemId}
                    progress={p}
                    onClear={handleClearProblem}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-sm font-medium">No progress yet</p>
              <p className="text-xs mt-1">Start exploring problems to track your study progress.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <div className="text-lg font-bold dark:text-gray-100">{value}</div>
    </div>
  );
}

function ProblemProgressCard({
  progress,
  onClear,
}: {
  progress: ProblemProgress;
  onClear: (id: string) => void;
}) {
  const p = progress;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate" title={p.problemTitle}>
            {p.problemTitle}
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last visited {formatDate(p.lastVisitedAt)}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {p.completedAt && (
            <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
              Completed
            </span>
          )}
          <button
            onClick={() => onClear(p.problemId)}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
            title="Clear progress"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {p.nodesVisited} / {p.totalNodes} nodes visited
          </span>
          <span className={`text-xs font-semibold ${getCompletionTextColor(p.completionPercent)}`}>
            {p.completionPercent}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getCompletionColor(p.completionPercent)}`}
            style={{ width: `${Math.min(100, p.completionPercent)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
          </svg>
          <span>{formatDuration(p.timeSpentSeconds)}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span>
            {p.pathsExplored} / {p.totalPaths} paths
          </span>
        </div>
      </div>
    </div>
  );
}
