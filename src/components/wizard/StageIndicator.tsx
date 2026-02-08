import type { MLStage } from '@/types/tree';

interface StageConfig {
  id: MLStage;
  label: string;
  color: string;
}

const STAGES: StageConfig[] = [
  { id: 'problem_definition', label: 'Problem', color: 'blue' },
  { id: 'metrics', label: 'Metrics', color: 'purple' },
  { id: 'data', label: 'Data', color: 'green' },
  { id: 'features', label: 'Features', color: 'amber' },
  { id: 'model', label: 'Model', color: 'red' },
  { id: 'training', label: 'Training', color: 'orange' },
  { id: 'deployment', label: 'Deploy', color: 'cyan' },
  { id: 'monitoring', label: 'Monitor', color: 'pink' },
];

interface StageIndicatorProps {
  currentStage: MLStage;
  visitedStages: Set<MLStage>;
}

export function StageIndicator({ currentStage, visitedStages }: StageIndicatorProps) {
  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {STAGES.map((stage, index) => {
          const isActive = stage.id === currentStage;
          const isVisited = visitedStages.has(stage.id);
          const isLast = index === STAGES.length - 1;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${
                      isActive
                        ? `bg-${stage.color}-500 ring-4 ring-${stage.color}-200 scale-110`
                        : isVisited
                        ? `bg-${stage.color}-500`
                        : 'bg-gray-200'
                    }
                  `}
                  style={{
                    backgroundColor: isActive || isVisited
                      ? `var(--color-${stage.color}-500, rgb(${getColorRGB(stage.color)}))`
                      : undefined,
                    ...(isActive && {
                      boxShadow: `0 0 0 4px rgba(${getColorRGB(stage.color)}, 0.2)`,
                    }),
                  }}
                >
                  {isVisited && !isActive && (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isActive && (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium whitespace-nowrap
                    ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-600'}
                  `}
                >
                  {stage.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`
                    flex-1 h-1 mx-2 rounded transition-all duration-300
                    ${isVisited ? `bg-${stage.color}-300` : 'bg-gray-200'}
                  `}
                  style={{
                    backgroundColor: isVisited
                      ? `rgba(${getColorRGB(stage.color)}, 0.4)`
                      : undefined,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to get RGB values for colors
function getColorRGB(color: string): string {
  const colorMap: Record<string, string> = {
    blue: '59, 130, 246',
    purple: '168, 85, 247',
    green: '34, 197, 94',
    amber: '251, 191, 36',
    red: '239, 68, 68',
    orange: '249, 115, 22',
    cyan: '6, 182, 212',
    pink: '236, 72, 153',
  };
  return colorMap[color] || '156, 163, 175';
}
