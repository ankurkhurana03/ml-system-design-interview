import { useState } from 'react';
import type { Problem } from '@/types/tree';
import { validateTree } from '@/utils/validateTree';
import {
  scaffoldTree,
  buildContentFillingPrompt,
  mergeContentIntoScaffold,
  findUnfilledNodes,
  buildGapFillingPrompt,
  mergeGapContent,
} from '@/utils/scaffoldTree';
import type { ScaffoldProblem } from '@/utils/scaffoldTree';
import { callLLM, tryParseJSON } from '@/utils/llmClient';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (problem: Problem) => void;
  onStartBackgroundFill?: (
    scaffold: ScaffoldProblem,
    description: string,
    initialProblem: Problem,
  ) => void;
}

type GenerationStep =
  | 'idle'
  | 'scaffolding'
  | 'filling'
  | 'validating'
  | 'success'
  | 'error';

const STEP_LABELS: Record<GenerationStep, string> = {
  idle: '',
  scaffolding: 'Building tree structure...',
  filling: 'LLM writing educational content...',
  validating: 'Validating & finalizing...',
  success: 'Done!',
  error: 'Error',
};

type GenerationMode = 'quick' | 'extensive';

type FilledContentItem = {
  id: string;
  label?: string;
  content?: string;
  choices?: Array<{ label?: string; answer?: string }>;
};

