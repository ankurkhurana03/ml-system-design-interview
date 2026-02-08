# Layout Components Usage Guide

This document describes how to use the layout components for the ML System Design Interview tool.

## Components Created

### 1. Sidebar (`src/components/layout/Sidebar.tsx`)

A collapsible sidebar for problem navigation.

**Features:**
- Displays list of problems grouped by source (Built-in, Gallery, My Drafts)
- Search/filter functionality
- Difficulty badges (beginner/intermediate/advanced)
- Tags display
- Active problem highlighting with blue background
- "Generate New Problem" button at bottom
- Collapse/expand functionality (280px → 48px)
- Dark theme (slate-900 background)

**Props:**
```typescript
interface SidebarProps {
  problems: ProblemMeta[];
  activeProblemId: string | null;
  onSelectProblem: (id: string) => void;
  onGenerateNew: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}
```

**Usage Example:**
```tsx
import { Sidebar } from '@/components/layout';
import { useProblems } from '@/hooks/useProblems';

function App() {
  const { problemMetas } = useProblems();
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Sidebar
      problems={problemMetas}
      activeProblemId={activeProblemId}
      onSelectProblem={setActiveProblemId}
      onGenerateNew={() => console.log('Generate new problem')}
      isCollapsed={sidebarCollapsed}
      onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
    />
  );
}
```

### 2. SplitPane (`src/components/layout/SplitPane.tsx`)

A resizable split pane with three view modes.

**Features:**
- Three view modes: Graph Only, Split, Wizard Only
- Draggable divider in split mode
- Minimum size constraints (25% by default)
- Smooth transitions
- View mode toggle buttons in toolbar
- 4px divider that highlights on hover (gray → blue)

**Props:**
```typescript
interface SplitPaneProps {
  left: React.ReactNode;      // Graph component
  right: React.ReactNode;     // Wizard component
  defaultSplit?: number;      // default: 50 (percentage)
  minLeft?: number;           // default: 25 (percentage)
  minRight?: number;          // default: 25 (percentage)
}
```

**Usage Example:**
```tsx
import { SplitPane } from '@/components/layout';

function MainView() {
  return (
    <SplitPane
      left={<GraphView />}
      right={<WizardView />}
      defaultSplit={50}
      minLeft={30}
      minRight={30}
    />
  );
}
```

### 3. useProblems Hook (`src/hooks/useProblems.ts`)

A hook to manage problem loading and state.

**Features:**
- Loads built-in problems on mount
- Provides methods to get problem by ID
- Add new problems (gallery or draft)
- Loading state management

**Returns:**
```typescript
{
  problems: Problem[];
  problemMetas: ProblemMeta[];
  loading: boolean;
  getProblemById: (id: string) => Problem | undefined;
  addProblem: (problem: Problem, source?: 'gallery' | 'draft') => void;
}
```

**Usage Example:**
```tsx
import { useProblems } from '@/hooks/useProblems';

function App() {
  const { problemMetas, loading, getProblemById, addProblem } = useProblems();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {problemMetas.map(meta => (
        <div key={meta.id}>{meta.title}</div>
      ))}
    </div>
  );
}
```

## Complete Layout Structure

Here's how to combine all components:

```tsx
import { useState } from 'react';
import { Sidebar, SplitPane } from '@/components/layout';
import { useProblems } from '@/hooks/useProblems';

function App() {
  const { problemMetas, getProblemById } = useProblems();
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeProblem = activeProblemId ? getProblemById(activeProblemId) : null;

  const handleGenerateNew = () => {
    // Implement AI problem generation
    console.log('Generate new problem');
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        problems={problemMetas}
        activeProblemId={activeProblemId}
        onSelectProblem={setActiveProblemId}
        onGenerateNew={handleGenerateNew}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1">
        {activeProblem ? (
          <SplitPane
            left={<GraphView problem={activeProblem} />}
            right={<WizardView problem={activeProblem} />}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a problem or generate a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Styling

All components use **Tailwind CSS 4** for styling. No additional CSS files are needed. The components use:

- **Sidebar**: Dark theme with slate-900 background, white text
- **SplitPane**: Light theme with white toolbar, gray divider
- **Responsive**: All components handle resize and collapse states
- **Smooth transitions**: 300ms transitions for interactive elements

## Icons

Custom SVG icons are included inline in the components:
- ChevronLeft/Right (collapse)
- Search
- Plus (generate)
- Network (graph view)
- Layout (split view)
- List (wizard view)
- Brain (app logo)

No icon library dependency required.

## Notes

1. **Built-in Problems**: Currently `loadBuiltinProblems()` returns an empty array. Add your problem data in `src/data/problems/index.ts`.

2. **Dark/Light Mode**: Sidebar is dark-themed, main content area is light-themed. Customize as needed.

3. **Tailwind Configuration**: The project uses Tailwind CSS 4 with `@tailwindcss/vite` plugin. Make sure your `src/index.css` imports Tailwind:
   ```css
   @import "tailwindcss";
   ```

4. **TypeScript**: All components are fully typed with TypeScript interfaces.

5. **React 19**: Components use React 19 features and hooks.
