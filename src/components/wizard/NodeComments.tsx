import { useState } from 'react';
import { useNodeComments } from '@/hooks/useNodeComments';
import type { NodeComment, CommentType } from '@/types/tree';

interface NodeCommentsProps {
  problemId: string;
  nodeId: string;
}

const COMMENT_TYPE_LABELS: Record<CommentType, { label: string; color: string }> = {
  suggestion: { label: 'Suggestion', color: 'bg-amber-100 text-amber-800' },
  question: { label: 'Question', color: 'bg-blue-100 text-blue-800' },
  feedback: { label: 'Feedback', color: 'bg-green-100 text-green-800' },
  answer: { label: 'Answer', color: 'bg-purple-100 text-purple-800' },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CommentItem({
  comment,
  onReply,
  onUpvote,
  onDownvote,
}: {
  comment: NodeComment;
  onReply: (parentId: string) => void;
  onUpvote: (commentId: string) => void;
  onDownvote: (commentId: string) => void;
}) {
  const typeInfo = COMMENT_TYPE_LABELS[comment.comment_type];

  return (
    <div className="border-l-2 border-gray-200 pl-3 py-2">
      <div className="flex items-start gap-2">
        {/* Voting buttons */}
        <div className="flex flex-col items-center gap-0.5 mt-0.5">
          <button
            onClick={() => onUpvote(comment.id)}
            className={`p-0.5 rounded transition-colors ${
              comment.user_vote === 1
                ? 'text-blue-600 hover:text-blue-700'
                : 'text-gray-400 hover:text-blue-500'
            }`}
            title="Upvote"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="text-xs font-medium text-gray-600">
            {comment.vote_score || 0}
          </span>
          <button
            onClick={() => onDownvote(comment.id)}
            className={`p-0.5 rounded transition-colors ${
              comment.user_vote === -1
                ? 'text-red-600 hover:text-red-700'
                : 'text-gray-400 hover:text-red-500'
            }`}
            title="Downvote"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Comment content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">{comment.author_name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment.content}</p>
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs text-blue-500 hover:text-blue-700 mt-1"
          >
            Reply
          </button>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-4 mt-2 space-y-2">
              {comment.replies.map((reply) => {
                const isAI = reply.author_name === 'AI Assistant';
                return (
                  <div
                    key={reply.id}
                    className={`border-l-2 pl-3 py-2 rounded-lg ${
                      isAI
                        ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50'
                        : 'border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isAI && (
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      )}
                      <span className={`text-sm font-medium ${isAI ? 'text-purple-700' : 'text-gray-700'}`}>
                        {reply.author_name}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${COMMENT_TYPE_LABELS[reply.comment_type].color}`}>
                        {COMMENT_TYPE_LABELS[reply.comment_type].label}
                      </span>
                      {isAI && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-200 text-purple-800">
                          Auto-generated
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{reply.content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NodeComments({ problemId, nodeId }: NodeCommentsProps) {
  const { comments, loading, addComment, upvote, downvote } = useNodeComments(problemId, nodeId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('comment_author') || '');
  const [commentType, setCommentType] = useState<CommentType>('suggestion');
  const [replyTo, setReplyTo] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');

  const handleSubmit = async () => {
    if (!newContent.trim()) return;

    const name = authorName.trim() || 'Anonymous';
    localStorage.setItem('comment_author', name);

    await addComment(newContent.trim(), name, commentType, replyTo);
    setNewContent('');
    setReplyTo(undefined);
    setShowForm(false);
  };

  const handleReply = (parentId: string) => {
    setReplyTo(parentId);
    setShowForm(true);
  };

  // Sort comments based on selected sort option
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'votes') {
      return (b.vote_score || 0) - (a.vote_score || 0);
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const commentCount = comments.length;

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <span>
          {commentCount > 0
            ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}`
            : 'Add a suggestion or question'}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 animate-slide-up">
          {loading && (
            <p className="text-sm text-gray-400">Loading comments...</p>
          )}

          {!loading && comments.length === 0 && !showForm && (
            <p className="text-sm text-gray-400 italic">
              No comments yet. Be the first to suggest a question or share feedback!
            </p>
          )}

          {/* Sort toggle */}
          {!loading && comments.length > 0 && (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xs text-gray-500">Sort by:</span>
              <button
                onClick={() => setSortBy('votes')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === 'votes'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Top Voted
              </button>
              <button
                onClick={() => setSortBy('newest')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  sortBy === 'newest'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Newest
              </button>
            </div>
          )}

          {/* Existing comments */}
          {sortedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onUpvote={upvote}
              onDownvote={downvote}
            />
          ))}

          {/* Add comment button */}
          {!showForm && (
            <button
              onClick={() => {
                setReplyTo(undefined);
                setShowForm(true);
              }}
              className="text-sm text-blue-500 hover:text-blue-700 font-medium"
            >
              + Add Comment
            </button>
          )}

          {/* Comment form */}
          {showForm && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              {replyTo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Replying to comment</span>
                  <button
                    onClick={() => setReplyTo(undefined)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Cancel reply
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value as CommentType)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="question">Question</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>

              <textarea
                placeholder={
                  commentType === 'suggestion'
                    ? 'Suggest a follow-up question or alternative approach...'
                    : commentType === 'question'
                      ? 'Ask a question about this stage...'
                      : 'Share your feedback...'
                }
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setReplyTo(undefined);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!newContent.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
