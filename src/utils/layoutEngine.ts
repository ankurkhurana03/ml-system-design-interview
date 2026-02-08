import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

export interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'TB',
  nodeWidth: 250,
  nodeHeight: 80,
  rankSep: 100,
  nodeSep: 60,
};

/**
 * Compute layout positions for ReactFlow nodes using dagre.
 *
 * @param nodes - Array of ReactFlow nodes
 * @param edges - Array of ReactFlow edges
 * @param options - Optional layout configuration
 * @returns Object containing positioned nodes and edges
 */
export function computeLayout(
  nodes: Node[],
  edges: Edge[],
  options?: LayoutOptions
): { nodes: Node[]; edges: Edge[] } {
  // Merge with default options
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create a new directed graph
  const graph = new dagre.graphlib.Graph();

  // Set graph options
  graph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
    marginx: 50,
    marginy: 50,
  });

  // Default edge configuration
  graph.setDefaultEdgeLabel(() => ({}));

  // Add nodes to the graph
  for (const node of nodes) {
    graph.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    });
  }

  // Add edges to the graph
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  // Run the layout algorithm
  dagre.layout(graph);

  // Map the dagre positions back to ReactFlow nodes
  const positionedNodes = nodes.map((node) => {
    const dagreNode = graph.node(node.id);

    // dagre returns center positions, but ReactFlow uses top-left positions
    // So we need to adjust by half the node dimensions
    const x = dagreNode.x - opts.nodeWidth / 2;
    const y = dagreNode.y - opts.nodeHeight / 2;

    return {
      ...node,
      position: { x, y },
    };
  });

  return {
    nodes: positionedNodes,
    edges,
  };
}
