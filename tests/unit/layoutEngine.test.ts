import { describe, it, expect } from 'vitest';
import { computeLayout } from '@/utils/layoutEngine';
import type { Node, Edge } from '@xyflow/react';

function makeNodes(ids: string[]): Node[] {
  return ids.map((id) => ({
    id,
    type: 'treeNode',
    data: {},
    position: { x: 0, y: 0 },
  }));
}

function makeEdges(pairs: [string, string][]): Edge[] {
  return pairs.map(([source, target], i) => ({
    id: `e${i}`,
    source,
    target,
  }));
}

describe('computeLayout', () => {
  it('returns positioned nodes and edges for a linear graph', () => {
    const nodes = makeNodes(['a', 'b', 'c']);
    const edges = makeEdges([['a', 'b'], ['b', 'c']]);
    const result = computeLayout(nodes, edges);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
  });

  it('assigns x and y positions to all nodes', () => {
    const nodes = makeNodes(['a', 'b']);
    const edges = makeEdges([['a', 'b']]);
    const result = computeLayout(nodes, edges);

    for (const node of result.nodes) {
      expect(typeof node.position.x).toBe('number');
      expect(typeof node.position.y).toBe('number');
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
  });

  it('places parent above child in TB direction', () => {
    const nodes = makeNodes(['parent', 'child']);
    const edges = makeEdges([['parent', 'child']]);
    const result = computeLayout(nodes, edges, { direction: 'TB' });

    const parentNode = result.nodes.find((n) => n.id === 'parent')!;
    const childNode = result.nodes.find((n) => n.id === 'child')!;
    expect(parentNode.position.y).toBeLessThan(childNode.position.y);
  });

  it('places parent left of child in LR direction', () => {
    const nodes = makeNodes(['parent', 'child']);
    const edges = makeEdges([['parent', 'child']]);
    const result = computeLayout(nodes, edges, { direction: 'LR' });

    const parentNode = result.nodes.find((n) => n.id === 'parent')!;
    const childNode = result.nodes.find((n) => n.id === 'child')!;
    expect(parentNode.position.x).toBeLessThan(childNode.position.x);
  });

  it('handles branching (question with 2 choices)', () => {
    const nodes = makeNodes(['q', 'a', 'b']);
    const edges = makeEdges([['q', 'a'], ['q', 'b']]);
    const result = computeLayout(nodes, edges);

    expect(result.nodes).toHaveLength(3);
    const qNode = result.nodes.find((n) => n.id === 'q')!;
    const aNode = result.nodes.find((n) => n.id === 'a')!;
    const bNode = result.nodes.find((n) => n.id === 'b')!;

    // Both children should be below parent
    expect(qNode.position.y).toBeLessThan(aNode.position.y);
    expect(qNode.position.y).toBeLessThan(bNode.position.y);

    // Children should be at same level
    expect(aNode.position.y).toBe(bNode.position.y);
  });

  it('handles a single node with no edges', () => {
    const nodes = makeNodes(['solo']);
    const result = computeLayout(nodes, []);

    expect(result.nodes).toHaveLength(1);
    expect(typeof result.nodes[0].position.x).toBe('number');
    expect(typeof result.nodes[0].position.y).toBe('number');
  });

  it('preserves node data and IDs', () => {
    const nodes: Node[] = [
      { id: 'n1', type: 'treeNode', data: { stage: 'metrics', label: 'Test' }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'treeNode', data: { stage: 'data' }, position: { x: 0, y: 0 } },
    ];
    const edges = makeEdges([['n1', 'n2']]);
    const result = computeLayout(nodes, edges);

    const n1 = result.nodes.find((n) => n.id === 'n1')!;
    expect(n1.data.stage).toBe('metrics');
    expect(n1.data.label).toBe('Test');
  });

  it('returns edges unchanged', () => {
    const nodes = makeNodes(['a', 'b']);
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b', type: 'treeEdge', label: 'choice' }];
    const result = computeLayout(nodes, edges);

    expect(result.edges).toEqual(edges);
  });

  it('respects custom nodeWidth and nodeHeight options', () => {
    const nodes = makeNodes(['a', 'b']);
    const edges = makeEdges([['a', 'b']]);

    const small = computeLayout(nodes, edges, { nodeWidth: 100, nodeHeight: 40 });
    const large = computeLayout(nodes, edges, { nodeWidth: 400, nodeHeight: 200 });

    // dagre centers nodes then subtracts half-width for top-left position
    // With different widths, the x offset from center differs
    // The y gap between nodes should differ due to different nodeHeight
    const smallGap = small.nodes[1].position.y - small.nodes[0].position.y;
    const largeGap = large.nodes[1].position.y - large.nodes[0].position.y;
    expect(largeGap).toBeGreaterThan(smallGap);
  });

  it('handles reconverging branches (diamond pattern)', () => {
    const nodes = makeNodes(['start', 'left', 'right', 'end']);
    const edges = makeEdges([
      ['start', 'left'],
      ['start', 'right'],
      ['left', 'end'],
      ['right', 'end'],
    ]);
    const result = computeLayout(nodes, edges);

    expect(result.nodes).toHaveLength(4);
    const startNode = result.nodes.find((n) => n.id === 'start')!;
    const endNode = result.nodes.find((n) => n.id === 'end')!;
    expect(startNode.position.y).toBeLessThan(endNode.position.y);
  });
});
