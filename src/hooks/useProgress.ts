/**
 * Hook that auto-tracks study progress for the active problem.
 *
 * - Monitors visitedNodeIds from WizardContext to calculate completion %
 * - Runs a 1-second interval timer while a problem is active
 * - Counts unique paths explored (terminal nodes reached)
 * - Persists to localStorage via progressStore
 */

import { useEffect, useRef, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { getProgress, saveProgress, type ProblemProgress } from '@/utils/progressStore';
import { getAllPaths } from '@/utils/treeTraversal';

export function useProgress() {
  const { problem, visitedNodeIds, currentNode } = useWizard();
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);
  const lastSaveRef = useRef<number>(0);
  const terminalNodesReachedRef = useRef<Set<string>>(new Set());

  // When problem changes, load existing progress (elapsed time, terminal nodes reached)
  useEffect(() => {
    if (!problem) {
      elapsedRef.current = 0;
      terminalNodesReachedRef.current = new Set();
      return;
    }

    const existing = getProgress(problem.id);
    if (existing) {
      elapsedRef.current = existing.timeSpentSeconds;
    } else {
      elapsedRef.current = 0;
    }
    // Reset terminal tracking for this session — we'll rebuild from visitedNodeIds
    terminalNodesReachedRef.current = new Set();
  }, [problem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track terminal nodes reached
  useEffect(() => {
    if (currentNode?.type === 'terminal') {
      terminalNodesReachedRef.current.add(currentNode.id);
    }
  }, [currentNode]);

  // Save progress to localStorage
  const persistProgress = useCallback(() => {
    if (!problem) return;

    const totalNodes = problem.nodes.length;
    const nodesVisited = visitedNodeIds.size;
    const completionPercent = totalNodes > 0 ? Math.round((nodesVisited / totalNodes) * 100) : 0;

    // Count total paths (cache-friendly — only compute once per problem)
    let totalPaths = 0;
    try {
      totalPaths = getAllPaths(problem).length;
    } catch {
      // getAllPaths may be expensive for large trees; default to 0
      totalPaths = 0;
    }

    const pathsExplored = terminalNodesReachedRef.current.size;

    const now = new Date().toISOString();
    const existing = getProgress(problem.id);

    const progress: ProblemProgress = {
      problemId: problem.id,
      problemTitle: problem.title,
      completionPercent,
      pathsExplored,
      totalPaths,
      nodesVisited,
      totalNodes,
      timeSpentSeconds: elapsedRef.current,
      lastVisitedAt: now,
      completedAt: existing?.completedAt || (completionPercent >= 80 ? now : undefined),
    };

    saveProgress(problem.id, progress);
    lastSaveRef.current = Date.now();
  }, [problem, visitedNodeIds]);

  // Timer: increment elapsed time every second while a problem is active
  useEffect(() => {
    if (!problem) return;

    timerRef.current = window.setInterval(() => {
      elapsedRef.current += 1;

      // Persist every 10 seconds to avoid excessive writes
      if (Date.now() - lastSaveRef.current >= 10_000) {
        persistProgress();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Final save on cleanup
      persistProgress();
    };
  }, [problem?.id, persistProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save on visitedNodeIds change (node navigation)
  useEffect(() => {
    persistProgress();
  }, [visitedNodeIds, persistProgress]);

  return { persistProgress };
}
