import { useState, useEffect, useCallback } from 'react';
import type { Problem, ProblemMeta } from '@/types/tree';
import { loadBuiltinProblems } from '@/data/problems';
import { supabase } from '@/lib/supabase';
import { parse } from 'yaml';
import { decompressTextSafe } from '@/utils/compression';
import { getDraftList, getDraftProblem, saveDraftProblem, deleteDraft } from '@/utils/draftStore';

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemMetas, setProblemMetas] = useState<ProblemMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProblems() {
      try {
        // Load built-in problems
        const builtins = loadBuiltinProblems();
        const builtinMetas: ProblemMeta[] = builtins.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          companies: p.companies,
          domains: p.domains,
          source: 'builtin' as const,
        }));

        // Load gallery problems
        const { data: galleryData } = await supabase
          .from('gallery_problems')
          .select('*')
          .order('created_at', { ascending: false });

        const galleryProblems: Problem[] = [];
        const galleryMetas: ProblemMeta[] = [];

        if (galleryData) {
          for (const gp of galleryData) {
            try {
              const problem = parse(decompressTextSafe(gp.yaml_content)) as Problem;
              galleryProblems.push(problem);
              galleryMetas.push({
                id: problem.id,
                title: problem.title,
                description: problem.description,
                author: gp.author_name,
                difficulty: gp.difficulty,
                tags: gp.tags,
                companies: gp.companies || [],
                domains: gp.domains || [],
                source: 'gallery' as const,
              });
            } catch (err) {
              console.error(`Failed to parse gallery problem ${gp.id}:`, err);
            }
          }
        }

        // Restore enhanced versions from localStorage (builtins + gallery only)
        const allNonDraftProblems = [...builtins, ...galleryProblems];
        const restoredProblems = allNonDraftProblems.map((p) => {
          try {
            const stored = localStorage.getItem(`enhanced_problem_${p.id}`);
            if (stored) {
              const enhanced = JSON.parse(stored) as Problem;
              // Use enhanced version if it has more nodes (was enriched)
              if (enhanced.nodes && enhanced.nodes.length > p.nodes.length) {
                return enhanced;
              }
            }
          } catch {
            // ignore parse errors
          }
          return p;
        });

        // Load draft problems from localStorage
        const draftMetas = getDraftList();
        const draftProblems: Problem[] = [];
        const validDraftMetas: ProblemMeta[] = [];

        for (const meta of draftMetas) {
          const dp = getDraftProblem(meta.id);
          if (dp) {
            draftProblems.push(dp);
            validDraftMetas.push(meta);
          }
        }

        setProblems([...restoredProblems, ...draftProblems]);
        setProblemMetas([...builtinMetas, ...galleryMetas, ...validDraftMetas]);
      } catch (err) {
        console.error('Error loading problems:', err);
        // Fall back to just built-in problems + drafts
        const builtins = loadBuiltinProblems();
        const draftMetas = getDraftList();
        const draftProblems: Problem[] = [];
        const validDraftMetas: ProblemMeta[] = [];
        for (const meta of draftMetas) {
          const dp = getDraftProblem(meta.id);
          if (dp) {
            draftProblems.push(dp);
            validDraftMetas.push(meta);
          }
        }

        setProblems([...builtins, ...draftProblems]);
        setProblemMetas([
          ...builtins.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            difficulty: p.difficulty,
            companies: p.companies,
            domains: p.domains,
            source: 'builtin' as const,
          })),
          ...validDraftMetas,
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadProblems();
  }, []);

  const getProblemById = (id: string): Problem | undefined => {
    return problems.find(p => p.id === id);
  };

  const addProblem = useCallback((problem: Problem, source: 'gallery' | 'draft' = 'draft', meta?: { companies?: string[]; domains?: string[] }) => {
    // Persist drafts to localStorage
    if (source === 'draft') {
      saveDraftProblem(problem, {
        companies: meta?.companies,
        domains: meta?.domains,
      });
    }

    setProblems(prev => [...prev, problem]);
    setProblemMetas(prev => [...prev, {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      companies: meta?.companies,
      domains: meta?.domains,
      source,
    }]);
  }, []);

  const updateProblemInState = useCallback((problem: Problem) => {
    setProblems(prev => prev.map(p => p.id === problem.id ? problem : p));
    setProblemMetas(prev => prev.map(m =>
      m.id === problem.id
        ? { ...m, title: problem.title, description: problem.description }
        : m,
    ));
  }, []);

  const deleteProblem = useCallback((id: string) => {
    deleteDraft(id);
    setProblems(prev => prev.filter(p => p.id !== id));
    setProblemMetas(prev => prev.filter(m => m.id !== id));
  }, []);

  return { problems, problemMetas, loading, getProblemById, addProblem, updateProblemInState, deleteProblem };
}
