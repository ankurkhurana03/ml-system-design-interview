import { useEffect, useMemo, useCallback, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Controls,
  Background,
  MiniMap,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWizard } from '@/context/WizardContext';
import { problemToFlowElements } from '@/utils/treeTraversal';
import { computeLayout } from '@/utils/layoutEngine';
import { TreeNode } from './TreeNode';
import { TreeEdge } from './TreeEdge';
import { BranchEditModal } from '@/components/generator/BranchEditModal';
import type { TreeNode as TreeNodeType } from '@/types/tree';
import type { EditType } from '@/utils/mergeBranch';

// Define node and edge types outside component to avoid re-registration
const nodeTypes: NodeTypes = {
  treeNode: TreeNode,
};

const edgeTypes: EdgeTypes = {
  treeEdge: TreeEdge,
};

interface BranchEditTarget {
  nodeId: string;
  editType: EditType;
}

function TreeGraphInner() {
  const {
    problem,
    currentNodeId,
    path,
    visitedNodeIds,
    jumpToNode,
    selectChoice,
    nodeMap,
    updateProblem,
  } = useWizard();

  const { fitView, setCenter } = useReactFlow();
  const [branchEditTarget, setBranchEditTarget] = useState<BranchEditTarget | null>(null);

  // Handle branch edit request
  const handleBranchEdit = useCallback((nodeId: string, editType: EditType) => {
    setBranchEditTarget({ nodeId, editType });
  }, []);

  // Convert problem to ReactFlow elements and apply layout
  const { nodes, edges } = useMemo(() => {
    if (!problem) {
      return { nodes: [], edges: [] };
    }

    // Convert problem to flow elements
    const { nodes: rawNodes, edges: rawEdges } =
      problemToFlowElements(problem);

    // Compute layout
    const { nodes: layoutedNodes, edges: layoutedEdges } = computeLayout(
      rawNodes,
      rawEdges
    );

    // Decorate nodes with state
    const decoratedNodes = layoutedNodes.map((node) => {
      const treeNode = nodeMap.get(node.id);
      const isActive = node.id === currentNodeId;
      const isVisited = visitedNodeIds.has(node.id);
      const isOnPath = path.some((entry) => entry.nodeId === node.id);

      return {
        ...node,
        data: {
          ...treeNode,
          isActive,
          isVisited,
          isOnPath,
          onBranchEdit: handleBranchEdit,
        },
      };
    });

    // Build set of edges on the path for quick lookup
    const pathEdgeSet = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      const current = path[i];
      const next = path[i + 1];

      // Find the edge that connects these nodes
      const matchingEdge = rawEdges.find(
        (edge) => edge.source === current.nodeId && edge.target === next.nodeId
      );

      if (matchingEdge) {
        pathEdgeSet.add(matchingEdge.id);
      }
    }

    // Decorate edges with state
    const decoratedEdges = layoutedEdges.map((edge) => {
      const isOnPath = pathEdgeSet.has(edge.id);
      const choiceLabel = edge.data?.choiceLabel;

      return {
        ...edge,
        data: {
          ...edge.data,
          isOnPath,
          choiceLabel,
        },
      };
    });

    return { nodes: decoratedNodes, edges: decoratedEdges };
  }, [problem, currentNodeId, path, visitedNodeIds, nodeMap, handleBranchEdit]);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const treeNode = nodeMap.get(node.id) as TreeNodeType;
      if (!treeNode) return;

      // If it's a visited node, jump to it
      if (visitedNodeIds.has(node.id)) {
        jumpToNode(node.id);
        return;
      }

      // If it's an unvisited child of the current node
      const currentNode = nodeMap.get(currentNodeId) as TreeNodeType;
      if (!currentNode) return;

      // For question nodes, check if clicked node is a choice
      if (currentNode.type === 'question' && currentNode.choices) {
        const choiceIndex = currentNode.choices.findIndex(
          (choice) => choice.next === node.id
        );
        if (choiceIndex !== -1) {
          selectChoice(choiceIndex);
        }
      }
      // For multi_select nodes, clicking children in graph is not supported
      // (user must use the MultiSelectCard UI)
    },
    [nodeMap, visitedNodeIds, currentNodeId, jumpToNode, selectChoice]
  );

  // Auto-pan to current node when it changes
  useEffect(() => {
    if (!currentNodeId || nodes.length === 0) return;

    const currentNode = nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return;

    // Wait a tick for the layout to settle
    setTimeout(() => {
      setCenter(
        currentNode.position.x + 120, // Half of node width
        currentNode.position.y + 40, // Half of node height
        {
          zoom: 1,
          duration: 800,
        }
      );
    }, 100);
  }, [currentNodeId, nodes, setCenter]);

  // Fit view on initial load
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 500 });
      }, 50);
    }
  }, [nodes.length, fitView]);

  if (!problem) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No problem selected
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'treeEdge',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-gray-100 !border-gray-300"
        />
      </ReactFlow>

      {/* Branch Edit Modal */}
      {branchEditTarget && problem && (
        <BranchEditModal
          isOpen={true}
          onClose={() => setBranchEditTarget(null)}
          onBranchGenerated={(updatedProblem) => {
            updateProblem(updatedProblem);
            setBranchEditTarget(null);
          }}
          problem={problem}
          targetNodeId={branchEditTarget.nodeId}
          editType={branchEditTarget.editType}
        />
      )}
    </div>
  );
}

export function TreeGraph() {
  return (
    <ReactFlowProvider>
      <TreeGraphInner />
    </ReactFlowProvider>
  );
}
