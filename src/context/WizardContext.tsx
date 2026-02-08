import React, { createContext, useReducer, useMemo, type ReactNode } from 'react';
import type { Problem, TreeNode, PathEntry, DialogueLine } from '@/types/tree';

interface WizardContextState {
  problem: Problem | null;
  currentNodeId: string;
  path: PathEntry[];
  visitedNodeIds: Set<string>;
}

type WizardAction =
  | { type: 'SET_PROBLEM'; payload: Problem }
  | { type: 'UPDATE_PROBLEM'; payload: Problem }
  | { type: 'SELECT_CHOICE'; payload: { index: number } }
  | { type: 'SUBMIT_MULTI_SELECT'; payload: { selections: Record<string, string> } }
  | { type: 'ADVANCE' }
  | { type: 'GO_BACK' }
  | { type: 'RESET' }
  | { type: 'JUMP_TO_NODE'; payload: { nodeId: string } }
  | { type: 'APPEND_DIALOGUE'; payload: { nodeId: string; lines: DialogueLine[] } };

interface WizardContextValue extends WizardContextState {
  currentNode: TreeNode | null;
  nodeMap: Map<string, TreeNode>;
  selectChoice: (index: number) => void;
  submitMultiSelect: (selections: Record<string, string>) => void;
  advance: () => void;
  goBack: () => void;
  reset: () => void;
  jumpToNode: (nodeId: string) => void;
  setProblem: (problem: Problem) => void;
  updateProblem: (problem: Problem) => void;
  appendDialogue: (nodeId: string, lines: DialogueLine[]) => void;
}

const initialState: WizardContextState = {
  problem: null,
  currentNodeId: '',
  path: [],
  visitedNodeIds: new Set(),
};

