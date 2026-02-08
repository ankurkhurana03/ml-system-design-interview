import { useState, useMemo } from 'react';
import { STUDY_PLANS } from '@/data/studyPlans';
import { getProgress } from '@/utils/progressStore';
import type { ProblemMeta } from '@/types/tree';
import type { StudyPlan } from '@/data/studyPlans';

interface StudyPlanPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProblem: (id: string) => void;
  problemMetas: ProblemMeta[];
}

const difficultyConfig = {
  beginner: { color: 'bg-green-100 text-green-700 border-green-300', badge: 'bg-green-600', label: 'Beginner' },
  intermediate: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', badge: 'bg-yellow-600', label: 'Intermediate' },
  advanced: { color: 'bg-red-100 text-red-700 border-red-300', badge: 'bg-red-600', label: 'Advanced' },
};

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const CircleIcon = () => (
  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" strokeWidth={2} />
  </svg>
);

const PartialCircleIcon = () => (
  <svg className="w-5 h-5 text-blue-500" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth={2} />
    <circle cx="10" cy="10" r="4" fill="currentColor" />
  </svg>
);

function getPlanProgress(plan: StudyPlan) {
  let completed = 0;
  let inProgress = 0;

  for (const pid of plan.problemIds) {
    const progress = getProgress(pid);
    if (progress) {
      if (progress.completionPercent >= 80) {
        completed++;
      } else if (progress.completionPercent > 0) {
        inProgress++;
      }
    }
  }

  return { completed, inProgress, total: plan.problemIds.length };
}

export function StudyPlanPanel({ isOpen, onClose, onSelectProblem, problemMetas }: StudyPlanPanelProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Build a lookup for problem titles by ID
  const problemTitleMap = useMemo(() => {
    const map = new Map<string, ProblemMeta>();
    for (const m of problemMetas) {
      map.set(m.id, m);
    }
    return map;
  }, [problemMetas]);

  const selectedPlan = selectedPlanId
    ? STUDY_PLANS.find((p) => p.id === selectedPlanId) ?? null
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white dark:bg-gray-800 shadow-xl dark:shadow-gray-900/50 w-full h-full md:rounded-lg md:max-w-4xl md:max-h-[85vh] md:h-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {selectedPlan && (
              <button
                onClick={() => setSelectedPlanId(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="Back to plans"
              >
                <BackIcon />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedPlan ? selectedPlan.title : 'Study Plans'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {selectedPlan
                  ? selectedPlan.description
                  : 'Follow a recommended learning path through the problems'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedPlan ? (
            <PlanDetail
              plan={selectedPlan}
              problemTitleMap={problemTitleMap}
              onSelectProblem={(id) => {
                onSelectProblem(id);
                onClose();
              }}
            />
          ) : (
            <PlanList
              onSelectPlan={setSelectedPlanId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan list (cards) ──────────────────────────────────────────────────

interface PlanListProps {
  onSelectPlan: (planId: string) => void;
}

function PlanList({ onSelectPlan }: PlanListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {STUDY_PLANS.map((plan) => {
        const { completed, inProgress, total } = getPlanProgress(plan);
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const cfg = difficultyConfig[plan.difficulty];

        return (
          <button
            key={plan.id}
            onClick={() => onSelectPlan(plan.id)}
            className="text-left p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all bg-white dark:bg-gray-700 group"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                {plan.title}
              </h3>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0 ${cfg.badge}`}
              >
                {cfg.label}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed line-clamp-2">
              {plan.description}
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
              <span>{total} problems</span>
              <span>~{plan.estimatedHours}h</span>
              {completed > 0 && (
                <span className="text-green-600 font-medium">{completed}/{total} done</span>
              )}
              {inProgress > 0 && completed === 0 && (
                <span className="text-blue-600 font-medium">{inProgress} in progress</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Plan detail (ordered problem list) ─────────────────────────────────

interface PlanDetailProps {
  plan: StudyPlan;
  problemTitleMap: Map<string, ProblemMeta>;
  onSelectProblem: (id: string) => void;
}

function PlanDetail({ plan, problemTitleMap, onSelectProblem }: PlanDetailProps) {
  const { completed, total } = getPlanProgress(plan);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const cfg = difficultyConfig[plan.difficulty];

  return (
    <div>
      {/* Summary header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total} problems</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">~{plan.estimatedHours} hours</span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{completed}/{total} completed</span>
          <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Ordered problem list */}
      <ol className="space-y-2">
        {plan.problemIds.map((pid, index) => {
          const meta = problemTitleMap.get(pid);
          const progress = getProgress(pid);

          const isCompleted = progress ? progress.completionPercent >= 80 : false;
          const isInProgress = progress ? progress.completionPercent > 0 && progress.completionPercent < 80 : false;

          return (
            <li key={pid}>
              <button
                onClick={() => onSelectProblem(pid)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all hover:shadow-sm ${
                  isCompleted
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700'
                    : isInProgress
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                {/* Step number */}
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {index + 1}
                </span>

                {/* Problem info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {meta?.title ?? pid}
                  </h4>
                  {meta?.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {meta.description}
                    </p>
                  )}
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {meta?.companies?.slice(0, 3).map((c) => (
                      <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                        {c}
                      </span>
                    ))}
                    {meta?.domains?.slice(0, 2).map((d) => (
                      <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircleIcon />
                  ) : isInProgress ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {progress!.completionPercent}%
                      </span>
                      <PartialCircleIcon />
                    </div>
                  ) : (
                    <CircleIcon />
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