export function GenerateModal({
  isOpen,
  onClose,
  onGenerated,
  onStartBackgroundFill,
}: GenerateModalProps) {
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GenerationMode>('quick');
  const [step, setStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isWorking = step === 'scaffolding' || step === 'filling' || step === 'validating';

  async function handleGenerate() {
    const effectiveTitle = title.trim() || description.trim().split(/[.!?\n]/)[0].slice(0, 60);
    if (!description.trim()) {
      setError('Please enter a problem description');
      return;
    }

    setStep('scaffolding');
    setError(null);

    const numBranches = mode === 'quick' ? 1 : 3;

    try {
      // STEP 1: Generate scaffold (instant, no LLM needed)
      const scaffold: ScaffoldProblem = scaffoldTree({
        title: effectiveTitle,
        description: description.trim(),
        numBranches,
      });

      if (mode === 'extensive') {
        await handleExtensiveGenerate(scaffold);
      } else {
        await handleQuickGenerate(scaffold);
      }
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Failed to generate tree');
    }
  }

  async function handleQuickGenerate(scaffold: ScaffoldProblem) {
    // STEP 2: Ask LLM to fill ALL content in a single call
    setStep('filling');
    const prompt = buildContentFillingPrompt(scaffold, description.trim(), {
      depth: 'concise',
    });

    const raw = await callLLM({
      systemPrompt:
        'You are an expert ML system design interviewer. Return ONLY a valid JSON array. No markdown wrapping, no explanation. /no_think',
      userMessage: prompt,
      maxTokens: 6000,
    });

    const filledContent = tryParseJSON(raw);
    if (!filledContent) {
      throw new Error('LLM returned invalid JSON. Please try again.');
    }

    // STEP 3: Merge and validate
    setStep('validating');
    let problem = mergeContentIntoScaffold(
      scaffold,
      filledContent as FilledContentItem[],
    );

    // Gap-filling: if some nodes still have placeholders, do a second pass
    const unfilled = findUnfilledNodes(problem);
    if (unfilled.length > 0) {
      setStep('filling');
      try {
        const gapPrompt = buildGapFillingPrompt(unfilled, description.trim());
        const gapRaw = await callLLM({
          systemPrompt:
            'You are an expert ML system design interviewer. Return ONLY a valid JSON array. /no_think',
          userMessage: gapPrompt,
          maxTokens: 4000,
        });
        const gapContent = tryParseJSON(gapRaw);
        if (gapContent) {
          problem = mergeGapContent(problem, gapContent as FilledContentItem[]);
        }
      } catch (gapErr) {
        console.warn('[GenerateModal] Gap-fill failed, continuing with partial content:', gapErr);
      }
      setStep('validating');
    }

    const errors = validateTree(problem);
    if (errors.length > 0) {
      console.warn('[GenerateModal] Validation errors:', errors);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    setStep('success');
    setTimeout(() => {
      onGenerated(problem);
      onClose();
      resetForm();
    }, 500);
  }

  async function handleExtensiveGenerate(scaffold: ScaffoldProblem) {
    // STEP 2: Fill only batch 0 (problem_definition + metrics) in the modal
    setStep('filling');
    const batch0Prompt = buildContentFillingPrompt(scaffold, description.trim(), {
      depth: 'detailed',
      stageFilter: ['problem_definition', 'metrics'],
    });

    const raw = await callLLM({
      systemPrompt:
        'You are an expert ML system design interviewer. Return ONLY a valid JSON array. No markdown wrapping, no explanation. /no_think',
      userMessage: batch0Prompt,
      maxTokens: 3000,
    });

    const filledContent = tryParseJSON(raw);
    if (!filledContent) {
      throw new Error('LLM returned invalid JSON for initial stages. Please try again.');
    }

    // STEP 3: Merge batch 0 into scaffold (remaining nodes keep placeholders)
    setStep('validating');
    const problem = mergeContentIntoScaffold(
      scaffold,
      filledContent as FilledContentItem[],
    );

    const errors = validateTree(problem);
    if (errors.length > 0) {
      console.warn('[GenerateModal] Validation errors:', errors);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    // Capture description before resetting form state
    const desc = description.trim();

    setStep('success');
    setTimeout(() => {
      onGenerated(problem);
      onClose();
      resetForm();

      // Start background fill for remaining stages
      if (onStartBackgroundFill) {
        onStartBackgroundFill(scaffold, desc, problem);
      }
    }, 300);
  }

  function resetForm() {
    setDescription('');
    setTitle('');
    setMode('quick');
    setStep('idle');
  }

  function handleClose() {
    if (isWorking) return;
    setDescription('');
    setTitle('');
    setError(null);
    setStep('idle');
    onClose();
  }

  const stepIndex = ['scaffolding', 'filling', 'validating', 'success'].indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white dark:bg-gray-800 shadow-xl w-full h-full md:max-w-2xl md:max-h-[90vh] md:rounded-lg md:h-auto flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Generate New Problem
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Structure is generated first, then the LLM fills in educational content.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
              <span className="text-gray-400 font-normal ml-1">
                (optional — derived from description if blank)
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fraud Detection System"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isWorking}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Problem Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the ML system design problem in detail. The more context you provide, the better the generated content will be.

Example: Build a fraud detection system for a payment processor handling 10M transactions/day. The system needs to flag suspicious transactions in real-time while minimizing false positives that block legitimate users."
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              disabled={isWorking}
            />
          </div>

          {/* Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Generation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('quick')}
                disabled={isWorking}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  mode === 'quick'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Quick
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  1 branch &middot; 2 paths
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Concise content &middot; ~30s
                </p>
              </button>

              <button
                onClick={() => setMode('extensive')}
                disabled={isWorking}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  mode === 'extensive'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-4 h-4 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Extensive
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  3 branches &middot; 8 paths
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Deep analysis + code &middot; progressive
                </p>
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          {step !== 'idle' && step !== 'error' && (
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-3">
              {['scaffolding', 'filling', 'validating', 'success'].map((s, i) => {
                const isActive = s === step;
                const isDone = stepIndex > i;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        isDone
                          ? 'bg-green-500'
                          : isActive
                            ? 'bg-blue-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {isDone ? (
                        <svg
                          className="w-3.5 h-3.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : isActive ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/50" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isDone
                          ? 'text-green-700 dark:text-green-400'
                          : isActive
                            ? 'text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {STEP_LABELS[s as GenerationStep]}
                    </span>
                  </div>
                );
              })}
              {mode === 'extensive' && step === 'filling' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-9">
                  Filling first 2 stages — remaining stages will generate in the background.
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isWorking}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          {step === 'error' ? (
            <button
              onClick={handleGenerate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retry
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!description.trim() || isWorking}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
