import { describe, it, expect } from 'vitest';
import { scaffoldTree, buildContentFillingPrompt, mergeContentIntoScaffold } from '@/utils/scaffoldTree';
import { validateTree } from '@/utils/validateTree';
import type { ScaffoldProblem } from '@/utils/scaffoldTree';

describe('scaffoldTree', () => {
  it('generates a valid tree with 1 branch', () => {
    const scaffold = scaffoldTree({
      title: 'Fraud Detection',
      description: 'Build a fraud detection system',
      numBranches: 1,
    });

    expect(scaffold.id).toBe('fraud-detection');
    expect(scaffold.title).toBe('Fraud Detection');
    expect(scaffold.root).toBeTruthy();
    expect(scaffold.nodes.length).toBeGreaterThan(0);

    // Strip _placeholder for validation
    const problem = {
      ...scaffold,
      nodes: scaffold.nodes.map(({ _placeholder, ...rest }) => rest),
    };

    const errors = validateTree(problem);
    // Filter out "must have valid content" errors since we have placeholders
    const structuralErrors = errors.filter(
      (e) => !e.includes('[FILL:') && !e.includes('placeholder'),
    );
    expect(structuralErrors).toEqual([]);
  });

  it('generates a valid tree with 2 branches', () => {
    const scaffold = scaffoldTree({
      title: 'Recommendation System',
      description: 'Build a recommendation engine',
      numBranches: 2,
    });

    expect(scaffold.nodes.length).toBeGreaterThan(10);

    const problem = {
      ...scaffold,
      nodes: scaffold.nodes.map(({ _placeholder, ...rest }) => rest),
    };
    const errors = validateTree(problem);
    const structuralErrors = errors.filter(
      (e) => !e.includes('[FILL:') && !e.includes('placeholder'),
    );
    expect(structuralErrors).toEqual([]);
  });

  it('generates a valid tree with 3 branches', () => {
    const scaffold = scaffoldTree({
      title: 'Search Ranking',
      description: 'Build a search ranking system',
      numBranches: 3,
    });

    const problem = {
      ...scaffold,
      nodes: scaffold.nodes.map(({ _placeholder, ...rest }) => rest),
    };
    const errors = validateTree(problem);
    const structuralErrors = errors.filter(
      (e) => !e.includes('[FILL:') && !e.includes('placeholder'),
    );
    expect(structuralErrors).toEqual([]);
  });

  it('all terminal nodes are in monitoring stage', () => {
    const scaffold = scaffoldTree({
      title: 'Test Problem',
      description: 'Test',
      numBranches: 2,
    });

    const terminals = scaffold.nodes.filter((n) => n.type === 'terminal');
    expect(terminals.length).toBeGreaterThan(0);
    for (const t of terminals) {
      expect(t.stage).toBe('monitoring');
    }
  });

  it('all 8 stages appear in every root-to-terminal path', () => {
    const scaffold = scaffoldTree({
      title: 'Test Problem',
      description: 'Test',
      numBranches: 1,
    });

    const nodeMap = new Map(scaffold.nodes.map((n) => [n.id, n]));

    // BFS all paths from root to terminal
    const paths: string[][] = [];
    const queue: Array<{ nodeId: string; stages: string[] }> = [
      { nodeId: scaffold.root, stages: [] },
    ];

    while (queue.length > 0) {
      const { nodeId, stages } = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const newStages = [...stages, node.stage];

      if (node.type === 'terminal') {
        paths.push(newStages);
      } else if (node.type === 'info' && node.next) {
        queue.push({ nodeId: node.next, stages: newStages });
      } else if (node.type === 'question' && node.choices) {
        for (const c of node.choices) {
          queue.push({ nodeId: c.next, stages: newStages });
        }
      }
    }

    expect(paths.length).toBeGreaterThan(0);

    const REQUIRED_STAGES = [
      'problem_definition', 'metrics', 'data', 'features',
      'model', 'training', 'deployment', 'monitoring',
    ];

    for (const path of paths) {
      const uniqueStages = [...new Set(path)];
      for (const stage of REQUIRED_STAGES) {
        expect(uniqueStages).toContain(stage);
      }
    }
  });

  it('generates kebab-case IDs from title', () => {
    const scaffold = scaffoldTree({
      title: 'My Cool ML System!!!',
      description: 'Test',
    });
    expect(scaffold.id).toBe('my-cool-ml-system');
  });

  it('clamps numBranches to 1-3', () => {
    const s0 = scaffoldTree({ title: 'Test', description: 'T', numBranches: 0 });
    const s5 = scaffoldTree({ title: 'Test', description: 'T', numBranches: 5 });

    // numBranches=0 clamped to 1: at least 1 question node
    const questions0 = s0.nodes.filter((n) => n.type === 'question');
    expect(questions0.length).toBeGreaterThanOrEqual(1);

    // numBranches=5 clamped to 3: same structure as numBranches=3
    // (branches multiply: 1 + 2 + 4 = 7 question nodes for 3 branch levels)
    const s3 = scaffoldTree({ title: 'Test', description: 'T', numBranches: 3 });
    const questions5 = s5.nodes.filter((n) => n.type === 'question');
    const questions3 = s3.nodes.filter((n) => n.type === 'question');
    expect(questions5.length).toBe(questions3.length);
  });

  it('no duplicate node IDs', () => {
    const scaffold = scaffoldTree({
      title: 'Test',
      description: 'Test',
      numBranches: 3,
    });
    const ids = scaffold.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all next references point to existing nodes', () => {
    const scaffold = scaffoldTree({
      title: 'Test',
      description: 'Test',
      numBranches: 2,
    });
    const ids = new Set(scaffold.nodes.map((n) => n.id));

    for (const node of scaffold.nodes) {
      if (node.type === 'info' && node.next) {
        expect(ids.has(node.next)).toBe(true);
      }
      if (node.type === 'question' && node.choices) {
        for (const c of node.choices) {
          expect(ids.has(c.next)).toBe(true);
        }
      }
    }
  });
});

