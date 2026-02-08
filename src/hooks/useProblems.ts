import { useState, useEffect } from 'react';
import type { Problem, ProblemMeta } from '@/types/tree';
import { loadBuiltinProblems } from '@/data/problems';
import { supabase } from '@/lib/supabase';
import { parse } from 'yaml';

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
              const problem = parse(gp.yaml_content) as Problem;
              galleryProblems.push(problem);
              galleryMetas.push({
                id: problem.id,
                title: problem.title,
                description: problem.description,
                author: gp.author_name,
                difficulty: gp.difficulty,
                tags: gp.tags,
                source: 'gallery' as const,
              });
            } catch (err) {
              console.error(`Failed to parse gallery problem ${gp.id}:`, err);
            }
          }
        }

        // Restore enhanced versions from localStorage
        const allProblems = [...builtins, ...galleryProblems];
        const restoredProblems = allProblems.map((p) => {
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

        setProblems(restoredProblems);
        setProblemMetas([...builtinMetas, ...galleryMetas]);
      } catch (err) {
        console.error('Error loading problems:', err);
        // Fall back to just built-in problems
        const builtins = loadBuiltinProblems();
        setProblems(builtins);
        setProblemMetas(
          builtins.map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            source: 'builtin' as const,
          })),
        );
      } finally {
        setLoading(false);
      }
    }

    loadProblems();
  }, []);

  const getProblemById = (id: string): Problem | undefined => {
    return problems.find(p => p.id === id);
  };

  const addProblem = (problem: Problem, source: 'gallery' | 'draft' = 'draft') => {
    setProblems(prev => [...prev, problem]);
    setProblemMetas(prev => [...prev, {
      id: problem.id,
      title: problem.title,
      description: problem.description,
      source,
    }]);
  };

  return { problems, problemMetas, loading, getProblemById, addProblem };
}
