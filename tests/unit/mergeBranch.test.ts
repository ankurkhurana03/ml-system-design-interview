import { describe, it, expect } from 'vitest';
import { mergeBranch, validateConvergenceRefs } from '@/utils/mergeBranch';
import type { Problem, TreeNode } from '@/types/tree';

function baseProblem(): Problem {
  return {
    id: 'test',
    title: 'Test',
    description: 'Test',
    root: 'start',
    nodes: [
      { id: 'start', stage: 'problem_definition', type: 'info', label: 'Start', speaker: 'interviewer', content: 'Hello', next: 'q1' },
      { id: 'q1', stage: 'metrics', type: 'question', label: 'Q1', speaker: 'interviewer', content: 'Pick', choices: [
        { label: 'A', answer: 'Ans A', next: 'end_a' },
        { label: 'B', answer: 'Ans B', next: 'end_b' },
      ]},
      { id: 'end_a', stage: 'monitoring', type: 'terminal', label: 'End A', speaker: 'interviewer', content: 'Done A' },
      { id: 'end_b', stage: 'monitoring', type: 'terminal', label: 'End B', speaker: 'interviewer', content: 'Done B' },
    ],
  };
}

function newBranchNodes(): TreeNode[] {
  return [
    { id: 'new1', stage: 'data', type: 'info', label: 'New 1', speaker: 'interviewer', content: 'New content', next: 'new_end' },
    { id: 'new_end', stage: 'monitoring', type: 'terminal', label: 'New End', speaker: 'interviewer', content: 'New done' },
  ];
}

