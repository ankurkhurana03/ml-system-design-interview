import { describe, it, expect } from 'vitest';
import {
  buildNodeMap,
  getChildren,
  getReachableNodes,
  getDownstreamSummaries,
  getAllPaths,
  findNode,
  problemToFlowElements,
} from '@/utils/treeTraversal';
import type { Problem, TreeNode } from '@/types/tree';

describe('treeTraversal', () => {
  describe('buildNodeMap', () => {
    it('should create correct map from problem nodes', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'end',
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const nodeMap = buildNodeMap(problem);

      expect(nodeMap.size).toBe(2);
      expect(nodeMap.has('start')).toBe(true);
      expect(nodeMap.has('end')).toBe(true);
      expect(nodeMap.get('start')?.label).toBe('Start');
      expect(nodeMap.get('end')?.label).toBe('End');
    });

    it('should return empty map for problem with no nodes', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [],
      };

      const nodeMap = buildNodeMap(problem);
      expect(nodeMap.size).toBe(0);
    });
  });

  describe('getChildren', () => {
    it('should return [next] for info node', () => {
      const node: TreeNode = {
        id: 'info1',
        stage: 'problem_definition',
        type: 'info',
        label: 'Info',
        speaker: 'interviewer',
        content: 'Content',
        next: 'nextNode',
      };

      const children = getChildren(node);
      expect(children).toEqual(['nextNode']);
    });

    it('should return choice.nexts for question node', () => {
      const node: TreeNode = {
        id: 'q1',
        stage: 'metrics',
        type: 'question',
        label: 'Question',
        speaker: 'interviewer',
        content: 'Pick one',
        choices: [
          { label: 'A', answer: 'Chose A', next: 'optionA' },
          { label: 'B', answer: 'Chose B', next: 'optionB' },
          { label: 'C', answer: 'Chose C', next: 'optionC' },
        ],
      };

      const children = getChildren(node);
      expect(children).toEqual(['optionA', 'optionB', 'optionC']);
    });

    it('should return empty array for terminal node', () => {
      const node: TreeNode = {
        id: 'end',
        stage: 'monitoring',
        type: 'terminal',
        label: 'End',
        speaker: 'interviewer',
        content: 'Done',
      };

      const children = getChildren(node);
      expect(children).toEqual([]);
    });

    it('should return empty array for info node without next', () => {
      const node: TreeNode = {
        id: 'info1',
        stage: 'problem_definition',
        type: 'info',
        label: 'Info',
        speaker: 'interviewer',
        content: 'Content',
      };

      const children = getChildren(node);
      expect(children).toEqual([]);
    });

    it('should return empty array for question node without choices', () => {
      const node: TreeNode = {
        id: 'q1',
        stage: 'metrics',
        type: 'question',
        label: 'Question',
        speaker: 'interviewer',
        content: 'Pick one',
      };

      const children = getChildren(node);
      expect(children).toEqual([]);
    });
  });

  describe('getReachableNodes', () => {
    it('should return all reachable nodes from root', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'q1',
          },
          {
            id: 'q1',
            stage: 'metrics',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              { label: 'A', answer: 'Chose A', next: 'endA' },
              { label: 'B', answer: 'Chose B', next: 'endB' },
            ],
          },
          {
            id: 'endA',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End A',
            speaker: 'interviewer',
            content: 'Done A',
          },
          {
            id: 'endB',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End B',
            speaker: 'interviewer',
            content: 'Done B',
          },
        ],
      };

      const reachable = getReachableNodes(problem, 'start');

      expect(reachable.size).toBe(4);
      expect(reachable.has('start')).toBe(true);
      expect(reachable.has('q1')).toBe(true);
      expect(reachable.has('endA')).toBe(true);
      expect(reachable.has('endB')).toBe(true);
    });

    it('should not include truly orphaned nodes', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'end',
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
          {
            id: 'orphan',
            stage: 'data',
            type: 'terminal',
            label: 'Orphan',
            speaker: 'interviewer',
            content: 'Never reached',
          },
        ],
      };

      const reachable = getReachableNodes(problem, 'start');

      expect(reachable.size).toBe(2);
      expect(reachable.has('start')).toBe(true);
      expect(reachable.has('end')).toBe(true);
      expect(reachable.has('orphan')).toBe(false);
    });

    it('should return single node set for terminal node', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'end',
        nodes: [
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const reachable = getReachableNodes(problem, 'end');

      expect(reachable.size).toBe(1);
      expect(reachable.has('end')).toBe(true);
    });
  });

  describe('getDownstreamSummaries', () => {
    it('should return summaries for nodes reachable from a given node', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          { id: 'start', stage: 'problem_definition', type: 'info', label: 'Start', speaker: 'interviewer', content: 'Start', next: 'q1' },
          { id: 'q1', stage: 'metrics', type: 'question', label: 'Question', speaker: 'interviewer', content: 'Pick', choices: [
            { label: 'A', answer: 'A', next: 'endA' },
            { label: 'B', answer: 'B', next: 'endB' },
          ]},
          { id: 'endA', stage: 'monitoring', type: 'terminal', label: 'End A', speaker: 'interviewer', content: 'Done A' },
          { id: 'endB', stage: 'monitoring', type: 'terminal', label: 'End B', speaker: 'interviewer', content: 'Done B' },
        ],
      };

      const summaries = getDownstreamSummaries(problem, 'start');

      expect(summaries).toHaveLength(3);
      expect(summaries.map(s => s.id)).toContain('q1');
      expect(summaries.map(s => s.id)).toContain('endA');
      expect(summaries.map(s => s.id)).toContain('endB');
    });

    it('should exclude the starting node', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          { id: 'start', stage: 'problem_definition', type: 'info', label: 'Start', speaker: 'interviewer', content: 'Start', next: 'end' },
          { id: 'end', stage: 'monitoring', type: 'terminal', label: 'End', speaker: 'interviewer', content: 'Done' },
        ],
      };

      const summaries = getDownstreamSummaries(problem, 'start');

      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe('end');
    });

    it('should respect maxDepth limit', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'n1',
        nodes: [
          { id: 'n1', stage: 'problem_definition', type: 'info', label: 'N1', speaker: 'interviewer', content: 'C', next: 'n2' },
          { id: 'n2', stage: 'metrics', type: 'info', label: 'N2', speaker: 'interviewer', content: 'C', next: 'n3' },
          { id: 'n3', stage: 'data', type: 'info', label: 'N3', speaker: 'interviewer', content: 'C', next: 'n4' },
          { id: 'n4', stage: 'features', type: 'terminal', label: 'N4', speaker: 'interviewer', content: 'C' },
        ],
      };

      const summaries = getDownstreamSummaries(problem, 'n1', 2);

      expect(summaries).toHaveLength(2);
      expect(summaries.map(s => s.id)).toEqual(['n2', 'n3']);
    });

    it('should return empty array for terminal nodes', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'end',
        nodes: [
          { id: 'end', stage: 'monitoring', type: 'terminal', label: 'End', speaker: 'interviewer', content: 'Done' },
        ],
      };

      const summaries = getDownstreamSummaries(problem, 'end');
      expect(summaries).toHaveLength(0);
    });

    it('should handle cycles gracefully', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'a',
        nodes: [
          { id: 'a', stage: 'problem_definition', type: 'info', label: 'A', speaker: 'interviewer', content: 'C', next: 'b' },
          { id: 'b', stage: 'metrics', type: 'info', label: 'B', speaker: 'interviewer', content: 'C', next: 'a' },
        ],
      };

      const summaries = getDownstreamSummaries(problem, 'a');

      // Should only include b, not loop back to a
      expect(summaries).toHaveLength(1);
      expect(summaries[0].id).toBe('b');
    });

    it('should return correct summary fields', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          { id: 'start', stage: 'problem_definition', type: 'info', label: 'Start', speaker: 'interviewer', content: 'Start', next: 'end' },
          { id: 'end', stage: 'monitoring', type: 'terminal', label: 'End Node', speaker: 'interviewer', content: 'Done' },
        ],
      };

      const summaries = getDownstreamSummaries(problem, 'start');

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toEqual({
        id: 'end',
        label: 'End Node',
        stage: 'monitoring',
        type: 'terminal',
      });
    });
  });

  describe('getAllPaths', () => {
    it('should find all root-to-terminal paths', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'q1',
          },
          {
            id: 'q1',
            stage: 'metrics',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              { label: 'A', answer: 'Chose A', next: 'endA' },
              { label: 'B', answer: 'Chose B', next: 'endB' },
            ],
          },
          {
            id: 'endA',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End A',
            speaker: 'interviewer',
            content: 'Done A',
          },
          {
            id: 'endB',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End B',
            speaker: 'interviewer',
            content: 'Done B',
          },
        ],
      };

      const paths = getAllPaths(problem);

      expect(paths.length).toBe(2);

      // Check first path
      expect(paths[0].length).toBe(3);
      expect(paths[0][0].nodeId).toBe('start');
      expect(paths[0][1].nodeId).toBe('q1');
      expect(paths[0][2].nodeId).toBe('endA');

      // Check second path
      expect(paths[1].length).toBe(3);
      expect(paths[1][0].nodeId).toBe('start');
      expect(paths[1][1].nodeId).toBe('q1');
      expect(paths[1][2].nodeId).toBe('endB');
    });

    it('should correctly record choiceIndex and choiceLabel in PathEntry', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'q1',
        nodes: [
          {
            id: 'q1',
            stage: 'metrics',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              { label: 'Option A', answer: 'Chose A', next: 'end' },
              { label: 'Option B', answer: 'Chose B', next: 'end' },
            ],
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const paths = getAllPaths(problem);

      expect(paths.length).toBe(2);

      // First path should have choiceIndex 0
      expect(paths[0][0].choiceIndex).toBe(0);
      expect(paths[0][0].choiceLabel).toBe('Option A');

      // Second path should have choiceIndex 1
      expect(paths[1][0].choiceIndex).toBe(1);
      expect(paths[1][0].choiceLabel).toBe('Option B');
    });

    it('should return single path for linear tree', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'middle',
          },
          {
            id: 'middle',
            stage: 'metrics',
            type: 'info',
            label: 'Middle',
            speaker: 'interviewer',
            content: 'Middle',
            next: 'end',
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const paths = getAllPaths(problem);

      expect(paths.length).toBe(1);
      expect(paths[0].length).toBe(3);
      expect(paths[0].map(p => p.nodeId)).toEqual(['start', 'middle', 'end']);
    });

    it('should handle cycles by not entering infinite loop', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'middle',
          },
          {
            id: 'middle',
            stage: 'metrics',
            type: 'info',
            label: 'Middle',
            speaker: 'interviewer',
            content: 'Middle',
            next: 'start',
          },
        ],
      };

      const paths = getAllPaths(problem);

      // Should return empty array since there's no terminal node reachable
      expect(paths).toEqual([]);
    });
  });

  describe('findNode', () => {
    it('should find existing node by ID', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'end',
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const node = findNode(problem, 'start');

      expect(node).toBeDefined();
      expect(node?.id).toBe('start');
      expect(node?.label).toBe('Start');
    });

    it('should return undefined for non-existent ID', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
          },
        ],
      };

      const node = findNode(problem, 'nonexistent');

      expect(node).toBeUndefined();
    });
  });

  describe('problemToFlowElements', () => {
    it('should create correct number of nodes and edges', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'end',
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const { nodes, edges } = problemToFlowElements(problem);

      expect(nodes.length).toBe(2);
      expect(edges.length).toBe(1);
    });

    it('should create edges with correct source/target for info nodes', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'end',
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const { edges } = problemToFlowElements(problem);

      expect(edges.length).toBe(1);
      expect(edges[0].source).toBe('start');
      expect(edges[0].target).toBe('end');
      expect(edges[0].id).toBe('start-end');
      expect(edges[0].type).toBe('treeEdge');
    });

    it('should create edges with choiceLabel data for question nodes', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'q1',
        nodes: [
          {
            id: 'q1',
            stage: 'metrics',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              { label: 'Option A', answer: 'Chose A', next: 'endA' },
              { label: 'Option B', answer: 'Chose B', next: 'endB' },
            ],
          },
          {
            id: 'endA',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End A',
            speaker: 'interviewer',
            content: 'Done A',
          },
          {
            id: 'endB',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End B',
            speaker: 'interviewer',
            content: 'Done B',
          },
        ],
      };

      const { edges } = problemToFlowElements(problem);

      expect(edges.length).toBe(2);

      expect(edges[0].source).toBe('q1');
      expect(edges[0].target).toBe('endA');
      expect(edges[0].label).toBe('Option A');
      expect(edges[0].data?.choiceIndex).toBe(0);
      expect(edges[0].data?.choiceLabel).toBe('Option A');

      expect(edges[1].source).toBe('q1');
      expect(edges[1].target).toBe('endB');
      expect(edges[1].label).toBe('Option B');
      expect(edges[1].data?.choiceIndex).toBe(1);
      expect(edges[1].data?.choiceLabel).toBe('Option B');
    });

    it('should create nodes with correct data', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start content',
            next: 'end',
          },
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'candidate',
            content: 'Done',
          },
        ],
      };

      const { nodes } = problemToFlowElements(problem);

      expect(nodes[0].id).toBe('start');
      expect(nodes[0].type).toBe('treeNode');
      expect(nodes[0].data.id).toBe('start');
      expect(nodes[0].data.label).toBe('Start');
      expect(nodes[0].data.speaker).toBe('interviewer');
      expect(nodes[0].position).toEqual({ x: 0, y: 0 });

      expect(nodes[1].id).toBe('end');
      expect(nodes[1].type).toBe('treeNode');
      expect(nodes[1].data.id).toBe('end');
      expect(nodes[1].data.label).toBe('End');
      expect(nodes[1].data.speaker).toBe('candidate');
    });

    it('should not create edges for terminal nodes', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'end',
        nodes: [
          {
            id: 'end',
            stage: 'monitoring',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
          },
        ],
      };

      const { nodes, edges } = problemToFlowElements(problem);

      expect(nodes.length).toBe(1);
      expect(edges.length).toBe(0);
    });
  });
});
