import type { Problem, TreeNode, PathEntry } from '@/types/tree';
import type { Node, Edge } from '@xyflow/react';

/**
 * Build a map of nodeId -> TreeNode for O(1) lookups.
 *
 * @param problem - The Problem object
 * @returns Map of node IDs to TreeNode objects
 */
export function buildNodeMap(problem: Problem): Map<string, TreeNode> {
  const nodeMap = new Map<string, TreeNode>();

  for (const node of problem.nodes) {
    nodeMap.set(node.id, node);
  }

  return nodeMap;
}

/**
 * Get all children node IDs of a given node.
 * - For info nodes: returns [next]
 * - For question nodes: returns all choice.next values
 * - For terminal nodes: returns []
 *
 * @param node - The TreeNode to get children for
 * @returns Array of child node IDs
 */
export function getChildren(node: TreeNode): string[] {
  if (node.type === 'info' && node.next) {
    return [node.next];
  }

  if (node.type === 'question' && node.choices) {
    return node.choices.map((choice) => choice.next);
  }

  if (node.type === 'multi_select') {
    const targets = new Set<string>();
    if (node.routes) {
      for (const route of node.routes) {
        targets.add(route.next);
      }
    }
    if (node.defaultRoute) {
      targets.add(node.defaultRoute);
    }
    return Array.from(targets);
  }

  return [];
}

/**
 * Get all nodes reachable from a given node using BFS.
 *
 * @param problem - The Problem object
 * @param fromNodeId - The starting node ID
 * @returns Set of reachable node IDs (including the starting node)
 */
export function getReachableNodes(
  problem: Problem,
  fromNodeId: string
): Set<string> {
  const nodeMap = buildNodeMap(problem);
  const reachable = new Set<string>();
  const queue: string[] = [fromNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    reachable.add(currentId);

    const node = nodeMap.get(currentId);
    if (!node) continue;

    const children = getChildren(node);
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return reachable;
}

/**
 * Get all possible paths from root to any terminal node.
 *
 * @param problem - The Problem object
 * @returns Array of paths, where each path is an array of PathEntry objects
 */
export function getAllPaths(problem: Problem): PathEntry[][] {
  const nodeMap = buildNodeMap(problem);
  const allPaths: PathEntry[][] = [];

  function dfs(
    nodeId: string,
    currentPath: PathEntry[],
    visited: Set<string>
  ): void {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    // Detect cycle - stop if we've visited this node in the current path
    if (visited.has(nodeId)) {
      return;
    }

    const newVisited = new Set(visited);
    newVisited.add(nodeId);

    // If it's a terminal node, save the path
    if (node.type === 'terminal') {
      allPaths.push([...currentPath, { nodeId }]);
      return;
    }

    // For info nodes
    if (node.type === 'info' && node.next) {
      dfs(node.next, [...currentPath, { nodeId }], newVisited);
    }

    // For question nodes
    if (node.type === 'question' && node.choices) {
      for (let i = 0; i < node.choices.length; i++) {
        const choice = node.choices[i];
        dfs(
          choice.next,
          [
            ...currentPath,
            { nodeId, choiceIndex: i, choiceLabel: choice.label },
          ],
          newVisited
        );
      }
    }

    // For multi_select nodes - enumerate all unique route targets
    if (node.type === 'multi_select') {
      const targets = new Set<string>();
      if (node.routes) {
        for (const route of node.routes) {
          targets.add(route.next);
        }
      }
      if (node.defaultRoute) {
        targets.add(node.defaultRoute);
      }
      for (const target of targets) {
        dfs(target, [...currentPath, { nodeId }], newVisited);
      }
    }
  }

  dfs(problem.root, [], new Set());

  return allPaths;
}

/**
 * Get summaries of nodes reachable downstream from a given node.
 * Used to provide convergence context to the LLM when generating branches.
 *
 * @param problem - The Problem object
 * @param fromNodeId - The starting node ID (excluded from results)
 * @param maxDepth - Maximum BFS depth to explore (default 4)
 * @returns Array of node summaries with id, label, stage, and type
 */
export function getDownstreamSummaries(
  problem: Problem,
  fromNodeId: string,
  maxDepth: number = 4
): Array<{ id: string; label: string; stage: string; type: string }> {
  const nodeMap = buildNodeMap(problem);
  const summaries: Array<{ id: string; label: string; stage: string; type: string }> = [];
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [];

  // Seed queue with children of the starting node
  const startNode = nodeMap.get(fromNodeId);
  if (!startNode) return summaries;

  visited.add(fromNodeId);

  for (const childId of getChildren(startNode)) {
    if (!visited.has(childId)) {
      queue.push({ id: childId, depth: 1 });
    }
  }

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    const node = nodeMap.get(id);
    if (!node) continue;

    summaries.push({
      id: node.id,
      label: node.label,
      stage: node.stage,
      type: node.type,
    });

    if (depth < maxDepth) {
      for (const childId of getChildren(node)) {
        if (!visited.has(childId)) {
          queue.push({ id: childId, depth: depth + 1 });
        }
      }
    }
  }

  return summaries;
}

/**
 * Find a node by its ID.
 *
 * @param problem - The Problem object
 * @param nodeId - The node ID to find
 * @returns The TreeNode if found, undefined otherwise
 */
export function findNode(
  problem: Problem,
  nodeId: string
): TreeNode | undefined {
  return problem.nodes.find((node) => node.id === nodeId);
}

/**
 * Convert a Problem object to ReactFlow nodes and edges.
 *
 * @param problem - The Problem object
 * @returns Object containing ReactFlow nodes and edges
 */
export function problemToFlowElements(problem: Problem): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const node of problem.nodes) {
    // Create ReactFlow node
    nodes.push({
      id: node.id,
      type: 'treeNode',
      data: { ...node },
      position: { x: 0, y: 0 }, // Will be set by layout engine
    });

    // Create edges based on node type
    if (node.type === 'info' && node.next) {
      edges.push({
        id: `${node.id}-${node.next}`,
        source: node.id,
        target: node.next,
        type: 'treeEdge',
      });
    } else if (node.type === 'question' && node.choices) {
      for (let i = 0; i < node.choices.length; i++) {
        const choice = node.choices[i];
        edges.push({
          id: `${node.id}-${choice.next}-${i}`,
          source: node.id,
          target: choice.next,
          type: 'treeEdge',
          label: choice.label,
          data: {
            choiceIndex: i,
            choiceLabel: choice.label,
          },
        });
      }
    } else if (node.type === 'multi_select') {
      const targets = new Set<string>();
      if (node.routes) {
        for (const route of node.routes) {
          if (!targets.has(route.next)) {
            targets.add(route.next);
            edges.push({
              id: `${node.id}-${route.next}-route`,
              source: node.id,
              target: route.next,
              type: 'treeEdge',
              data: { choiceLabel: route.key },
            });
          }
        }
      }
      if (node.defaultRoute && !targets.has(node.defaultRoute)) {
        edges.push({
          id: `${node.id}-${node.defaultRoute}-default`,
          source: node.id,
          target: node.defaultRoute,
          type: 'treeEdge',
          label: 'default',
          data: { choiceLabel: 'default' },
        });
      }
    }
  }

  return { nodes, edges };
}
