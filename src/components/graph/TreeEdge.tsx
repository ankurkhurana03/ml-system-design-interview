import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from '@xyflow/react';

export interface TreeEdgeData extends Record<string, unknown> {
  isOnPath: boolean;
  choiceLabel?: string;
  choiceIndex?: number;
  totalChoices?: number;
}

export const TreeEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  }: EdgeProps) => {
    const edgeData = data as TreeEdgeData | undefined;
    const isOnPath = edgeData?.isOnPath ?? false;
    const choiceLabel = edgeData?.choiceLabel;
    const choiceIndex = edgeData?.choiceIndex ?? 0;
    const totalChoices = edgeData?.totalChoices ?? 1;

    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    // Offset label along the edge to avoid overlap with sibling edges.
    // Place labels at different positions along the edge (30%-70% range)
    // instead of all at the midpoint (50%).
    const t = totalChoices > 1
      ? 0.3 + (choiceIndex / (totalChoices - 1)) * 0.4
      : 0.5;
    const offsetLabelX = sourceX + (targetX - sourceX) * t;
    const offsetLabelY = sourceY + (targetY - sourceY) * t;

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: isOnPath ? '#3b82f6' : '#d1d5db',
            strokeWidth: isOnPath ? 3 : 1.5,
            strokeDasharray: isOnPath ? '5,5' : 'none',
            animation: isOnPath ? 'dash 1s linear infinite' : 'none',
          }}
        />

        {choiceLabel && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${offsetLabelX}px,${offsetLabelY}px)`,
                pointerEvents: 'all',
                maxWidth: 180,
              }}
              title={choiceLabel}
              className={`
                px-2 py-1 rounded text-xs font-medium
                transition-all duration-300 truncate
                ${
                  isOnPath
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-300'
                }
              `}
            >
              {choiceLabel}
            </div>
          </EdgeLabelRenderer>
        )}

        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -10;
            }
          }
        `}</style>
      </>
    );
  },
);

TreeEdge.displayName = 'TreeEdge';