describe('buildContentFillingPrompt', () => {
  it('produces a prompt string with all node IDs', () => {
    const scaffold = scaffoldTree({
      title: 'Test',
      description: 'Test problem',
      numBranches: 1,
    });
    const prompt = buildContentFillingPrompt(scaffold, 'Test problem description');

    expect(prompt).toContain('Test problem description');
    for (const node of scaffold.nodes) {
      expect(prompt).toContain(node.id);
    }
  });

  it('includes question choices in the prompt', () => {
    const scaffold = scaffoldTree({
      title: 'Test',
      description: 'Test problem',
      numBranches: 1,
    });
    const prompt = buildContentFillingPrompt(scaffold, 'Test');

    // Should contain "question" type references
    expect(prompt).toContain('"type": "question"');
    expect(prompt).toContain('"choices"');
  });
});

describe('mergeContentIntoScaffold', () => {
  it('merges filled content while preserving structure', () => {
    const scaffold = scaffoldTree({
      title: 'Test',
      description: 'Test',
      numBranches: 1,
    });

    const filled = scaffold.nodes.map((n) => ({
      id: n.id,
      label: `Filled label for ${n.id}`,
      content: `Filled content for ${n.id}`,
      ...(n.type === 'question' && n.choices
        ? {
            choices: n.choices.map((c, i) => ({
              label: `Filled choice ${i}`,
              answer: `Filled answer ${i}`,
            })),
          }
        : {}),
    }));

    const result = mergeContentIntoScaffold(scaffold, filled);

    // Structure preserved
    expect(result.id).toBe(scaffold.id);
    expect(result.root).toBe(scaffold.root);
    expect(result.nodes.length).toBe(scaffold.nodes.length);

    // Content filled
    for (const node of result.nodes) {
      expect(node.label).toContain('Filled label');
      expect(node.content).toContain('Filled content');
    }

    // Next references preserved
    for (let i = 0; i < result.nodes.length; i++) {
      const original = scaffold.nodes[i];
      const merged = result.nodes[i];
      if (original.type === 'info') {
        expect(merged.next).toBe(original.next);
      }
      if (original.type === 'question' && original.choices) {
        for (let j = 0; j < original.choices.length; j++) {
          expect(merged.choices![j].next).toBe(original.choices[j].next);
        }
      }
    }

    // Should be a valid tree
    const errors = validateTree(result);
    expect(errors).toEqual([]);
  });

  it('handles missing content gracefully (keeps placeholders)', () => {
    const scaffold = scaffoldTree({
      title: 'Test',
      description: 'Test',
      numBranches: 1,
    });

    // Only fill first node
    const filled = [{ id: scaffold.nodes[0].id, label: 'Filled', content: 'Filled content' }];

    const result = mergeContentIntoScaffold(scaffold, filled);
    expect(result.nodes[0].label).toBe('Filled');
    // Other nodes keep placeholders
    expect(result.nodes[1].label).toContain('[FILL:');
  });

  it('output has no _placeholder field', () => {
    const scaffold = scaffoldTree({
      title: 'Test',
      description: 'Test',
      numBranches: 1,
    });

    const result = mergeContentIntoScaffold(scaffold, []);

    for (const node of result.nodes) {
      expect('_placeholder' in node).toBe(false);
    }
  });
});
