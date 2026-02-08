import { describe, it, expect } from 'vitest';
import { validateTree } from '@/utils/validateTree';
import { parseYaml } from '@/utils/yamlLoader';
import { generateId, generateUniqueId } from '@/utils/generateId';

describe('Generator Utilities', () => {
  describe('generateId', () => {
    it('converts text to kebab-case', () => {
      expect(generateId('Fraud Detection System')).toBe('fraud-detection-system');
    });

    it('removes special characters', () => {
      expect(generateId('Build a Recommendation Engine!')).toBe('build-a-recommendation-engine');
    });

    it('handles multiple spaces', () => {
      expect(generateId('Multiple    Spaces   Here')).toBe('multiple-spaces-here');
    });

    it('limits length to 50 characters', () => {
      const longText = 'This is a very long text that exceeds fifty characters and should be truncated';
      const result = generateId(longText);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('removes leading/trailing hyphens', () => {
      expect(generateId('  -text-  ')).toBe('text');
    });
  });

  describe('generateUniqueId', () => {
    it('generates timestamp-based IDs with correct prefix', () => {
      const id = generateUniqueId('test', 'timestamp');
      expect(id).toMatch(/^test-\d+$/);
    });

    it('generates unique random IDs', () => {
      const id1 = generateUniqueId('test', 'random');
      const id2 = generateUniqueId('test', 'random');
      expect(id1).not.toBe(id2);
    });

    it('starts with the base ID', () => {
      const id = generateUniqueId('fraud-detection', 'timestamp');
      expect(id).toMatch(/^fraud-detection-\d+$/);
    });
  });

  describe('Tree Validation', () => {
    const validTree = {
      id: 'test-tree',
      title: 'Test Tree',
      description: 'A test decision tree',
      root: 'node1',
      nodes: [
        {
          id: 'node1',
          stage: 'problem_definition' as const,
          type: 'info' as const,
          label: 'Start',
          speaker: 'interviewer' as const,
          content: 'Welcome to the interview',
          next: 'node2',
        },
        {
          id: 'node2',
          stage: 'metrics' as const,
          type: 'question' as const,
          label: 'Metrics',
          speaker: 'interviewer' as const,
          content: 'What metrics would you use?',
          choices: [
            {
              label: 'Accuracy',
              answer: 'Accuracy is a good choice...',
              next: 'node3',
            },
            {
              label: 'Precision',
              answer: 'Precision is also important...',
              next: 'node3',
            },
          ],
        },
        {
          id: 'node3',
          stage: 'monitoring' as const,
          type: 'terminal' as const,
          label: 'End',
          speaker: 'interviewer' as const,
          content: 'Great work!',
        },
      ],
    };

    it('validates a correct tree', () => {
      const errors = validateTree(validTree);
      expect(errors).toHaveLength(0);
    });

    it('detects missing root node', () => {
      const invalidTree = {
        ...validTree,
        root: 'nonexistent',
      };
      const errors = validateTree(invalidTree);
      expect(errors.some(e => e.includes('Root node'))).toBe(true);
    });

    it('detects duplicate node IDs', () => {
      const invalidTree = {
        ...validTree,
        nodes: [
          ...validTree.nodes,
          { ...validTree.nodes[0] }, // Duplicate
        ],
      };
      const errors = validateTree(invalidTree);
      expect(errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('detects orphan nodes', () => {
      const invalidTree = {
        ...validTree,
        nodes: [
          ...validTree.nodes,
          {
            id: 'orphan',
            stage: 'data' as const,
            type: 'info' as const,
            label: 'Orphan',
            speaker: 'interviewer' as const,
            content: 'This node is unreachable',
            next: 'node3',
          },
        ],
      };
      const errors = validateTree(invalidTree);
      expect(errors.some(e => e.includes('unreachable'))).toBe(true);
    });

    it('detects invalid node references', () => {
      const invalidTree = {
        ...validTree,
        nodes: [
          {
            ...validTree.nodes[0],
            next: 'nonexistent',
          },
          ...validTree.nodes.slice(1),
        ],
      };
      const errors = validateTree(invalidTree);
      expect(errors.some(e => e.includes('does not exist'))).toBe(true);
    });

    it('requires at least 2 choices for question nodes', () => {
      const invalidTree = {
        ...validTree,
        nodes: [
          validTree.nodes[0],
          {
            ...validTree.nodes[1],
            choices: [validTree.nodes[1].choices![0]], // Only 1 choice
          },
          validTree.nodes[2],
        ],
      };
      const errors = validateTree(invalidTree);
      expect(errors.some(e => e.includes('at least 2 choices'))).toBe(true);
    });

    it('rejects terminal nodes with next property', () => {
      const invalidTree = {
        ...validTree,
        nodes: [
          ...validTree.nodes.slice(0, -1),
          {
            ...validTree.nodes[2],
            next: 'node1', // Terminal shouldn't have next
          },
        ],
      };
      const errors = validateTree(invalidTree);
      expect(errors.some(e => e.includes('terminal nodes should not'))).toBe(true);
    });
  });

  describe('YAML Parsing', () => {
    it('parses valid YAML', () => {
      const yaml = `
id: test
title: Test
description: Test description
root: node1
nodes:
  - id: node1
    stage: problem_definition
    type: terminal
    label: Test
    speaker: interviewer
    content: Test content
      `;
      const problem = parseYaml(yaml);
      expect(problem.id).toBe('test');
      expect(problem.nodes).toHaveLength(1);
    });

    it('throws on invalid YAML', () => {
      const invalidYaml = 'invalid: yaml: structure:';
      expect(() => parseYaml(invalidYaml)).toThrow();
    });

    it('throws on validation errors', () => {
      const yamlWithErrors = `
id: test
title: Test
description: Test
root: nonexistent
nodes:
  - id: node1
    stage: problem_definition
    type: terminal
    label: Test
    speaker: interviewer
    content: Test
      `;
      expect(() => parseYaml(yamlWithErrors)).toThrow('Invalid tree');
    });
  });

  describe('YAML Extraction', () => {
    it('extracts YAML from markdown code blocks', () => {
      const text = `
Here is the YAML:

\`\`\`yaml
id: test
title: Test
\`\`\`

That's it!
      `;
      const yamlMatch = text.match(/```ya?ml\n([\s\S]*?)\n```/);
      expect(yamlMatch).not.toBeNull();
      expect(yamlMatch![1]).toContain('id: test');
    });

    it('extracts YAML from generic code blocks', () => {
      const text = `
\`\`\`
id: test
title: Test
\`\`\`
      `;
      const codeMatch = text.match(/```\n([\s\S]*?)\n```/);
      expect(codeMatch).not.toBeNull();
      expect(codeMatch![1]).toContain('id: test');
    });
  });

  describe('Stage Coverage', () => {
    const allStages = [
      'problem_definition',
      'metrics',
      'data',
      'features',
      'model',
      'training',
      'deployment',
      'monitoring',
    ];

    it('checks for coverage of all stages', () => {
      const tree = {
        id: 'complete',
        title: 'Complete Tree',
        description: 'Has all stages',
        root: 'node1',
        nodes: allStages.map((stage, i) => ({
          id: `node${i + 1}`,
          stage: stage as any,
          type: i === allStages.length - 1 ? ('terminal' as const) : ('info' as const),
          label: stage,
          speaker: 'interviewer' as const,
          content: `Content for ${stage}`,
          ...(i < allStages.length - 1 ? { next: `node${i + 2}` } : {}),
        })),
      };

      const errors = validateTree(tree);
      expect(errors).toHaveLength(0);

      // Check stage coverage
      const stageGroups = tree.nodes.reduce((acc, node) => {
        if (!acc[node.stage]) {
          acc[node.stage] = [];
        }
        acc[node.stage].push(node);
        return acc;
      }, {} as Record<string, any[]>);

      allStages.forEach(stage => {
        expect(stageGroups[stage]).toBeDefined();
        expect(stageGroups[stage].length).toBeGreaterThan(0);
      });
    });
  });
});
