import type { MLStage } from '@/types/tree';

const STAGE_ORDER: MLStage[] = [
  'problem_definition',
  'metrics',
  'data',
  'features',
  'model',
  'training',
  'deployment',
  'monitoring',
];

const STAGE_LABELS: Record<MLStage, string> = {
  problem_definition: 'Problem',
  metrics: 'Metrics',
  data: 'Data',
  features: 'Features',
  model: 'Model',
  training: 'Training',
  deployment: 'Deploy',
  monitoring: 'Monitor',
};

const STAGE_COLORS: Record<MLStage, string> = {
  problem_definition: 'bg-blue-500',
  metrics: 'bg-purple-500',
  data: 'bg-green-500',
  features: 'bg-amber-500',
  model: 'bg-red-500',
  training: 'bg-orange-500',
  deployment: 'bg-cyan-500',
  monitoring: 'bg-pink-500',
};

interface GenerationProgressBarProps {
  isGenerating: boolean;
  completedStages: MLStage[];
  pendingStages: MLStage[];
  failedStages: MLStage[];
  onCancel: () => void;
  onRetryFailed: () => void;
}

export function GenerationProgressBar({
  isGenerating,
  completedStages,
  pendingStages,
  failedStages,
  onCancel,
  onRetryFailed,
}: GenerationProgressBarProps) {
  const completedSet = new Set(completedStages);
  const pendingSet = new Set(pendingStages);
  const failedSet = new Set(failedStages);
  const completedCount = completedStages.length;
  const hasFailures = failedStages.length > 0;

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Stage pills */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {STAGE_ORDER.map((stage) => {
            const isCompleted = completedSet.has(stage);
            const isPending = pendingSet.has(stage);
            const isFailed = failedSet.has(stage);

            let pillClass = 'bg-gray-100 text-gray-400';
            let icon = null;

            if (isCompleted) {
              pillClass = `${STAGE_COLORS[stage]} text-white`;
              icon = (
                <svg className="w-3 h-3 mr-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              );
            } else if (isPending) {
              pillClass = 'bg-blue-100 text-blue-700 border border-blue-300';
              icon = (
                <div className="w-3 h-3 mr-0.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              );
            } else if (isFailed) {
              pillClass = 'bg-red-100 text-red-700 border border-red-300';
              icon = (
                <svg className="w-3 h-3 mr-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              );
            }

            return (
              <div
                key={stage}
                className={`flex items-center px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${pillClass}`}
              >
                {icon}
                <span className="hidden sm:inline">{STAGE_LABELS[stage]}</span>
                <span className="sm:hidden">{STAGE_LABELS[stage].slice(0, 3)}</span>
              </div>
            );
          })}
        </div>

        {/* Status text */}
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {isGenerating
            ? `Generating... (${completedCount}/8)`
            : hasFailures
              ? `${failedStages.length} stage${failedStages.length > 1 ? 's' : ''} failed`
              : 'Complete'}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {hasFailures && !isGenerating && (
            <button
              onClick={onRetryFailed}
              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
              title="Retry failed stages"
            >
              Retry
            </button>
          )}
          {isGenerating && (
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Cancel generation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
