import type { Problem, TreeNode } from '@/types/tree';
import { validateTree } from './validateTree';

export type EditType = 'add-choice' | 'add-decision' | 'continue';

interface MergeBranchOptions {
  existingProblem: Problem;
  newNodes: TreeNode[];
  targetNodeId: string;
  editType: EditType;
  choiceLabel?: string; // For add-choice: the label of the new choice
  choiceAnswer?: string; // For add-choice: the answer text
}

/**
 * Generate a unique ID for a new node with a timestamp-based prefix.
 */
function generateUniqueId(baseId: string, existingIds: Set<string>): string {
  const timestamp = Date.now();
  const prefix = `branch_${timestamp}_`;
  let id = `${prefix}${baseId}`;
  let counter = 1;

  while (existingIds.has(id)) {
    id = `${prefix}${baseId}_${counter}`;
    counter++;
  }

  return id;
}

/**
 * Remap node IDs in the new nodes array to avoid collisions.
 * Returns a map from old ID to new ID and the remapped nodes.
 */
function remapNodeIds(
  newNodes: TreeNode[],
  existingIds: Set<string>
): { idMap: Map<string, string>; remappedNodes: TreeNode[] } {
  const idMap = new Map<string, string>();

  // First pass: generate new IDs
  for (const node of newNodes) {
    const newId = generateUniqueId(node.id, existingIds);
    idMap.set(node.id, newId);
    existingIds.add(newId);
  }

  // Second pass: remap all references
  const remappedNodes: TreeNode[] = newNodes.map((node) => {
    const newNode: TreeNode = {
      ...node,
      id: idMap.get(node.id) || node.id,
    };

    // Remap next reference
    if (newNode.next && idMap.has(newNode.next)) {
      newNode.next = idMap.get(newNode.next);
    }

    // Remap choice references
    if (newNode.choices) {
      newNode.choices = newNode.choices.map((choice) => ({
        ...choice,
        next: idMap.has(choice.next) ? idMap.get(choice.next)! : choice.next,
      }));
    }

    return newNode;
  });

  return { idMap, remappedNodes };
}

/**
 * Validate that all "next" references in new nodes point to either
 * another new node or an existing node in the tree.
 * Returns an array of error messages (empty = valid).
 */
export function validateConvergenceRefs(
  newNodes: TreeNode[],
  existingIds: Set<string>,
  newNodeIds: Set<string>
): string[] {
  const errors: string[] = [];

  for (const node of newNodes) {
    // Check "next" field on info nodes
    if (node.next) {
      if (!newNodeIds.has(node.next) && !existingIds.has(node.next)) {
        errors.push(`Node "${node.id}" references non-existent next "${node.next}"`);
      }
    }

    // Check choice references on question nodes
    if (node.choices) {
      for (const choice of node.choices) {
        if (!newNodeIds.has(choice.next) && !existingIds.has(choice.next)) {
          errors.push(`Node "${node.id}" choice "${choice.label}" references non-existent next "${choice.next}"`);
        }
      }
    }

    // Check routes on multi_select nodes
    if (node.routes) {
      for (const route of node.routes) {
        if (!newNodeIds.has(route.next) && !existingIds.has(route.next)) {
          errors.push(`Node "${node.id}" route "${route.key}" references non-existent next "${route.next}"`);
        }
      }
    }

    if (node.defaultRoute) {
      if (!newNodeIds.has(node.defaultRoute) && !existingIds.has(node.defaultRoute)) {
        errors.push(`Node "${node.id}" defaultRoute references non-existent next "${node.defaultRoute}"`);
      }
    }
  }

  return errors;
}

/**
 * Merge new branch nodes into an existing problem.
 */
export function mergeBranch(options: MergeBranchOptions): Problem {
  const {
    existingProblem,
    newNodes,
    targetNodeId,
    editType,
    choiceLabel,
    choiceAnswer,
  } = options;

  // Validate input
  if (newNodes.length === 0) {
    throw new Error('No new nodes to merge');
  }

  // Build existing node ID set
  const existingIds = new Set(existingProblem.nodes.map((n) => n.id));

  // Find the target node
  const targetNode = existingProblem.nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) {
    throw new Error(`Target node '${targetNodeId}' not found`);
  }

  // Remap new node IDs to avoid collisions
  const { idMap, remappedNodes } = remapNodeIds(newNodes, existingIds);

  // The first new node's original ID
  const firstNewNodeOriginalId = newNodes[0].id;
  const firstNewNodeNewId = idMap.get(firstNewNodeOriginalId);

  if (!firstNewNodeNewId) {
    throw new Error('Failed to remap first new node ID');
  }

  // Create a copy of existing nodes
  let updatedNodes = [...existingProblem.nodes];

  // Handle different edit types
  switch (editType) {
    case 'add-choice': {
      // Target must be a question node
      if (targetNode.type !== 'question') {
        throw new Error('add-choice can only be used on question nodes');
      }

      if (!choiceLabel || !choiceAnswer) {
        throw new Error('choiceLabel and choiceAnswer are required for add-choice');
      }

      // Update the target node to add the new choice
      updatedNodes = updatedNodes.map((node) => {
        if (node.id === targetNodeId) {
          return {
            ...node,
            choices: [
              ...(node.choices || []),
              {
                label: choiceLabel,
                answer: choiceAnswer,
                next: firstNewNodeNewId,
              },
            ],
          };
        }
        return node;
      });

      break;
    }

    case 'add-decision': {
      // Target must be an info node
      if (targetNode.type !== 'info') {
        throw new Error('add-decision can only be used on info nodes');
      }

      if (!targetNode.next) {
        throw new Error('Target info node must have a next reference');
      }

      if (!choiceLabel || !choiceAnswer) {
        throw new Error('choiceLabel and choiceAnswer are required for add-decision');
      }

      // Convert the info node to a question node
      // The existing `next` becomes one choice, the new branch becomes another
      updatedNodes = updatedNodes.map((node) => {
        if (node.id === targetNodeId) {
          const existingNext = node.next!;
          return {
            ...node,
            type: 'question' as const,
            next: undefined,
            choices: [
              {
                label: 'Continue as before',
                answer: 'Let\'s proceed with the original approach.',
                next: existingNext,
              },
              {
                label: choiceLabel,
                answer: choiceAnswer,
                next: firstNewNodeNewId,
              },
            ],
          };
        }
        return node;
      });

      break;
    }

    case 'continue': {
      // Target must be a terminal node
      if (targetNode.type !== 'terminal') {
        throw new Error('continue can only be used on terminal nodes');
      }

      // Convert terminal to info node that points to the new branch
      updatedNodes = updatedNodes.map((node) => {
        if (node.id === targetNodeId) {
          return {
            ...node,
            type: 'info' as const,
            next: firstNewNodeNewId,
          };
        }
        return node;
      });

      break;
    }

    default:
      throw new Error(`Unknown edit type: ${editType}`);
  }

  // Merge the new nodes
  const mergedProblem: Problem = {
    ...existingProblem,
    nodes: [...updatedNodes, ...remappedNodes],
  };

  // Validate the merged tree
  const errors = validateTree(mergedProblem);
  if (errors.length > 0) {
    throw new Error(`Merged tree validation failed: ${errors.join(', ')}`);
  }

  return mergedProblem;
}
