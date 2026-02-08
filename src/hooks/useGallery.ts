import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Problem } from '@/types/tree';
import { stringify } from 'yaml';

interface GalleryProblem {
  id: string;
  user_id?: string;
  title: string;
  description: string;
  yaml_content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  upvotes: number;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export function useGallery() {
  const [galleryProblems, setGalleryProblems] = useState<GalleryProblem[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGalleryProblems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch gallery problems
      const { data: problems, error: problemsError } = await supabase
        .from('gallery_problems')
        .select('*')
        .order('created_at', { ascending: false });

      if (problemsError) throw problemsError;

      setGalleryProblems(problems || []);

      // Fetch user's upvotes if authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: upvotes, error: upvotesError } = await supabase
          .from('gallery_upvotes')
          .select('problem_id')
          .eq('user_id', user.id);

        if (upvotesError) throw upvotesError;

        setUserUpvotes(new Set(upvotes?.map((u) => u.problem_id) || []));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gallery problems');
      console.error('Error fetching gallery:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleryProblems();
  }, [fetchGalleryProblems]);

  const publishProblem = useCallback(
    async (
      problem: Problem,
      difficulty: 'beginner' | 'intermediate' | 'advanced',
      tags: string[],
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { success: false, error: 'You must be logged in to publish problems' };
        }

        // Convert problem to YAML
        const yamlContent = stringify(problem);

        // Get author name from user metadata or email
        const authorName =
          user.user_metadata?.user_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          'Anonymous';

        const { error: insertError } = await supabase.from('gallery_problems').insert({
          id: problem.id,
          user_id: user.id,
          title: problem.title,
          description: problem.description,
          yaml_content: yamlContent,
          difficulty,
          tags,
          author_name: authorName,
        });

        if (insertError) throw insertError;

        await fetchGalleryProblems();
        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to publish problem';
        return { success: false, error: errorMessage };
      }
    },
    [fetchGalleryProblems],
  );

  const upvoteProblem = useCallback(
    async (problemId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { success: false, error: 'You must be logged in to upvote' };
        }

        // Add upvote
        const { error: upvoteError } = await supabase.from('gallery_upvotes').insert({
          user_id: user.id,
          problem_id: problemId,
        });

        if (upvoteError) throw upvoteError;

        // Increment upvote count
        const { error: updateError } = await supabase.rpc('increment_upvotes', {
          problem_id: problemId,
        });

        // If RPC doesn't exist, manually update
        if (updateError) {
          const problem = galleryProblems.find((p) => p.id === problemId);
          if (problem) {
            await supabase
              .from('gallery_problems')
              .update({ upvotes: problem.upvotes + 1 })
              .eq('id', problemId);
          }
        }

        // Update local state
        setUserUpvotes((prev) => new Set([...prev, problemId]));
        setGalleryProblems((prev) =>
          prev.map((p) => (p.id === problemId ? { ...p, upvotes: p.upvotes + 1 } : p)),
        );

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to upvote';
        return { success: false, error: errorMessage };
      }
    },
    [galleryProblems],
  );

  const removeUpvote = useCallback(
    async (problemId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { success: false, error: 'You must be logged in to remove upvote' };
        }

        // Remove upvote
        const { error: deleteError } = await supabase
          .from('gallery_upvotes')
          .delete()
          .eq('user_id', user.id)
          .eq('problem_id', problemId);

        if (deleteError) throw deleteError;

        // Decrement upvote count
        const problem = galleryProblems.find((p) => p.id === problemId);
        if (problem && problem.upvotes > 0) {
          await supabase
            .from('gallery_problems')
            .update({ upvotes: problem.upvotes - 1 })
            .eq('id', problemId);
        }

        // Update local state
        setUserUpvotes((prev) => {
          const next = new Set(prev);
          next.delete(problemId);
          return next;
        });
        setGalleryProblems((prev) =>
          prev.map((p) =>
            p.id === problemId ? { ...p, upvotes: Math.max(0, p.upvotes - 1) } : p,
          ),
        );

        return { success: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove upvote';
        return { success: false, error: errorMessage };
      }
    },
    [galleryProblems],
  );

  return {
    galleryProblems,
    loading,
    error,
    publishProblem,
    upvoteProblem,
    removeUpvote,
    userUpvotes,
    refetch: fetchGalleryProblems,
  };
}
