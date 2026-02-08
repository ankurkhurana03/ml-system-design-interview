import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { NodeComment, CommentStatus } from '@/types/tree';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingComments, setPendingComments] = useState<NodeComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user]);

  // Fetch pending comments
  const fetchPending = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from('node_comments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setPendingComments(data || []);
  }, [isAdmin]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Moderate a comment
  const moderateComment = useCallback(async (commentId: string, status: CommentStatus) => {
    await supabase
      .from('node_comments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', commentId);
    setPendingComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  // Add admin reply to a comment (as an answer)
  const replyAsAdmin = useCallback(
    async (parentId: string, content: string, problemId: string, nodeId: string) => {
      if (!user) return;
      await supabase.from('node_comments').insert({
        problem_id: problemId,
        node_id: nodeId,
        user_id: user.id,
        author_name: 'Moderator',
        content,
        comment_type: 'answer',
        parent_id: parentId,
        status: 'approved',
      });
    },
    [user],
  );

  return {
    isAdmin,
    loading,
    pendingComments,
    moderateComment,
    replyAsAdmin,
    refetch: fetchPending,
  };
}
