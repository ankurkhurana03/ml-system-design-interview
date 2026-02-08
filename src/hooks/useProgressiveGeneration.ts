import { useState, useRef, useCallback } from 'react';
import type { MLStage, Problem } from '@/types/tree';
import type { ScaffoldProblem } from '@/utils/scaffoldTree';
import { buildContentFillingPrompt, mergeGapContent } from '@/utils/scaffoldTree';
import { callLLM, tryParseJSON } from '@/utils/llmClient';

/**
 * Background batches for extensive mode.
 * Batch 0 (problem_definition + metrics) is handled in GenerateModal before closing.
 * Batches 1-3 run here in the background.
 */
const BACKGROUND_BATCHES: { stages: MLStage[]; maxTokens: number }[] = [
  { stages: ['data', 'features'], maxTokens: 4000 },
  { stages: ['model', 'training'], maxTokens: 8000 },
  { stages: ['deployment', 'monitoring'], maxTokens: 8000 },
];

export interface ProgressiveGenerationState {
  isGenerating: boolean;
  pendingStages: MLStage[];
  completedStages: MLStage[];
  failedStages: MLStage[];
  currentBatch: number;
  totalBatches: number;
  error: string | null;
}

type FilledContent = Array<{
  id: string;
  label?: string;
  content?: string;
  choices?: Array<{ label?: string; answer?: string }>;
}>;

async function runBatch(
  scaffold: ScaffoldProblem,
  description: string,
  batch: { stages: MLStage[]; maxTokens: number },
  signal: AbortSignal,
): Promise<FilledContent> {
  const prompt = buildContentFillingPrompt(scaffold, description, {
    depth: 'detailed',
    stageFilter: batch.stages,
  });

  const raw = await callLLM({
    systemPrompt:
      'You are an expert ML system design interviewer. Return ONLY a valid JSON array. No markdown wrapping, no explanation. /no_think',
    userMessage: prompt,
    maxTokens: batch.maxTokens,
    signal,
  });

  const filledContent = tryParseJSON(raw);
  if (!filledContent) {
    throw new Error('LLM returned invalid JSON for batch');
  }

  return filledContent as FilledContent;
}

export function useProgressiveGeneration(options: {
  updateProblem: (problem: Problem) => void;
}) {
  const { updateProblem } = options;

  const [state, setState] = useState<ProgressiveGenerationState>({
    isGenerating: false,
    pendingStages: [],
    completedStages: [],
    failedStages: [],
    currentBatch: 0,
    totalBatches: 0,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const problemRef = useRef<Problem | null>(null);
  const scaffoldRef = useRef<ScaffoldProblem | null>(null);
  const descriptionRef = useRef<string>('');
  const isRunningRef = useRef(false);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isRunningRef.current = false;
    setState((prev) => ({
      ...prev,
      isGenerating: false,
      pendingStages: [],
      currentBatch: 0,
    }));
  }, []);

  const runBatches = useCallback(
    (batchIndices: number[]) => {
      const scaffold = scaffoldRef.current;
      const description = descriptionRef.current;
      if (!scaffold || !problemRef.current) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      isRunningRef.current = true;

      const pendingStages = batchIndices.flatMap((i) => BACKGROUND_BATCHES[i].stages);

      setState((prev) => ({
        ...prev,
        isGenerating: true,
        pendingStages,
        failedStages: prev.failedStages.filter((s) => !pendingStages.includes(s)),
        error: null,
      }));

      (async () => {
        const newFailed: MLStage[] = [];
        const newCompleted: MLStage[] = [];

        for (const batchIdx of batchIndices) {
          if (controller.signal.aborted) return;

          const batch = BACKGROUND_BATCHES[batchIdx];

          setState((prev) => ({
            ...prev,
            currentBatch: batchIdx + 2, // +2: batch 0 already done, 1-indexed
          }));

          try {
            const filledContent = await runBatch(scaffold, description, batch, controller.signal);

            if (controller.signal.aborted) return;

            const currentProblem = problemRef.current!;
            const merged = mergeGapContent(currentProblem, filledContent);

            problemRef.current = merged;
            updateProblem(merged);

            newCompleted.push(...batch.stages);
            setState((prev) => ({
              ...prev,
              completedStages: [...prev.completedStages, ...batch.stages],
              pendingStages: prev.pendingStages.filter((s) => !batch.stages.includes(s)),
            }));
          } catch (err) {
            if (controller.signal.aborted) return;
            if (err instanceof DOMException && err.name === 'AbortError') return;

            console.warn(`[ProgressiveGen] Batch ${batchIdx + 1} failed:`, err);
            newFailed.push(...batch.stages);
            setState((prev) => ({
              ...prev,
              failedStages: [...prev.failedStages, ...batch.stages],
              pendingStages: prev.pendingStages.filter((s) => !batch.stages.includes(s)),
            }));
          }
        }

        isRunningRef.current = false;
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          pendingStages: [],
        }));
      })();
    },
    [updateProblem],
  );

  const startBackgroundFill = useCallback(
    (scaffold: ScaffoldProblem, description: string, initialProblem: Problem) => {
      // Cancel any previous run
      if (isRunningRef.current) {
        abortControllerRef.current?.abort();
      }

      problemRef.current = initialProblem;
      scaffoldRef.current = scaffold;
      descriptionRef.current = description;

      const initialCompleted: MLStage[] = ['problem_definition', 'metrics'];

      setState({
        isGenerating: true,
        pendingStages: BACKGROUND_BATCHES.flatMap((b) => b.stages),
        completedStages: [...initialCompleted],
        failedStages: [],
        currentBatch: 1,
        totalBatches: BACKGROUND_BATCHES.length + 1,
        error: null,
      });

      // Run all background batches (indices 0, 1, 2)
      runBatches([0, 1, 2]);
    },
    [runBatches],
  );

  const retryFailed = useCallback(() => {
    if (!scaffoldRef.current || !problemRef.current || state.failedStages.length === 0) return;

    // Find which batch indices contain the failed stages
    const failedSet = new Set(state.failedStages);
    const batchIndicesToRetry = BACKGROUND_BATCHES
      .map((batch, idx) => ({ batch, idx }))
      .filter(({ batch }) => batch.stages.some((s) => failedSet.has(s)))
      .map(({ idx }) => idx);

    if (batchIndicesToRetry.length === 0) return;

    runBatches(batchIndicesToRetry);
  }, [state.failedStages, runBatches]);

  return {
    ...state,
    startBackgroundFill,
    cancel,
    retryFailed,
  };
}
