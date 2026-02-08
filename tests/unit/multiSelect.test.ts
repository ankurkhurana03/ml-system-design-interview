import { describe, it, expect } from 'vitest';
import { validateTree } from '@/utils/validateTree';
import { getChildren, problemToFlowElements, getAllPaths } from '@/utils/treeTraversal';
import type { Problem, TreeNode } from '@/types/tree';

function createMultiSelectProblem(overrides?: Partial<Problem>): Problem {
  return {
    id: 'test-ms',
    title: 'Multi-Select Test',
    description: 'Test problem with multi_select node',
    root: 'start',
    nodes: [
      {
        id: 'start',
        stage: 'problem_definition',
        type: 'info',
        label: 'Start',
        speaker: 'interviewer',
        content: 'Welcome',
        next: 'clarify',
      },
      {
        id: 'clarify',
        stage: 'problem_definition',
        type: 'multi_select',
        label: 'Clarify',
        speaker: 'interviewer',
        content: 'Select dimensions',
        dimensionGroups: [
          {
            id: 'reqs',
            label: 'Requirements',
            dimensions: [
              {
                id: 'latency',
                label: 'Latency',
                options: [
                  { value: 'real_time', label: 'Real-time' },
                  { value: 'batch', label: 'Batch' },
                ],
              },
              {
                id: 'scale',
                label: 'Scale',
                options: [
                  { value: 'small', label: 'Small' },
                  { value: 'large', label: 'Large' },
                ],
              },
            ],
          },
        ],
        routes: [
          { key: 'real_time|large', next: 'path_a' },
          { key: 'batch|small', next: 'path_b' },
        ],
        defaultRoute: 'path_b',
      },
      {
        id: 'path_a',
        stage: 'metrics',
        type: 'terminal',
        label: 'Path A',
        speaker: 'interviewer',
        content: 'End A',
      },
      {
        id: 'path_b',
        stage: 'metrics',
        type: 'terminal',
        label: 'Path B',
        speaker: 'interviewer',
        content: 'End B',
      },
    ],
    ...overrides,
  };
}

describe('Multi-Select Node', () => {
  describe('validateTree', () => {
    it('should accept valid multi_select node', () => {
      const problem = createMultiSelectProblem();
      const errors = validateTree(problem);
      expect(errors).toEqual([]);
    });

    it('should reject multi_select without dimensionGroups', () => {
      const problem = createMultiSelectProblem();
      const node = problem.nodes.find(n => n.id === 'clarify')!;
      delete (node as any).dimensionGroups;
      const errors = validateTree(problem);
      expect(errors.some(e => e.includes('must have at least 1 dimension group'))).toBe(true);
    });

    it('should reject dimension with fewer than 2 options', () => {
      const problem = createMultiSelectProblem();
      const node = problem.nodes.find(n => n.id === 'clarify')!;
      node.dimensionGroups![0].dimensions[0].options = [{ value: 'only', label: 'Only' }];
      const errors = validateTree(problem);
      expect(errors.some(e => e.includes('must have at least 2 options'))).toBe(true);
    });

    it('should reject route with invalid next reference', () => {
      const problem = createMultiSelectProblem();
      const node = problem.nodes.find(n => n.id === 'clarify')!;
      node.routes![0].next = 'nonexistent';
      const errors = validateTree(problem);
      expect(errors.some(e => e.includes('does not exist'))).toBe(true);
    });

    it('should reject invalid defaultRoute', () => {
      const problem = createMultiSelectProblem();
      const node = problem.nodes.find(n => n.id === 'clarify')!;
      node.defaultRoute = 'nonexistent';
      const errors = validateTree(problem);
      expect(errors.some(e => e.includes('defaultRoute'))).toBe(true);
    });

    it('should not flag multi_select targets as unreachable', () => {
      const problem = createMultiSelectProblem();
      const errors = validateTree(problem);
      expect(errors.filter(e => e.includes('unreachable'))).toEqual([]);
    });
  });

  describe('getChildren', () => {
    it('should return all unique route targets and defaultRoute', () => {
      const node: TreeNode = {
        id: 'ms',
        stage: 'problem_definition',
        type: 'multi_select',
        label: 'MS',
        speaker: 'interviewer',
        content: 'Content',
        dimensionGroups: [],
        routes: [
          { key: 'a|b', next: 'target1' },
          { key: 'c|d', next: 'target2' },
          { key: 'e|f', next: 'target1' }, // duplicate target
        ],
        defaultRoute: 'target3',
      };
      const children = getChildren(node);
      expect(children).toContain('target1');
      expect(children).toContain('target2');
      expect(children).toContain('target3');
      // Should be unique
      expect(children.filter(c => c === 'target1').length).toBe(1);
    });

    it('should return defaultRoute when no routes', () => {
      const node: TreeNode = {
        id: 'ms',
        stage: 'problem_definition',
        type: 'multi_select',
        label: 'MS',
        speaker: 'interviewer',
        content: 'Content',
        dimensionGroups: [],
        defaultRoute: 'fallback',
      };
      const children = getChildren(node);
      expect(children).toEqual(['fallback']);
    });
  });

  describe('problemToFlowElements', () => {
    it('should create edges for multi_select routes', () => {
      const problem = createMultiSelectProblem();
      const { edges } = problemToFlowElements(problem);
      const msEdges = edges.filter(e => e.source === 'clarify');
      expect(msEdges.length).toBeGreaterThanOrEqual(2);
      expect(msEdges.some(e => e.target === 'path_a')).toBe(true);
      expect(msEdges.some(e => e.target === 'path_b')).toBe(true);
    });
  });

  describe('getAllPaths', () => {
    it('should find paths through multi_select nodes', () => {
      const problem = createMultiSelectProblem();
      const paths = getAllPaths(problem);
      expect(paths.length).toBeGreaterThanOrEqual(2);
      // Every path should start at 'start' and end at a terminal
      for (const path of paths) {
        expect(path[0].nodeId).toBe('start');
        const lastNodeId = path[path.length - 1].nodeId;
        expect(['path_a', 'path_b']).toContain(lastNodeId);
      }
    });
  });

  describe('SUBMIT_MULTI_SELECT reducer logic', () => {
    it('should build correct route key from selections in dimension order', () => {
      const dimensions = [
        { id: 'latency', label: 'L', options: [{ value: 'rt', label: 'RT' }, { value: 'b', label: 'B' }] },
        { id: 'scale', label: 'S', options: [{ value: 'sm', label: 'SM' }, { value: 'lg', label: 'LG' }] },
      ];
      const selections = { scale: 'lg', latency: 'rt' };
      const routeKey = dimensions.map(d => selections[d.id as keyof typeof selections] || '').join('|');
      expect(routeKey).toBe('rt|lg');
    });

    it('should match route key to find correct next node', () => {
      const routes = [
        { key: 'rt|lg', next: 'target_a' },
        { key: 'b|sm', next: 'target_b' },
      ];
      const routeKey = 'rt|lg';
      const matched = routes.find(r => r.key === routeKey);
      expect(matched?.next).toBe('target_a');
    });

    it('should fallback to defaultRoute when no match', () => {
      const routes = [
        { key: 'rt|lg', next: 'target_a' },
      ];
      const routeKey = 'b|sm';
      const matched = routes.find(r => r.key === routeKey);
      const defaultRoute = 'fallback';
      const nextNode = matched?.next || defaultRoute;
      expect(nextNode).toBe('fallback');
    });
  });
});
