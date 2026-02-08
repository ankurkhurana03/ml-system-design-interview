import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { NodeComment, CommentType } from '@/types/tree';

export function useNodeComments(problemId: string, nodeId: string) {
  const [comments, setComments] = useState<NodeComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!problemId || !nodeId) return;

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id || null;
      setUserId(currentUserId);

      const { data, error: fetchError } = await supabase
        .from('node_comments')
        .select('*')
        .eq('problem_id', problemId)
        .eq('node_id', nodeId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Fetch replies for each comment
      if (data && data.length > 0) {
        const commentIds = data.map((c: NodeComment) => c.id);
        const { data: replies } = await supabase
          .from('node_comments')
          .select('*')
          .in('parent_id', commentIds)
          .order('created_at', { ascending: true });

        // Fetch user votes for authenticated users
        let userVotesMap: Record<string, 1 | -1> = {};
        if (currentUserId) {
          const { data: votes } = await supabase
            .from('comment_votes')
            .select('comment_id, vote_type')
            .eq('user_id', currentUserId)
            .in('comment_id', commentIds);

          if (votes) {
            userVotesMap = votes.reduce((acc: Record<string, 1 | -1>, vote: { comment_id: string; vote_type: 1 | -1 }) => {
              acc[vote.comment_id] = vote.vote_type;
              return acc;
            }, {});
          }
        } else {
          // For guests, load votes from localStorage
          const guestVotes = localStorage.getItem('comment_votes');
          if (guestVotes) {
            const parsed = JSON.parse(guestVotes);
            commentIds.forEach(id => {
              if (parsed[id]) {
                userVotesMap[id] = parsed[id];
              }
            });
          }
        }

        const commentsWithReplies = data.map((comment: NodeComment) => ({
          ...comment,
          user_vote: userVotesMap[comment.id] || null,
          replies: (replies || []).filter((r: NodeComment) => r.parent_id === comment.id),
        }));

        setComments(commentsWithReplies);
      } else {
        setComments([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
      // For unauthenticated/no-supabase scenarios, use localStorage fallback
      const stored = localStorage.getItem(`comments_${problemId}_${nodeId}`);
      if (stored) {
        setComments(JSON.parse(stored));
      }
    } finally {
      setLoading(false);
    }
  }, [problemId, nodeId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(
    async (content: string, authorName: string, commentType: CommentType = 'suggestion', parentId?: string) => {
      const newComment: NodeComment = {
        id: crypto.randomUUID(),
        problem_id: problemId,
        node_id: nodeId,
        author_name: authorName,
        content,
        comment_type: commentType,
        parent_id: parentId,
        status: 'approved', // Auto-approve for now; moderation can flip this to 'pending'
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const { data: userData } = await supabase.auth.getUser();

        const { error: insertError } = await supabase
          .from('node_comments')
          .insert({
            ...newComment,
            user_id: userData?.user?.id ?? null,
          });

        if (insertError) throw insertError;
      } catch {
        // Fallback: store locally
        const stored = localStorage.getItem(`comments_${problemId}_${nodeId}`);
        const existing: NodeComment[] = stored ? JSON.parse(stored) : [];
        existing.push(newComment);
        localStorage.setItem(`comments_${problemId}_${nodeId}`, JSON.stringify(existing));
      }

      // Optimistic update
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c,
          ),
        );
      } else {
        setComments((prev) => [...prev, { ...newComment, replies: [] }]);
      }
    },
    [problemId, nodeId],
  );

  const vote = useCallback(
    async (commentId: string, voteType: 1 | -1) => {
      const comment = comments.find((c) => c.id === commentId);
      if (!comment) return;

      const currentVote = comment.user_vote ?? null;
      const newVote = currentVote === voteType ? null : voteType;

      // Optimistic update
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            let scoreChange = 0;
            if ((currentVote === null || currentVote === undefined) && newVote !== null) {
              scoreChange = newVote;
            } else if (currentVote !== null && currentVote !== undefined && newVote === null) {
              scoreChange = -currentVote;
            } else if (currentVote !== null && currentVote !== undefined && newVote !== null) {
              scoreChange = newVote - currentVote;
            }
            return {
              ...c,
              user_vote: newVote,
              vote_score: (c.vote_score || 0) + scoreChange,
            };
          }
          return c;
        }),
      );

      try {
        if (userId) {
          // Authenticated user - use database
          if (newVote === null) {
            // Remove vote
            await supabase
              .from('comment_votes')
              .delete()
              .eq('comment_id', commentId)
              .eq('user_id', userId);
          } else {
            // Upsert vote
            await supabase
              .from('comment_votes')
              .upsert({
                comment_id: commentId,
                user_id: userId,
                vote_type: newVote,
              });
          }
        } else {
          // Guest user - use localStorage
          const guestVotes = localStorage.getItem('comment_votes');
          const votes = guestVotes ? JSON.parse(guestVotes) : {};

          if (newVote === null) {
            delete votes[commentId];
          } else {
            votes[commentId] = newVote;
          }

          localStorage.setItem('comment_votes', JSON.stringify(votes));

          // Also update the vote_score in localStorage comments if they exist
          const stored = localStorage.getItem(`comments_${problemId}_${nodeId}`);
          if (stored) {
            const localComments = JSON.parse(stored);
            const updated = localComments.map((c: NodeComment) => {
              if (c.id === commentId) {
                let scoreChange = 0;
                if ((currentVote === null || currentVote === undefined) && newVote !== null) {
                  scoreChange = newVote;
                } else if (currentVote !== null && currentVote !== undefined && newVote === null) {
                  scoreChange = -currentVote;
                } else if (currentVote !== null && currentVote !== undefined && newVote !== null) {
                  scoreChange = newVote - currentVote;
                }
                return {
                  ...c,
                  vote_score: (c.vote_score || 0) + scoreChange,
                };
              }
              return c;
            });
            localStorage.setItem(`comments_${problemId}_${nodeId}`, JSON.stringify(updated));
          }
        }
      } catch (err) {
        console.error('Failed to vote:', err);
        // Revert optimistic update
        fetchComments();
      }
    },
    [comments, userId, problemId, nodeId, fetchComments],
  );

  const upvote = useCallback((commentId: string) => vote(commentId, 1), [vote]);
  const downvote = useCallback((commentId: string) => vote(commentId, -1), [vote]);

  return { comments, loading, error, addComment, upvote, downvote, refetch: fetchComments };
}
