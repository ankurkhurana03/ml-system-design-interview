import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AuditLogEntry } from '@/types/tree';

interface AnalyticsData {
  totalComments: number;
  commentsToday: number;
  aiCount: number;
  humanCount: number;
  avgConfidence: number;
  approvalRate: number;
  actionCounts: Record<string, number>;
  last7Days: { date: string; count: number }[];
  recentActivity: AuditLogEntry[];
}

export function ModerationAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all audit log entries
      const { data: entries } = await supabase
        .from('moderation_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (!entries) {
        setData(null);
        setLoading(false);
        return;
      }

      // Calculate metrics
      const totalComments = entries.length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const commentsToday = entries.filter(e => new Date(e.created_at) >= today).length;

      const aiCount = entries.filter(e => e.actor_type === 'ai').length;
      const humanCount = entries.filter(e => e.actor_type === 'human').length;

      const confidenceScores = entries
        .filter(e => e.confidence !== null)
        .map(e => e.confidence as number);
      const avgConfidence = confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
        : 0;

      const approvedCount = entries.filter(e => e.action === 'approved').length;
      const approvalRate = totalComments > 0 ? (approvedCount / totalComments) * 100 : 0;

      // Action counts
      const actionCounts: Record<string, number> = {};
      entries.forEach(e => {
        actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
      });

      // Last 7 days
      const last7Days: { date: string; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const count = entries.filter(e => {
          const entryDate = new Date(e.created_at);
          return entryDate >= date && entryDate < nextDay;
        }).length;

        last7Days.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
        });
      }

      // Recent activity
      const recentActivity = entries.slice(0, 10);

      setData({
        totalComments,
        commentsToday,
        aiCount,
        humanCount,
        avgConfidence,
        approvalRate,
        actionCounts,
        last7Days,
        recentActivity,
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  const maxDayCount = Math.max(...data.last7Days.map(d => d.count), 1);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Moderated</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{data.totalComments}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Today</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{data.commentsToday}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">AI vs Human</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {data.aiCount} / {data.humanCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.totalComments > 0 ? ((data.aiCount / data.totalComments) * 100).toFixed(0) : 0}% AI
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg AI Confidence</div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {(data.avgConfidence * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Approval Rate</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{data.approvalRate.toFixed(0)}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions by Type */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions by Type</h3>
          <div className="space-y-3">
            {Object.entries(data.actionCounts).map(([action, count]) => {
              const percentage = (count / data.totalComments) * 100;
              const bgColor =
                action === 'approved' ? 'bg-green-500' :
                action === 'rejected' ? 'bg-red-500' :
                action === 'flagged' ? 'bg-yellow-500' :
                action === 'answered' ? 'bg-blue-500' :
                'bg-gray-500';

              return (
                <div key={action}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{action}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${bgColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI vs Human */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI vs Human Decisions</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Moderation</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{data.aiCount} ({data.totalComments > 0 ? ((data.aiCount / data.totalComments) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-purple-500"
                  style={{ width: `${data.totalComments > 0 ? (data.aiCount / data.totalComments) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Human Moderation</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{data.humanCount} ({data.totalComments > 0 ? ((data.humanCount / data.totalComments) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-indigo-500"
                  style={{ width: `${data.totalComments > 0 ? (data.humanCount / data.totalComments) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Timeline (Last 7 Days)</h3>
        <div className="flex items-end justify-between gap-2 h-48">
          {data.last7Days.map((day) => {
            const height = (day.count / maxDayCount) * 100;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center">
                <div className="w-full flex items-end justify-center mb-2" style={{ height: '180px' }}>
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                    title={`${day.count} actions`}
                  />
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 text-center">{day.date}</div>
                <div className="text-xs font-medium text-gray-900 dark:text-white">{day.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {data.recentActivity.map((entry) => {
            const actionColor =
              entry.action === 'approved' ? 'text-green-600 dark:text-green-400' :
              entry.action === 'rejected' ? 'text-red-600 dark:text-red-400' :
              entry.action === 'flagged' ? 'text-yellow-600 dark:text-yellow-400' :
              entry.action === 'answered' ? 'text-blue-600 dark:text-blue-400' :
              'text-gray-600 dark:text-gray-400';

            return (
              <div key={entry.id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-32">
                  {new Date(entry.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className={`text-sm font-medium ${actionColor} w-20 capitalize`}>
                  {entry.action}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  by <span className="font-medium">{entry.actor_name}</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                  {entry.actor_type === 'ai' ? 'AI' : 'Human'}
                </span>
                {entry.reason && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
                    {entry.reason}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
