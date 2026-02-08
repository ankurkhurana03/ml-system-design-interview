import { describe, it, expect } from 'vitest';
import { validateTree } from '@/utils/validateTree';
import type { Problem, TreeNode } from '@/types/tree';

describe('validateTree', () => {
  describe('valid trees', () => {
    it('should return empty array for valid minimal tree (root → info → terminal)', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Let us start',
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

      const errors = validateTree(problem);
      expect(errors).toEqual([]);
    });

    it('should return empty array for valid tree with question node and 2 choices', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Let us start',
            next: 'q1',
          },
          {
            id: 'q1',
            stage: 'metrics',
            type: 'question',
            label: 'Question 1',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              {
                label: 'Option A',
                answer: 'I choose A',
                next: 'end',
              },
              {
                label: 'Option B',
                answer: 'I choose B',
                next: 'end',
              },
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

      const errors = validateTree(problem);
      expect(errors).toEqual([]);
    });
  });

  describe('basic structure validation', () => {
    it('should return error for null problem object', () => {
      const errors = validateTree(null as any);
      expect(errors).toContain('Problem object is null or undefined');
    });

    it('should return error for missing problem id', () => {
      const problem: Partial<Problem> = {
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [],
      };

      const errors = validateTree(problem as Problem);
      expect(errors).toContain('Problem must have a valid id');
    });

    it('should return error for missing problem title', () => {
      const problem: Partial<Problem> = {
        id: 'test',
        description: 'Test',
        root: 'start',
        nodes: [],
      };

      const errors = validateTree(problem as Problem);
      expect(errors).toContain('Problem must have a valid title');
    });

    it('should return error for missing problem description', () => {
      const problem: Partial<Problem> = {
        id: 'test',
        title: 'Test',
        root: 'start',
        nodes: [],
      };

      const errors = validateTree(problem as Problem);
      expect(errors).toContain('Problem must have a valid description');
    });

    it('should return error for missing root node id', () => {
      const problem: Partial<Problem> = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        nodes: [],
      };

      const errors = validateTree(problem as Problem);
      expect(errors).toContain('Problem must have a valid root node id');
    });

    it('should return error for empty nodes array', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        root: 'start',
        nodes: [],
      };

      const errors = validateTree(problem);
      expect(errors).toContain('Problem must have at least one node');
    });
  });

  describe('root node validation', () => {
    it('should return error when root node reference does not exist', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'nonexistent',
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

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Root node 'nonexistent' does not exist in nodes"
      );
    });
  });

  describe('duplicate node IDs', () => {
    it('should return error for duplicate node IDs', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
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
            id: 'start',
            stage: 'metrics',
            type: 'terminal',
            label: 'Duplicate',
            speaker: 'interviewer',
            content: 'Duplicate node',
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain('Duplicate node id: start');
    });
  });

  describe('node field validation', () => {
    it('should return error for node missing stage', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            type: 'terminal',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
          } as any,
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain("Node 'start': must have a stage");
    });

    it('should return error for node with invalid type', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'invalid' as any,
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': must have a valid type (info, question, terminal, or multi_select)"
      );
    });

    it('should return error for node missing label', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            speaker: 'interviewer',
            content: 'Start',
          } as any,
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain("Node 'start': must have a valid label");
    });

    it('should return error for node with invalid speaker', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'Start',
            speaker: 'invalid' as any,
            content: 'Start',
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': must have a valid speaker (interviewer or candidate)"
      );
    });

    it('should return error for node missing content', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'Start',
            speaker: 'interviewer',
          } as any,
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain("Node 'start': must have valid content");
    });
  });

  describe('info node validation', () => {
    it('should return error for info node missing next', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': info nodes must have a 'next' property"
      );
    });

    it('should return error for info node with broken next reference', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'nonexistent',
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': next reference 'nonexistent' does not exist"
      );
    });
  });

  describe('question node validation', () => {
    it('should return error for question node with only 1 choice', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              {
                label: 'Only option',
                answer: 'I choose this',
                next: 'end',
              },
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

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': question nodes must have at least 2 choices"
      );
    });

    it('should return error for question node with no choices', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [],
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': question nodes must have at least 2 choices"
      );
    });

    it('should return error for choice with broken next reference', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              {
                label: 'Option A',
                answer: 'I choose A',
                next: 'nonexistent',
              },
              {
                label: 'Option B',
                answer: 'I choose B',
                next: 'end',
              },
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

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': choice 0: next reference 'nonexistent' does not exist"
      );
    });

    it('should return error for choice missing label', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              {
                label: '',
                answer: 'I choose A',
                next: 'end',
              },
              {
                label: 'Option B',
                answer: 'I choose B',
                next: 'end',
              },
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

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': choice 0: must have a valid label"
      );
    });

    it('should return error for choice missing answer', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              {
                label: 'Option A',
                answer: '',
                next: 'end',
              },
              {
                label: 'Option B',
                answer: 'I choose B',
                next: 'end',
              },
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

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': choice 0: must have a valid answer"
      );
    });
  });

  describe('terminal node validation', () => {
    it('should return error for terminal node with next property', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
            next: 'somewhere',
          } as any,
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': terminal nodes should not have a 'next' property"
      );
    });

    it('should return error for terminal node with choices', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'End',
            speaker: 'interviewer',
            content: 'Done',
            choices: [
              {
                label: 'Option',
                answer: 'Answer',
                next: 'somewhere',
              },
            ],
          } as any,
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': terminal nodes should not have choices"
      );
    });
  });

  describe('orphan node detection', () => {
    it('should return error for orphan node unreachable from root', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
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
            stage: 'metrics',
            type: 'terminal',
            label: 'Orphan',
            speaker: 'interviewer',
            content: 'Never reached',
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain("Node 'orphan' is unreachable from root");
    });
  });

  describe('cycle detection', () => {
    it('should return warning for tree with a cycle', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
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

      const errors = validateTree(problem);
      expect(errors).toContain('Warning: Tree contains cycles');
    });

    it('should return warning for tree with cycle in question choices', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'question',
            label: 'Question',
            speaker: 'interviewer',
            content: 'Pick one',
            choices: [
              {
                label: 'Option A',
                answer: 'I choose A',
                next: 'start',
              },
              {
                label: 'Option B',
                answer: 'I choose B',
                next: 'end',
              },
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

      const errors = validateTree(problem);
      expect(errors).toContain('Warning: Tree contains cycles');
    });
  });

  describe('dialogue validation', () => {
    it('should accept valid dialogue array', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
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
            dialogue: [
              { speaker: 'interviewer', text: 'Hello' },
              { speaker: 'candidate', text: 'Hi there' },
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

      const errors = validateTree(problem);
      expect(errors).toEqual([]);
    });

    it('should return error for dialogue with invalid speaker', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            dialogue: [
              { speaker: 'invalid' as any, text: 'Hello' },
            ],
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': dialogue line 0: must have a valid speaker (interviewer or candidate)"
      );
    });

    it('should return error for dialogue with missing text', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            dialogue: [
              { speaker: 'interviewer', text: '' },
            ],
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain(
        "Node 'start': dialogue line 0: must have valid text"
      );
    });

    it('should return error for non-array dialogue', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'start',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'terminal',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            dialogue: 'not an array' as any,
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors).toContain("Node 'start': dialogue must be an array");
    });
  });

  describe('multiple errors', () => {
    it('should return multiple errors when multiple issues exist', () => {
      const problem: Problem = {
        id: 'test',
        title: 'Test Problem',
        description: 'A test problem',
        root: 'nonexistent',
        nodes: [
          {
            id: 'start',
            stage: 'problem_definition',
            type: 'info',
            label: 'Start',
            speaker: 'interviewer',
            content: 'Start',
            next: 'missing',
          },
          {
            id: 'orphan',
            stage: 'metrics',
            type: 'terminal',
            label: 'Orphan',
            speaker: 'interviewer',
            content: 'Orphan',
          },
        ],
      };

      const errors = validateTree(problem);
      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain(
        "Root node 'nonexistent' does not exist in nodes"
      );
      expect(errors).toContain(
        "Node 'start': next reference 'missing' does not exist"
      );
    });
  });
});
