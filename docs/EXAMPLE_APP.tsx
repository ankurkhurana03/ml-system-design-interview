// Example App.tsx showing how to use all the layout components together
// This file demonstrates the complete integration of Sidebar, SplitPane, and useProblems hook

import { useState } from 'react';
import { Sidebar, SplitPane } from '@/components/layout';
import { useProblems } from '@/hooks/useProblems';
import type { Problem } from '@/types/tree';

// Placeholder components for demonstration
function GraphView({ problem }: { problem: Problem }) {
  return (
    <div className="h-full bg-white p-8">
      <h2 className="text-2xl font-bold mb-4">Graph View</h2>
      <div className="border-2 border-dashed border-gray-300 rounded-lg h-96 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Graph visualization for:</p>
          <p className="text-lg font-semibold">{problem.title}</p>
          <p className="text-sm text-gray-400 mt-1">{problem.nodes.length} nodes</p>
        </div>
      </div>
    </div>
  );
}

function WizardView({ problem }: { problem: Problem }) {
  return (
    <div className="h-full bg-gray-50 p-8">
      <h2 className="text-2xl font-bold mb-4">Wizard View</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">{problem.title}</h3>
        <p className="text-gray-600 mb-4">{problem.description}</p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            <strong>Root Node:</strong> {problem.root}
          </p>
          <p className="text-sm text-gray-500">
            <strong>Total Nodes:</strong> {problem.nodes.length}
          </p>
          <p className="text-sm text-gray-500">
            <strong>Stages:</strong>{' '}
            {Array.from(new Set(problem.nodes.map(n => n.stage))).join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Problem Selected</h3>
        <p className="text-gray-500 mb-6">
          Select a problem from the sidebar or generate a new one
        </p>
        <div className="flex gap-3 justify-center">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Generate New Problem
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Browse Gallery
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4" />
        <p className="text-gray-600">Loading problems...</p>
      </div>
    </div>
  );
}

export default function App() {
  // Load problems using the hook
  const { problemMetas, loading, getProblemById, addProblem } = useProblems();

  // UI state
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Get the active problem
  const activeProblem = activeProblemId ? getProblemById(activeProblemId) : null;

  // Handler for generating new problems
  const handleGenerateNew = () => {
    // TODO: Implement AI problem generation
    console.log('Generate new problem');

    // Example: Add a new problem
    // const newProblem: Problem = {
    //   id: 'new-problem-' + Date.now(),
    //   title: 'New Problem',
    //   description: 'A newly generated problem',
    //   root: 'node-1',
    //   nodes: [],
    // };
    // addProblem(newProblem, 'draft');
    // setActiveProblemId(newProblem.id);
  };

  // Handler for selecting a problem
  const handleSelectProblem = (id: string) => {
    setActiveProblemId(id);
  };

  // Show loading state while problems are being loaded
  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        problems={problemMetas}
        activeProblemId={activeProblemId}
        onSelectProblem={handleSelectProblem}
        onGenerateNew={handleGenerateNew}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeProblem ? (
          <SplitPane
            left={<GraphView problem={activeProblem} />}
            right={<WizardView problem={activeProblem} />}
            defaultSplit={50}
            minLeft={30}
            minRight={30}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

// Additional styling notes:
// 1. Make sure your index.css has: @import "tailwindcss";
// 2. The layout is fully responsive and handles resize
// 3. All components are typed with TypeScript
// 4. Dark sidebar + light content area creates nice visual separation
// 5. Smooth transitions on all interactive elements

// Advanced usage examples:

// Example 1: Auto-select first problem on load
/*
useEffect(() => {
  if (problemMetas.length > 0 && !activeProblemId) {
    setActiveProblemId(problemMetas[0].id);
  }
}, [problemMetas, activeProblemId]);
*/

// Example 2: Save sidebar state to localStorage
/*
useEffect(() => {
  const saved = localStorage.getItem('sidebarCollapsed');
  if (saved) setSidebarCollapsed(JSON.parse(saved));
}, []);

useEffect(() => {
  localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
}, [sidebarCollapsed]);
*/

// Example 3: Save active problem to URL
/*
import { useEffect } from 'react';

useEffect(() => {
  if (activeProblemId) {
    window.history.pushState({}, '', `?problem=${activeProblemId}`);
  }
}, [activeProblemId]);

// On mount, read from URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const problemId = params.get('problem');
  if (problemId) setActiveProblemId(problemId);
}, []);
*/
