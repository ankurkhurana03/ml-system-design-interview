import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { StageIndicator } from './StageIndicator';

import type { MLStage } from '@/types/tree';

describe('StageIndicator', () => {
  const stages: MLStage[] = [
    'problem_definition',
    'metrics',
    'data',
    'features',
    'model',
    'training',
    'deployment',
    'monitoring',
  ];

  it('renders all stage labels', () => {
    const visitedStages = new Set<MLStage>();
    render(<StageIndicator currentStage="problem_definition" visitedStages={visitedStages} />);

    expect(screen.getByText('Problem')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });

  it('highlights the current stage', () => {
    const visitedStages = new Set<MLStage>();
    const { container } = render(
      <StageIndicator currentStage="data" visitedStages={visitedStages} />,
    );

    // The current stage should have a pulsing indicator
    const pulsingIndicators = container.querySelectorAll('.animate-pulse');
    expect(pulsingIndicators.length).toBeGreaterThan(0);
  });

  it('shows checkmarks for visited stages', () => {
    const visitedStages = new Set<MLStage>(['problem_definition', 'metrics']);
    const { container } = render(
      <StageIndicator currentStage="data" visitedStages={visitedStages} />,
    );

    // Should have checkmark SVGs for visited stages (not including current)
    const checkmarks = container.querySelectorAll('svg');
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it('renders with different current stages', () => {
    const visitedStages = new Set<MLStage>(['problem_definition']);

    stages.forEach((stage) => {
      const { unmount } = render(
        <StageIndicator currentStage={stage} visitedStages={visitedStages} />,
      );
      expect(screen.getByText('Problem')).toBeInTheDocument();
      unmount();
    });
  });

  it('handles empty visited stages', () => {
    const visitedStages = new Set<MLStage>();
    const { container } = render(
      <StageIndicator currentStage="problem_definition" visitedStages={visitedStages} />,
    );

    // Should not have any checkmark SVGs
    const checkmarks = container.querySelectorAll('path[d*="M5 13l4 4L19 7"]');
    expect(checkmarks.length).toBe(0);
  });

  it('handles all stages visited', () => {
    const visitedStages = new Set<MLStage>(stages);
    render(<StageIndicator currentStage="monitoring" visitedStages={visitedStages} />);

    // Should render without errors
    expect(screen.getByText('Monitor')).toBeInTheDocument();
  });
});
