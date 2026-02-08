import { useState } from 'react';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AuditLogEntry, AuditAction, ActorType } from '@/types/tree';

export function AuditLogPanel() {
  const { entries, loading, error, totalCount, page, setPage, filters, setFilters } = useAuditLog();
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const totalPages = Math.ceil(totalCount / 20);

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Actor Type', 'Actor Name', 'Reason', 'Confidence', 'Comment ID'];
    const rows = entries.map(entry => [
      new Date(entry.created_at).toLocaleString(),
      entry.action,
      entry.actor_type,
      entry.actor_name,
      entry.reason || '',
      entry.confidence?.toString() || '',
      entry.comment_id || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getActionBadgeClass = (action: AuditAction) => {
    switch (action) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'flagged':
        return 'bg-yellow-100 text-yellow-700';
      case 'answered':
        return 'bg-blue-100 text-blue-700';
      case 'deleted':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActorBadgeClass = (actorType: ActorType) => {
    return actorType === 'ai'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-indigo-100 text-indigo-700';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => {
                setFilters({ ...filters, action: e.target.value ? (e.target.value as AuditAction) : undefined });
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
              <option value="answered">Answered</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Actor Type</label>
            <select
              value={filters.actor_type || ''}
              onChange={(e) => {
                setFilters({ ...filters, actor_type: e.target.value ? (e.target.value as ActorType) : undefined });
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actors</option>
              <option value="human">Human</option>
              <option value="ai">AI</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => {
                setFilters({ ...filters, date_from: e.target.value || undefined });
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => {
                setFilters({ ...filters, date_to: e.target.value || undefined });
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="ml-auto">
            <button
              onClick={handleExportCSV}
              disabled={entries.length === 0}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading audit log...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">Error loading audit log</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error}</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">No audit log entries found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActionBadgeClass(entry.action)}`}>
                        {entry.action}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getActorBadgeClass(entry.actor_type)}`}>
                        {entry.actor_type === 'ai' ? 'AI' : 'Human'}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.actor_name}</span>
                    </div>
                    {entry.reason && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{entry.reason}</p>
                    )}
                    {entry.confidence !== null && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Confidence: {(entry.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-gray-900 dark:text-white"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-gray-900/50 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Audit Log Entry Details</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timestamp</label>
                <p className="text-gray-900 dark:text-white">{new Date(selectedEntry.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                <span className={`inline-block px-2 py-1 text-sm font-medium rounded-full ${getActionBadgeClass(selectedEntry.action)}`}>
                  {selectedEntry.action}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actor</label>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-sm font-medium rounded-full ${getActorBadgeClass(selectedEntry.actor_type)}`}>
                    {selectedEntry.actor_type === 'ai' ? 'AI' : 'Human'}
                  </span>
                  <span className="text-gray-900 dark:text-white">{selectedEntry.actor_name}</span>
                </div>
              </div>
              {selectedEntry.comment_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment ID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-xs">{selectedEntry.comment_id}</p>
                </div>
              )}
              {selectedEntry.reason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                  <p className="text-gray-900 dark:text-white">{selectedEntry.reason}</p>
                </div>
              )}
              {selectedEntry.confidence !== null && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confidence Score</label>
                  <p className="text-gray-900 dark:text-white">{(selectedEntry.confidence * 100).toFixed(1)}%</p>
                </div>
              )}
              {selectedEntry.rules_applied && selectedEntry.rules_applied.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rules Applied</label>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedEntry.rules_applied.map((rule, idx) => (
                      <li key={idx} className="text-gray-900 dark:text-white">{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metadata</label>
                  <pre className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-xs overflow-x-auto text-gray-900 dark:text-gray-300">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
