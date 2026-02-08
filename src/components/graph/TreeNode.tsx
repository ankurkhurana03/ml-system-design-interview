import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TreeNode as TreeNodeType, MLStage, NodeType } from '@/types/tree';
import type { EditType } from '@/utils/mergeBranch';

// Stage colors mapping
const STAGE_COLORS: Record<MLStage, string> = {
  problem_definition: '#3b82f6', // blue-500
  metrics: '#a855f7', // purple-500
  data: '#22c55e', // green-500
  features: '#f59e0b', // amber-500
  model: '#ef4444', // red-500
  training: '#f97316', // orange-500
  deployment: '#06b6d4', // cyan-500
  monitoring: '#ec4899', // pink-500
};

// Stage display names
const STAGE_LABELS: Record<MLStage, string> = {
  problem_definition: 'Problem',
  metrics: 'Metrics',
  data: 'Data',
  features: 'Features',
  model: 'Model',
  training: 'Training',
  deployment: 'Deployment',
  monitoring: 'Monitoring',
};

// Node type icons
const NODE_TYPE_ICONS: Record<NodeType, string> = {
  info: 'ℹ️',
  question: '❓',
  terminal: '✓',
  multi_select: '☑️',
};

interface TreeNodeData extends TreeNodeType {
  isActive: boolean; // Currently selected node
  isVisited: boolean; // In the visited set
  isOnPath: boolean; // On the current path
  onBranchEdit?: (nodeId: string, editType: EditType) => void;
}

interface TreeNodeProps {
  data: TreeNodeData;
}

export const TreeNode = memo(({ data }: TreeNodeProps) => {
  const stageColor = STAGE_COLORS[data.stage];
  const stageLabel = STAGE_LABELS[data.stage];
  const typeIcon = NODE_TYPE_ICONS[data.type];
  const [isHovered, setIsHovered] = useState(false);

  const getEditType = (): EditType | null => {
    if (data.type === 'question') return 'add-choice';
    if (data.type === 'info') return 'add-decision';
    if (data.type === 'terminal') return 'continue';
    return null;
  };

  const getEditLabel = (): string => {
    if (data.type === 'question') return 'Add Choice';
    if (data.type === 'info') return 'Add Decision';
    if (data.type === 'terminal') return 'Continue';
    return '';
  };

  const editType = getEditType();
  const editLabel = getEditLabel();

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editType && data.onBranchEdit) {
      data.onBranchEdit(data.id, editType);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top handle */}
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />

      {/* Node container */}
      <div
        className={`
          relative rounded-lg overflow-hidden
          transition-all duration-300
          ${
            data.isActive
              ? 'shadow-lg ring-2 ring-blue-500 ring-offset-2 animate-pulse-glow'
              : data.isVisited
                ? 'shadow-md'
                : 'shadow-sm opacity-60'
          }
        `}
        style={{
          width: '240px',
          minHeight: '72px',
        }}
      >
        {/* Left border with stage color */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: stageColor }}
        />

        {/* Node content */}
        <div
          className={`
            pl-4 pr-3 py-3
            ${
              data.isVisited && !data.isActive
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white'
            }
          `}
        >
          {/* Header with stage badge and type icon */}
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`
                text-xs font-medium px-2 py-0.5 rounded
                ${
                  data.isVisited && !data.isActive
                    ? 'bg-blue-400 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }
              `}
              style={
                !data.isVisited || data.isActive
                  ? { backgroundColor: `${stageColor}20`, color: stageColor }
                  : undefined
              }
            >
              {stageLabel}
            </span>
            <span className="text-lg leading-none">{typeIcon}</span>
          </div>

          {/* Node label */}
          <div
            className={`
              text-sm font-medium leading-tight
              ${
                data.isVisited && !data.isActive
                  ? 'text-white'
                  : 'text-gray-900 dark:text-white'
              }
            `}
          >
            {data.label}
          </div>

          {/* Node type indicator */}
          {data.type === 'question' && (
            <div
              className={`
                mt-1.5 text-xs
                ${
                  data.isVisited && !data.isActive
                    ? 'text-blue-100'
                    : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {data.choices?.length || 0} choices
            </div>
          )}
          {data.type === 'multi_select' && data.dimensionGroups && (
            <div
              className={`
                mt-1.5 text-xs
                ${
                  data.isVisited && !data.isActive
                    ? 'text-blue-100'
                    : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              {data.dimensionGroups.flatMap((g: { dimensions: unknown[] }) => g.dimensions).length} dimensions
            </div>
          )}
        </div>

        {/* Edit button (appears on hover) */}
        {isHovered && editType && data.onBranchEdit && (
          <button
            onClick={handleEditClick}
            className="absolute -top-2 -right-2 flex items-center space-x-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-10"
            title={editLabel}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>{editLabel}</span>
          </button>
        )}
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500"
      />

      {/* Pulse glow animation styles */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

TreeNode.displayName = 'TreeNode';
