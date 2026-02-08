import type { Problem, TreeNode } from '@/types/tree';

/**
 * Validate a Problem object for structural integrity.
 *
 * @param problem - The Problem object to validate
 * @returns Array of error strings (empty array means valid)
 */
export function validateTree(problem: Problem): string[] {
  const errors: string[] = [];

  // Basic structure validation
  if (!problem) {
    return ['Problem object is null or undefined'];
  }

  if (!problem.id || typeof problem.id !== 'string') {
    errors.push('Problem must have a valid id');
  }

  if (!problem.title || typeof problem.title !== 'string') {
    errors.push('Problem must have a valid title');
  }

  if (!problem.description || typeof problem.description !== 'string') {
    errors.push('Problem must have a valid description');
  }

  if (!problem.root || typeof problem.root !== 'string') {
    errors.push('Problem must have a valid root node id');
  }

  if (!Array.isArray(problem.nodes) || problem.nodes.length === 0) {
    errors.push('Problem must have at least one node');
    return errors; // Can't continue validation without nodes
  }

  // Build node map for quick lookups
  const nodeMap = new Map<string, TreeNode>();
  const nodeIds = new Set<string>();

  // Check for duplicate node IDs
  for (const node of problem.nodes) {
    if (!node.id || typeof node.id !== 'string') {
      errors.push('All nodes must have a valid id');
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    } else {
      nodeIds.add(node.id);
      nodeMap.set(node.id, node);
    }
  }

  // Check root exists in nodes
  if (!nodeMap.has(problem.root)) {
    errors.push(`Root node '${problem.root}' does not exist in nodes`);
  }

  // Validate each node
  for (const node of problem.nodes) {
    const nodePrefix = `Node '${node.id}':`;

    // Validate node properties
    if (!node.stage) {
      errors.push(`${nodePrefix} must have a stage`);
    }

    if (!node.type || !['info', 'question', 'terminal', 'multi_select'].includes(node.type)) {
      errors.push(`${nodePrefix} must have a valid type (info, question, terminal, or multi_select)`);
    }

    if (!node.label || typeof node.label !== 'string') {
      errors.push(`${nodePrefix} must have a valid label`);
    }

    if (!node.speaker || !['interviewer', 'candidate'].includes(node.speaker)) {
      errors.push(`${nodePrefix} must have a valid speaker (interviewer or candidate)`);
    }

    if (!node.content || typeof node.content !== 'string') {
      errors.push(`${nodePrefix} must have valid content`);
    }

    // Optional dialogue validation
    if (node.dialogue !== undefined) {
      if (!Array.isArray(node.dialogue)) {
        errors.push(`${nodePrefix} dialogue must be an array`);
      } else {
        for (let i = 0; i < node.dialogue.length; i++) {
          const line = node.dialogue[i];
          if (!line.speaker || !['interviewer', 'candidate'].includes(line.speaker)) {
            errors.push(`${nodePrefix} dialogue line ${i}: must have a valid speaker (interviewer or candidate)`);
          }
          if (!line.text || typeof line.text !== 'string') {
            errors.push(`${nodePrefix} dialogue line ${i}: must have valid text`);
          }
        }
      }
    }

    // Type-specific validation
    if (node.type === 'info') {
      if (!node.next || typeof node.next !== 'string') {
        errors.push(`${nodePrefix} info nodes must have a 'next' property`);
      } else if (!nodeMap.has(node.next)) {
        errors.push(`${nodePrefix} next reference '${node.next}' does not exist`);
      }
    }

    if (node.type === 'question') {
      if (!Array.isArray(node.choices) || node.choices.length < 2) {
        errors.push(`${nodePrefix} question nodes must have at least 2 choices`);
      } else {
        for (let i = 0; i < node.choices.length; i++) {
          const choice = node.choices[i];
          const choicePrefix = `${nodePrefix} choice ${i}:`;

          if (!choice.label || typeof choice.label !== 'string') {
            errors.push(`${choicePrefix} must have a valid label`);
          }

          if (!choice.answer || typeof choice.answer !== 'string') {
            errors.push(`${choicePrefix} must have a valid answer`);
          }

          if (!choice.next || typeof choice.next !== 'string') {
            errors.push(`${choicePrefix} must have a valid next reference`);
          } else if (!nodeMap.has(choice.next)) {
            errors.push(`${choicePrefix} next reference '${choice.next}' does not exist`);
          }
        }
      }
    }

    if (node.type === 'terminal') {
      if (node.next) {
        errors.push(`${nodePrefix} terminal nodes should not have a 'next' property`);
      }
      if (node.choices && node.choices.length > 0) {
        errors.push(`${nodePrefix} terminal nodes should not have choices`);
      }
    }

    if (node.type === 'multi_select') {
      if (!node.dimensionGroups || node.dimensionGroups.length === 0) {
        errors.push(`${nodePrefix} multi_select nodes must have at least 1 dimension group`);
      } else {
        for (const group of node.dimensionGroups) {
          if (!group.dimensions || group.dimensions.length === 0) {
            errors.push(`${nodePrefix} dimension group '${group.id}' must have at least 1 dimension`);
          } else {
            for (const dim of group.dimensions) {
              if (!dim.options || dim.options.length < 2) {
                errors.push(`${nodePrefix} dimension '${dim.id}' must have at least 2 options`);
              }
            }
          }
        }
      }

      if (!node.defaultRoute && (!node.routes || node.routes.length === 0)) {
        errors.push(`${nodePrefix} multi_select nodes must have routes or a defaultRoute`);
      }

      if (node.routes) {
        for (const route of node.routes) {
          if (!nodeMap.has(route.next)) {
            errors.push(`${nodePrefix} route '${route.key}' next reference '${route.next}' does not exist`);
          }
        }
      }

      if (node.defaultRoute && !nodeMap.has(node.defaultRoute)) {
        errors.push(`${nodePrefix} defaultRoute '${node.defaultRoute}' does not exist`);
      }
    }
  }

  // Check for orphan nodes (unreachable from root)
  if (nodeMap.has(problem.root)) {
    const reachable = new Set<string>();
    const queue: string[] = [problem.root];
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

      if (node.type === 'info' && node.next) {
        queue.push(node.next);
      } else if (node.type === 'question' && node.choices) {
        for (const choice of node.choices) {
          if (choice.next) {
            queue.push(choice.next);
          }
        }
      } else if (node.type === 'multi_select') {
        if (node.routes) {
          for (const route of node.routes) {
            if (route.next) {
              queue.push(route.next);
            }
          }
        }
        if (node.defaultRoute) {
          queue.push(node.defaultRoute);
        }
      }
    }

    // Check for orphans
    for (const nodeId of nodeIds) {
      if (!reachable.has(nodeId)) {
        errors.push(`Node '${nodeId}' is unreachable from root`);
      }
    }
  }

  // Check for cycles (warning, but included as info)
  if (nodeMap.has(problem.root)) {
    const hasCycle = detectCycle(problem.root, nodeMap);
    if (hasCycle) {
      errors.push('Warning: Tree contains cycles');
    }
  }

  return errors;
}

/**
 * Detect if there's a cycle in the tree using DFS.
 */
function detectCycle(rootId: string, nodeMap: Map<string, TreeNode>): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (recStack.has(nodeId)) {
      return true; // Cycle detected
    }

    if (visited.has(nodeId)) {
      return false; // Already processed this path
    }

    visited.add(nodeId);
    recStack.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) {
      recStack.delete(nodeId);
      return false;
    }

    // Get children based on node type
    const children: string[] = [];
    if (node.type === 'info' && node.next) {
      children.push(node.next);
    } else if (node.type === 'question' && node.choices) {
      children.push(...node.choices.map(c => c.next));
    } else if (node.type === 'multi_select') {
      if (node.routes) {
        children.push(...node.routes.map(r => r.next));
      }
      if (node.defaultRoute) {
        children.push(node.defaultRoute);
      }
    }

    // Check all children
    for (const childId of children) {
      if (dfs(childId)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  return dfs(rootId);
}
