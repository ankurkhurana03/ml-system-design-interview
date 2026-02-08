import { describe, it, expect, beforeEach } from 'vitest';
import { parseYaml } from '@/utils/yamlLoader';
import { validateTree } from '@/utils/validateTree';
import { loadBuiltinProblems } from '@/data/problems/index';
import {
  getChildren,
  getReachableNodes,
  findNode,
  getAllPaths,
  buildNodeMap,
} from '@/utils/treeTraversal';
import type { Problem } from '@/types/tree';
import dynamicPricingYaml from '@/data/problems/dynamic-pricing.yaml?raw';

describe('Dynamic Pricing Tree', () => {
  let problem: Problem;

  beforeEach(() => {
    problem = parseYaml(dynamicPricingYaml);
  });

  describe('Parsing and metadata', () => {
    it('parses the YAML successfully', () => {
      expect(problem).toBeDefined();
      expect(problem.id).toBe('dynamic-pricing');
    });

    it('has correct title containing dynamic pricing', () => {
      expect(problem.title.toLowerCase()).toContain('dynamic pricing');
    });

    it('has a description longer than 20 chars', () => {
      expect(problem.description.length).toBeGreaterThan(20);
    });

    it('has 20+ nodes (comprehensive tree)', () => {
      expect(problem.nodes.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Validation', () => {
    it('passes validateTree with no errors', () => {
      const errors = validateTree(problem);
      expect(errors).toHaveLength(0);
    });

    it('has unique node IDs', () => {
      const ids = problem.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('root node exists in nodes array', () => {
      expect(problem.nodes.some((n) => n.id === problem.root)).toBe(true);
    });

    it('has no broken references', () => {
      const nodeIds = new Set(problem.nodes.map((n) => n.id));
      for (const node of problem.nodes) {
        if (node.type === 'info' && node.next) {
          expect(nodeIds.has(node.next)).toBe(true);
        }
        if (node.type === 'question' && node.choices) {
          for (const choice of node.choices) {
            expect(nodeIds.has(choice.next)).toBe(true);
          }
        }
      }
    });
  });

  describe('ML stages coverage', () => {
    it('covers all 8 ML stages', () => {
      const stages = new Set(problem.nodes.map((n) => n.stage));
      const required = [
        'problem_definition', 'metrics', 'data', 'features',
        'model', 'training', 'deployment', 'monitoring',
      ];
      for (const s of required) {
        expect(stages.has(s as any)).toBe(true);
      }
    });
  });

  describe('RL and SL paths', () => {
    it('has RL path nodes', () => {
      expect(problem.nodes.filter((n) => n.id.startsWith('rl_')).length).toBeGreaterThan(0);
    });

    it('has SL path nodes', () => {
      expect(problem.nodes.filter((n) => n.id.startsWith('sl_')).length).toBeGreaterThan(0);
    });

    it('has key RL nodes', () => {
      const ids = ['rl_metrics', 'rl_data', 'rl_model', 'rl_training', 'rl_deployment', 'rl_monitoring'];
      for (const id of ids) {
        expect(problem.nodes.some((n) => n.id === id)).toBe(true);
      }
    });

    it('has key SL nodes', () => {
      const ids = ['sl_metrics', 'sl_data', 'sl_features', 'sl_model', 'sl_training', 'sl_deployment', 'sl_monitoring'];
      for (const id of ids) {
        expect(problem.nodes.some((n) => n.id === id)).toBe(true);
      }
    });
  });

  describe('Node types', () => {
    it('has all three node types', () => {
      const types = new Set(problem.nodes.map((n) => n.type));
      expect(types.has('info')).toBe(true);
      expect(types.has('question')).toBe(true);
      expect(types.has('terminal')).toBe(true);
    });

    it('question nodes have at least 2 choices with answer and next', () => {
      for (const node of problem.nodes.filter((n) => n.type === 'question')) {
        expect(node.choices!.length).toBeGreaterThanOrEqual(2);
        for (const choice of node.choices!) {
          expect(choice.answer.length).toBeGreaterThan(0);
          expect(choice.next).toBeTruthy();
        }
      }
    });

    it('terminal nodes have no next or choices', () => {
      for (const node of problem.nodes.filter((n) => n.type === 'terminal')) {
        expect(node.next).toBeUndefined();
        expect(node.choices).toBeUndefined();
      }
    });

    it('all nodes have non-empty content, label, and valid speaker', () => {
      for (const node of problem.nodes) {
        expect(node.content.length).toBeGreaterThan(0);
        expect(node.label.length).toBeGreaterThan(0);
        expect(['interviewer', 'candidate']).toContain(node.speaker);
      }
    });
  });

  describe('Problem loading', () => {
    it('loadBuiltinProblems includes both flight-delay and dynamic-pricing', () => {
      const problems = loadBuiltinProblems();
      expect(problems.some((p) => p.id === 'flight-delay')).toBe(true);
      expect(problems.some((p) => p.id === 'dynamic-pricing')).toBe(true);
    });

    it('all builtin problems pass validation', () => {
      for (const p of loadBuiltinProblems()) {
        expect(validateTree(p)).toHaveLength(0);
      }
    });
  });

  describe('Tree traversal', () => {
    it('all nodes reachable from root', () => {
      const reachable = getReachableNodes(problem, problem.root);
      expect(reachable.size).toBe(problem.nodes.length);
    });

    it('finds multiple paths (RL + SL branches)', () => {
      const paths = getAllPaths(problem);
      expect(paths.length).toBeGreaterThan(1);
      for (const path of paths) {
        expect(path[0].nodeId).toBe(problem.root);
        const last = findNode(problem, path[path.length - 1].nodeId);
        expect(last?.type).toBe('terminal');
      }
    });

    it('buildNodeMap has all nodes', () => {
      expect(buildNodeMap(problem).size).toBe(problem.nodes.length);
    });

    it('getChildren works for all node types', () => {
      const info = problem.nodes.find((n) => n.type === 'info' && n.next)!;
      expect(getChildren(info)).toEqual([info.next]);

      const q = problem.nodes.find((n) => n.type === 'question')!;
      expect(getChildren(q).length).toBe(q.choices!.length);

      const t = problem.nodes.find((n) => n.type === 'terminal')!;
      expect(getChildren(t)).toEqual([]);
    });
  });
});