function wizardReducer(state: WizardContextState, action: WizardAction): WizardContextState {
  switch (action.type) {
    case 'SET_PROBLEM': {
      const problem = action.payload;
      return {
        problem,
        currentNodeId: problem.root,
        path: [],
        visitedNodeIds: new Set([problem.root]),
      };
    }

    case 'UPDATE_PROBLEM': {
      const problem = action.payload;
      return {
        ...state,
        problem,
      };
    }

    case 'SELECT_CHOICE': {
      if (!state.problem) return state;

      const nodeMap = new Map<string, TreeNode>(state.problem.nodes.map(n => [n.id, n]));
      const currentNode = nodeMap.get(state.currentNodeId);

      if (!currentNode || !currentNode.choices || currentNode.type !== 'question') {
        return state;
      }

      const choice = currentNode.choices[action.payload.index];
      if (!choice) return state;

      const newVisited = new Set(state.visitedNodeIds);
      newVisited.add(choice.next);

      return {
        ...state,
        currentNodeId: choice.next,
        path: [
          ...state.path,
          {
            nodeId: state.currentNodeId,
            choiceIndex: action.payload.index,
            choiceLabel: choice.label,
          },
        ],
        visitedNodeIds: newVisited,
      };
    }

    case 'SUBMIT_MULTI_SELECT': {
      if (!state.problem) return state;

      const nodeMap = new Map<string, TreeNode>(state.problem.nodes.map(n => [n.id, n]));
      const currentNode = nodeMap.get(state.currentNodeId);

      if (!currentNode || currentNode.type !== 'multi_select' || !currentNode.dimensionGroups) {
        return state;
      }

      const { selections } = action.payload;

      // Build route key from selections in dimension order
      const allDimensions = currentNode.dimensionGroups.flatMap(g => g.dimensions);
      const routeKey = allDimensions.map(d => selections[d.id] || '').join('|');

      // Match against routes, fallback to defaultRoute
      let nextNodeId = currentNode.defaultRoute || '';
      if (currentNode.routes) {
        const matchedRoute = currentNode.routes.find(r => r.key === routeKey);
        if (matchedRoute) {
          nextNodeId = matchedRoute.next;
        }
      }

      if (!nextNodeId) return state;

      const newVisited = new Set(state.visitedNodeIds);
      newVisited.add(nextNodeId);

      return {
        ...state,
        currentNodeId: nextNodeId,
        path: [
          ...state.path,
          {
            nodeId: state.currentNodeId,
            multiSelectValues: selections,
          },
        ],
        visitedNodeIds: newVisited,
      };
    }

    case 'ADVANCE': {
      if (!state.problem) return state;

      const nodeMap = new Map<string, TreeNode>(state.problem.nodes.map(n => [n.id, n]));
      const currentNode = nodeMap.get(state.currentNodeId);

      if (!currentNode || !currentNode.next || currentNode.type !== 'info') {
        return state;
      }

      const newVisited = new Set(state.visitedNodeIds);
      newVisited.add(currentNode.next);

      return {
        ...state,
        currentNodeId: currentNode.next,
        path: [
          ...state.path,
          {
            nodeId: state.currentNodeId,
          },
        ],
        visitedNodeIds: newVisited,
      };
    }

    case 'GO_BACK': {
      if (state.path.length === 0) return state;

      const newPath = state.path.slice(0, -1);
      const previousEntry = newPath[newPath.length - 1];

      // If there's a previous entry, get the next node from that choice/advance
      // Otherwise, go back to root
      let previousNodeId = state.problem?.root || '';

      if (previousEntry && state.problem) {
        const nodeMap = new Map<string, TreeNode>(state.problem.nodes.map(n => [n.id, n]));
        const prevNode = nodeMap.get(previousEntry.nodeId);

        if (prevNode) {
          if (previousEntry.choiceIndex !== undefined && prevNode.choices) {
            previousNodeId = prevNode.choices[previousEntry.choiceIndex].next;
          } else if (previousEntry.multiSelectValues && prevNode.type === 'multi_select') {
            // Re-resolve the multi_select route
            const allDims = prevNode.dimensionGroups?.flatMap(g => g.dimensions) || [];
            const routeKey = allDims.map(d => previousEntry.multiSelectValues![d.id] || '').join('|');
            const matched = prevNode.routes?.find(r => r.key === routeKey);
            previousNodeId = matched?.next || prevNode.defaultRoute || '';
          } else if (prevNode.next) {
            previousNodeId = prevNode.next;
          }
        }
      }

      return {
        ...state,
        currentNodeId: previousNodeId,
        path: newPath,
      };
    }

    case 'RESET': {
      if (!state.problem) return state;

      return {
        ...state,
        currentNodeId: state.problem.root,
        path: [],
        visitedNodeIds: new Set([state.problem.root]),
      };
    }

    case 'JUMP_TO_NODE': {
      const { nodeId } = action.payload;

      // Only allow jumping to visited nodes
      if (!state.visitedNodeIds.has(nodeId)) {
        return state;
      }

      return {
        ...state,
        currentNodeId: nodeId,
      };
    }

    case 'APPEND_DIALOGUE': {
      if (!state.problem) return state;

      const { nodeId, lines } = action.payload;
      const updatedNodes = state.problem.nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            dialogue: [...(node.dialogue || []), ...lines],
          };
        }
        return node;
      });

      return {
        ...state,
        problem: { ...state.problem, nodes: updatedNodes },
      };
    }

    default:
      return state;
  }
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const nodeMap = useMemo(() => {
    if (!state.problem) return new Map<string, TreeNode>();
    return new Map<string, TreeNode>(state.problem.nodes.map(node => [node.id, node]));
  }, [state.problem]);

  const currentNode = useMemo(() => {
    return nodeMap.get(state.currentNodeId) || null;
  }, [nodeMap, state.currentNodeId]);

  const value: WizardContextValue = {
    ...state,
    currentNode,
    nodeMap,
    selectChoice: (index: number) => dispatch({ type: 'SELECT_CHOICE', payload: { index } }),
    submitMultiSelect: (selections: Record<string, string>) =>
      dispatch({ type: 'SUBMIT_MULTI_SELECT', payload: { selections } }),
    advance: () => dispatch({ type: 'ADVANCE' }),
    goBack: () => dispatch({ type: 'GO_BACK' }),
    reset: () => dispatch({ type: 'RESET' }),
    jumpToNode: (nodeId: string) => dispatch({ type: 'JUMP_TO_NODE', payload: { nodeId } }),
    setProblem: (problem: Problem) => dispatch({ type: 'SET_PROBLEM', payload: problem }),
    updateProblem: (problem: Problem) => dispatch({ type: 'UPDATE_PROBLEM', payload: problem }),
    appendDialogue: (nodeId: string, lines: DialogueLine[]) =>
      dispatch({ type: 'APPEND_DIALOGUE', payload: { nodeId, lines } }),
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const context = React.useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

export { WizardContext };
