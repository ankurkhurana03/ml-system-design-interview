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
    const isOnPath = (data as TreeEdgeData | undefined)?.isOnPath ?? false;
    const choiceLabel = (data as TreeEdgeData | undefined)?.choiceLabel;

    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

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
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className={`
                px-2 py-1 rounded text-xs font-medium
                transition-all duration-300
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
