import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAutoRespond } from '@/hooks/useAutoRespond';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useModerationConfig } from '@/hooks/useModerationConfig';
import { getLLMSettings } from '@/utils/llmKeyStore';
import { ModerationSettings } from '@/components/admin/ModerationSettings';
import { AuditLogPanel } from './AuditLogPanel';
import { ModerationAnalytics } from './ModerationAnalytics';
import type { NodeComment, CommentStatus } from '@/types/tree';
import { decompressTextSafe } from '@/utils/compression';

type TabType = 'pending' | 'approved' | 'rejected' | 'all' | 'branches' | 'settings' | 'audit' | 'analytics';

interface GeneratedBranch {
  id: string;
  problem_id: string;
  target_node_id: string;
  choice_label: string;
  choice_answer: string;
  yaml_content: string;
  status: string;
  author_id: string | null;
  author_name: string;
  moderation_reason: string | null;
  moderation_confidence: number | null;
  created_at: string;
  updated_at: string;
}

interface ModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModerationPanel({ isOpen, onClose }: ModerationPanelProps) {
  const { user } = useAuth();
  const { config } = useModerationConfig();
  const { logAction } = useAuditLog();
  const {
    enabled: autoRespondEnabled,
    processing: autoRespondProcessing,
    processedCount,
    enableAutoRespond,
    disableAutoRespond,
    autoRespondToComment,
  } = useAutoRespond(user?.id || null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [comments, setComments] = useState<NodeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [autoModerateLoading, setAutoModerateLoading] = useState(false);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [branches, setBranches] = useState<GeneratedBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchFilter, setBranchFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Fetch comments based on active tab
  const fetchComments = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('node_comments').select('*').order('created_at', { ascending: false });

    if (activeTab !== 'all' && activeTab !== 'settings' && activeTab !== 'audit' && activeTab !== 'analytics') {
      query = query.eq('status', activeTab);
    }

    const { data } = await query;
    setComments(data || []);
    setLoading(false);
  }, [activeTab]);

  // Fetch generated branches
  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    let query = supabase.from('generated_branches').select('*').order('created_at', { ascending: false });
    if (branchFilter !== 'all') {
      query = query.eq('status', branchFilter);
    }
    const { data } = await query;
    setBranches((data as GeneratedBranch[]) || []);
    setBranchesLoading(false);
  }, [branchFilter]);

  useEffect(() => {
    if (isOpen && activeTab === 'branches') {
      fetchBranches();
    }
  }, [isOpen, activeTab, fetchBranches]);

  useEffect(() => {
    if (isOpen && activeTab !== 'audit' && activeTab !== 'analytics' && activeTab !== 'branches') {
      fetchComments();
    }
  }, [isOpen, activeTab, fetchComments]);

  // Filter comments by search term
  const filteredComments = useMemo(() => {
    if (!searchTerm) return comments;
    const term = searchTerm.toLowerCase();
    return comments.filter(
      (c) =>
        c.content.toLowerCase().includes(term) ||
        c.author_name.toLowerCase().includes(term) ||
        c.problem_id.toLowerCase().includes(term) ||
        c.node_id.toLowerCase().includes(term),
    );
  }, [comments, searchTerm]);

  // Moderate a single comment
  const moderateComment = async (commentId: string, status: CommentStatus) => {
    await supabase
      .from('node_comments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', commentId);

    // Log the action
    await logAction({
      comment_id: commentId,
      action: status as any,
      actor_type: 'human',
      actor_id: user?.id || null,
      actor_name: user?.email || 'Admin',
      reason: `Manually ${status} by moderator`,
    });

    await fetchComments();
  };

  // Reply to a comment
  const handleReply = async (parentId: string, problemId: string, nodeId: string) => {
    if (!user || !replyContent.trim()) return;

    const { data: newComment } = await supabase.from('node_comments').insert({
      problem_id: problemId,
      node_id: nodeId,
      user_id: user.id,
      author_name: 'Moderator',
      content: replyContent.trim(),
      comment_type: 'answer',
      parent_id: parentId,
      status: 'approved',
    }).select().single();

    // Log the reply action
    if (newComment) {
      await logAction({
        comment_id: parentId,
        action: 'answered',
        actor_type: 'human',
        actor_id: user.id,
        actor_name: user.email || 'Admin',
        reason: 'Moderator replied to comment',
      });
    }

    setReplyContent('');
    setReplyingTo(null);
    await fetchComments();
  };

  // Auto-moderate a single comment or multiple comments
  const autoModerate = async (commentIds: string[]) => {
    if (!user) return;
    setAutoModerateLoading(true);

    try {
      // Prepare rules from config
      const enabledRules = config?.rules.filter((r) => r.enabled).map((r) => r.description) || [];
      const threshold = config?.confidence_threshold ?? 0.8;

      const settings = getLLMSettings();
      if (!settings) throw new Error('No LLM settings configured. Please configure your API key in settings.');

      const { data, error } = await supabase.functions.invoke('moderate-comments', {
        body: {
          comment_ids: commentIds,
          user_id: user.id,
          rules: enabledRules,
          confidence_threshold: threshold,
          llm_api_key: settings.apiKey,
          llm_base_url: settings.baseUrl,
          llm_model: settings.model,
        },
      });

      if (error) throw error;

      // Log AI moderation actions
      if (data?.results) {
        console.log('Auto-moderation results:', data.results);

        // Log each result
        for (const result of data.results) {
          await logAction({
            comment_id: result.comment_id,
            action: result.decision === 'approve' ? 'approved' : result.decision === 'reject' ? 'rejected' : 'flagged',
            actor_type: 'ai',
            actor_id: user.id,
            actor_name: 'AI Moderator',
            reason: result.reason || 'Auto-moderated by AI',
            confidence: result.confidence || null,
            rules_applied: result.rules_triggered || null,
            metadata: { model: result.model || 'unknown' },
          });
        }
      }

      await fetchComments();
      setSelectedComments(new Set());
    } catch (error) {
      console.error('Auto-moderation error:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to auto-moderate. Please check your LLM settings.',
      );
    } finally {
      setAutoModerateLoading(false);
    }
  };

  // Moderate a branch (approve/reject)
  const moderateBranch = async (branchId: string, status: 'approved' | 'rejected', reason?: string) => {
    await supabase
      .from('generated_branches')
      .update({ status, moderation_reason: reason || null, updated_at: new Date().toISOString() })
      .eq('id', branchId);

    await logAction({
      comment_id: branchId,
      action: status as any,
      actor_type: 'human',
      actor_id: user?.id || null,
      actor_name: user?.email || 'Admin',
      reason: `Branch ${status} by moderator`,
      metadata: { item_type: 'branch' },
    });

    await fetchBranches();
  };

  // Auto-moderate branches via edge function
  const autoModerateBranches = async (branchIds: string[]) => {
    if (!user) return;
    setAutoModerateLoading(true);

    try {
      const enabledRules = config?.rules.filter((r) => r.enabled).map((r) => r.description) || [];
      const threshold = config?.confidence_threshold ?? 0.8;

      const settings = getLLMSettings();
      if (!settings) throw new Error('No LLM settings configured. Please configure your API key in settings.');

      const { data, error } = await supabase.functions.invoke('moderate-branches', {
        body: {
          branch_ids: branchIds,
          user_id: user.id,
          rules: enabledRules,
          confidence_threshold: threshold,
          llm_api_key: settings.apiKey,
          llm_base_url: settings.baseUrl,
          llm_model: settings.model,
        },
      });

      if (error) throw error;

      if (data?.results) {
        for (const result of data.results) {
          await logAction({
            comment_id: result.branch_id,
            action: result.decision === 'approve' ? 'approved' : result.decision === 'reject' ? 'rejected' : 'flagged',
            actor_type: 'ai',
            actor_id: user.id,
            actor_name: 'AI Moderator',
            reason: result.reason || 'Auto-moderated by AI',
            confidence: result.confidence || null,
            metadata: { item_type: 'branch', model: result.model || 'unknown' },
          });
        }
      }

      await fetchBranches();
    } catch (error) {
      console.error('Branch auto-moderation error:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to auto-moderate branches. Please check your LLM settings.',
      );
    } finally {
      setAutoModerateLoading(false);
    }
  };

  // Bulk approve all pending
  const bulkApprove = async () => {
    const pendingIds = filteredComments.filter((c) => c.status === 'pending').map((c) => c.id);
    if (pendingIds.length === 0) return;

    await Promise.all(pendingIds.map((id) => moderateComment(id, 'approved')));
  };

  // Bulk auto-moderate all pending
  const bulkAutoModerate = async () => {
    const pendingIds = filteredComments.filter((c) => c.status === 'pending').map((c) => c.id);
    if (pendingIds.length === 0) return;
    await autoModerate(pendingIds);
  };

  // Auto-respond to all questions
  const bulkAutoRespondQuestions = async () => {
    const questionIds = filteredComments
      .filter((c) => c.comment_type === 'question' && c.status === 'approved')
      .map((c) => c.id);
    if (questionIds.length === 0) return;

    for (const questionId of questionIds) {
      await autoRespondToComment(questionId);
    }

    await fetchComments();
  };

  // Toggle comment selection
  const toggleSelect = (commentId: string) => {
    setSelectedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // Auto-moderate selected
  const autoModerateSelected = async () => {
    if (selectedComments.size === 0) return;
    await autoModerate(Array.from(selectedComments));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-0 md:p-4">
      <div className="bg-white shadow-2xl w-full h-full md:rounded-xl md:max-w-7xl md:h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">Comment Moderation</h2>
              {config && config.mode === 'full_auto' && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Auto-moderation active
                </span>
              )}
              {config && config.mode === 'ai_assisted' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  AI-Assisted
                </span>
              )}
              {config && config.mode === 'manual' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  Manual
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Review and moderate user comments across all problems
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-Respond Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={autoRespondEnabled ? disableAutoRespond : enableAutoRespond}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  autoRespondEnabled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRespondEnabled && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span>
                  {autoRespondEnabled ? 'Auto-Respond Active' : 'Auto-Respond Off'}
                </span>
              </button>
              {autoRespondProcessing && (
                <span className="text-xs text-blue-600 font-medium">Processing...</span>
              )}
              {processedCount > 0 && (
                <span className="text-xs text-gray-500">{processedCount} answered</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            {(['pending', 'approved', 'rejected', 'all', 'branches', 'audit', 'analytics', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'audit' ? 'Audit Log' : tab === 'analytics' ? 'Analytics' : tab === 'branches' ? 'Branches' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab !== 'all' && tab !== 'settings' && tab !== 'audit' && tab !== 'analytics' && tab !== 'branches' && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                    {comments.filter((c) => c.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions & Search - only show for comment tabs */}
        {activeTab !== 'settings' && activeTab !== 'audit' && activeTab !== 'analytics' && activeTab !== 'branches' && (
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by content, author, problem, or node..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedComments.size > 0 && (
              <>
                <button
                  onClick={autoModerateSelected}
                  disabled={autoModerateLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {autoModerateLoading ? 'Processing...' : `Auto-Moderate (${selectedComments.size})`}
                </button>
                <button
                  onClick={() => setSelectedComments(new Set())}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Clear
                </button>
              </>
            )}
            {activeTab === 'pending' && (
              <>
                <button
                  onClick={bulkApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Approve All
                </button>
                <button
                  onClick={bulkAutoModerate}
                  disabled={autoModerateLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {autoModerateLoading ? 'Processing...' : 'Auto-Moderate All'}
                </button>
              </>
            )}
            {activeTab === 'approved' && (
              <button
                onClick={bulkAutoRespondQuestions}
                disabled={autoRespondProcessing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {autoRespondProcessing ? 'Processing...' : 'Auto-Respond All Questions'}
              </button>
            )}
          </div>
        </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'settings' ? (
            <div className="p-6">
              <ModerationSettings />
            </div>
          ) : activeTab === 'audit' ? (
            <AuditLogPanel />
          ) : activeTab === 'analytics' ? (
            <ModerationAnalytics />
          ) : activeTab === 'branches' ? (
            <div className="p-6">
              {/* Branch filter + actions */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setBranchFilter(f)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                        branchFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                {branchFilter === 'pending' && branches.length > 0 && (
                  <button
                    onClick={() => autoModerateBranches(branches.map((b) => b.id))}
                    disabled={autoModerateLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {autoModerateLoading ? 'Processing...' : 'Auto-Moderate All'}
                  </button>
                )}
              </div>

              {branchesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : branches.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No branches found</p>
              ) : (
                <div className="space-y-4">
                  {branches.map((branch) => (
                    <div key={branch.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{branch.choice_label}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            branch.status === 'approved' ? 'bg-green-100 text-green-700'
                              : branch.status === 'rejected' ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {branch.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(branch.created_at).toLocaleString()}</span>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">{branch.choice_answer}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>Problem: {branch.problem_id}</span>
                        <span>Target: {branch.target_node_id}</span>
                        <span>Author: {branch.author_name}</span>
                      </div>

                      {/* YAML Preview */}
                      <details className="mb-3">
                        <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">View YAML</summary>
                        <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">{decompressTextSafe(branch.yaml_content)}</pre>
                      </details>

                      {branch.moderation_reason && (
                        <p className="text-xs text-gray-500 mb-2 italic">Reason: {branch.moderation_reason}</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {branch.status === 'pending' && (
                          <>
                            <button
                              onClick={() => moderateBranch(branch.id, 'approved')}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => moderateBranch(branch.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => autoModerateBranches([branch.id])}
                          disabled={autoModerateLoading}
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                        >
                          Auto-Moderate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
            {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading comments...</p>
              </div>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No comments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedComments.has(comment.id)}
                      onChange={() => toggleSelect(comment.id)}
                      className="mt-1"
                    />

                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{comment.author_name}</span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              comment.comment_type === 'question'
                                ? 'bg-blue-100 text-blue-700'
                                : comment.comment_type === 'suggestion'
                                  ? 'bg-green-100 text-green-700'
                                  : comment.comment_type === 'answer'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {comment.comment_type}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              comment.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : comment.status === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : comment.status === 'answered'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {comment.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Content */}
                      <p className="text-gray-700 mb-2">{comment.content}</p>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>Problem: {comment.problem_id}</span>
                        <span>Node: {comment.node_id}</span>
                        {comment.parent_id && <span>Reply to: {comment.parent_id.slice(0, 8)}</span>}
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="mb-3 bg-gray-50 p-3 rounded-lg">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write your reply..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() =>
                                handleReply(comment.id, comment.problem_id, comment.node_id)
                              }
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                              Send Reply
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent('');
                              }}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {comment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => moderateComment(comment.id, 'approved')}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => moderateComment(comment.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            replyingTo === comment.id
                              ? setReplyingTo(null)
                              : setReplyingTo(comment.id)
                          }
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                        >
                          {replyingTo === comment.id ? 'Cancel Reply' : 'Reply'}
                        </button>
                        <button
                          onClick={() => autoModerate([comment.id])}
                          disabled={autoModerateLoading}
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                        >
                          Auto-Moderate
                        </button>
                        {comment.comment_type === 'question' && (
                          <button
                            onClick={async () => {
                              await autoRespondToComment(comment.id);
                              await fetchComments();
                            }}
                            disabled={autoRespondProcessing}
                            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                          >
                            Auto-Respond
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