describe('mergeBranch', () => {
  describe('add-choice', () => {
    it('adds a new choice to a question node', () => {
      const result = mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'q1',
        editType: 'add-choice',
        choiceLabel: 'C',
        choiceAnswer: 'Ans C',
      });

      const q1 = result.nodes.find((n) => n.id === 'q1')!;
      expect(q1.choices).toHaveLength(3);
      expect(q1.choices![2].label).toBe('C');
      expect(q1.choices![2].answer).toBe('Ans C');
    });

    it('new choice points to first remapped node', () => {
      const result = mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'q1',
        editType: 'add-choice',
        choiceLabel: 'C',
        choiceAnswer: 'Ans C',
      });

      const q1 = result.nodes.find((n) => n.id === 'q1')!;
      const newChoiceNext = q1.choices![2].next;
      expect(newChoiceNext).toContain('branch_');
      expect(result.nodes.some((n) => n.id === newChoiceNext)).toBe(true);
    });

    it('throws if target is not a question node', () => {
      expect(() => mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'start',
        editType: 'add-choice',
        choiceLabel: 'X',
        choiceAnswer: 'Y',
      })).toThrow('add-choice can only be used on question nodes');
    });

    it('throws if choiceLabel or choiceAnswer is missing', () => {
      expect(() => mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'q1',
        editType: 'add-choice',
      })).toThrow('choiceLabel and choiceAnswer are required');
    });
  });

  describe('add-decision', () => {
    it('converts info node to question node with 2 choices', () => {
      const result = mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'start',
        editType: 'add-decision',
        choiceLabel: 'Alt Path',
        choiceAnswer: 'Taking alt path',
      });

      const startNode = result.nodes.find((n) => n.id === 'start')!;
      expect(startNode.type).toBe('question');
      expect(startNode.choices).toHaveLength(2);
      expect(startNode.choices![0].label).toBe('Continue as before');
      expect(startNode.choices![0].next).toBe('q1');
      expect(startNode.choices![1].label).toBe('Alt Path');
      expect(startNode.next).toBeUndefined();
    });

    it('throws if target is not an info node', () => {
      expect(() => mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'q1',
        editType: 'add-decision',
        choiceLabel: 'X',
        choiceAnswer: 'Y',
      })).toThrow('add-decision can only be used on info nodes');
    });
  });

  describe('continue', () => {
    it('converts terminal node to info node pointing to new branch', () => {
      const result = mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'end_a',
        editType: 'continue',
      });

      const endA = result.nodes.find((n) => n.id === 'end_a')!;
      expect(endA.type).toBe('info');
      expect(endA.next).toContain('branch_');
      expect(result.nodes.some((n) => n.id === endA.next)).toBe(true);
    });

    it('throws if target is not a terminal node', () => {
      expect(() => mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'start',
        editType: 'continue',
      })).toThrow('continue can only be used on terminal nodes');
    });
  });

  describe('ID collision avoidance', () => {
    it('remaps new node IDs with branch_ prefix', () => {
      const result = mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'end_a',
        editType: 'continue',
      });

      // Original IDs should not exist in the merged tree (they get remapped)
      const remappedNodes = result.nodes.filter((n) => n.id.startsWith('branch_'));
      expect(remappedNodes.length).toBe(2);
    });

    it('remaps internal next references between new nodes', () => {
      const result = mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'end_a',
        editType: 'continue',
      });

      const branchInfo = result.nodes.find((n) => n.id.startsWith('branch_') && n.type === 'info');
      expect(branchInfo).toBeDefined();
      expect(branchInfo!.next).toContain('branch_');

      // The next should point to the remapped terminal node
      const target = result.nodes.find((n) => n.id === branchInfo!.next);
      expect(target).toBeDefined();
      expect(target!.type).toBe('terminal');
    });
  });

  describe('Validation', () => {
    it('merged tree passes validateTree', () => {
      const result = mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'end_a',
        editType: 'continue',
      });

      // If we got here without throwing, validation passed (mergeBranch validates internally)
      expect(result.nodes.length).toBe(6); // 4 original + 2 new
    });

    it('preserves original nodes unchanged', () => {
      const original = baseProblem();
      const result = mergeBranch({
        existingProblem: original,
        newNodes: newBranchNodes(),
        targetNodeId: 'end_b',
        editType: 'continue',
      });

      // end_a should be untouched
      const endA = result.nodes.find((n) => n.id === 'end_a')!;
      expect(endA.type).toBe('terminal');
    });
  });

  describe('Edge cases', () => {
    it('throws with empty new nodes', () => {
      expect(() => mergeBranch({
        existingProblem: baseProblem(),
        newNodes: [],
        targetNodeId: 'end_a',
        editType: 'continue',
      })).toThrow('No new nodes to merge');
    });

    it('throws with invalid target node ID', () => {
      expect(() => mergeBranch({
        existingProblem: baseProblem(),
        newNodes: newBranchNodes(),
        targetNodeId: 'nonexistent',
        editType: 'continue',
      })).toThrow("Target node 'nonexistent' not found");
    });
  });

  describe('validateConvergenceRefs', () => {
    it('returns no errors when all refs point to new or existing nodes', () => {
      const existingIds = new Set(['start', 'q1', 'end_a', 'end_b']);
      const newNodes: TreeNode[] = [
        { id: 'gen_1', stage: 'data', type: 'info', label: 'Gen 1', speaker: 'interviewer', content: 'C', next: 'gen_2' },
        { id: 'gen_2', stage: 'features', type: 'terminal', label: 'Gen 2', speaker: 'interviewer', content: 'C' },
      ];
      const newNodeIds = new Set(newNodes.map(n => n.id));

      const errors = validateConvergenceRefs(newNodes, existingIds, newNodeIds);
      expect(errors).toHaveLength(0);
    });

    it('returns errors for dangling references', () => {
      const existingIds = new Set(['start', 'q1']);
      const newNodes: TreeNode[] = [
        { id: 'gen_1', stage: 'data', type: 'info', label: 'Gen 1', speaker: 'interviewer', content: 'C', next: 'nonexistent' },
      ];
      const newNodeIds = new Set(newNodes.map(n => n.id));

      const errors = validateConvergenceRefs(newNodes, existingIds, newNodeIds);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('nonexistent');
    });

    it('allows convergence to existing nodes (DAG)', () => {
      const existingIds = new Set(['start', 'q1', 'end_a', 'end_b']);
      const newNodes: TreeNode[] = [
        { id: 'gen_1', stage: 'data', type: 'info', label: 'Gen 1', speaker: 'interviewer', content: 'C', next: 'end_a' },
      ];
      const newNodeIds = new Set(newNodes.map(n => n.id));

      const errors = validateConvergenceRefs(newNodes, existingIds, newNodeIds);
      expect(errors).toHaveLength(0);
    });

    it('validates choice references in question nodes', () => {
      const existingIds = new Set(['start']);
      const newNodes: TreeNode[] = [
        { id: 'gen_q', stage: 'metrics', type: 'question', label: 'Q', speaker: 'interviewer', content: 'Pick', choices: [
          { label: 'A', answer: 'A', next: 'gen_end' },
          { label: 'B', answer: 'B', next: 'missing_node' },
        ]},
        { id: 'gen_end', stage: 'monitoring', type: 'terminal', label: 'End', speaker: 'interviewer', content: 'Done' },
      ];
      const newNodeIds = new Set(newNodes.map(n => n.id));

      const errors = validateConvergenceRefs(newNodes, existingIds, newNodeIds);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('missing_node');
      expect(errors[0]).toContain('choice "B"');
    });
  });
});
