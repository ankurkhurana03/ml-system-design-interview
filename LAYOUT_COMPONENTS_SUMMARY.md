# Layout Components Summary

This document provides a quick reference for the layout components created for the ML System Design Interview tool.

## Files Created

### Core Components

1. **`/Users/ankur/Downloads/ml_sys_design/src/components/layout/Sidebar.tsx`**
   - Collapsible sidebar with problem navigation
   - Search/filter functionality
   - Problem grouping by source (Built-in, Gallery, Drafts)
   - Difficulty badges and tags
   - Dark theme (slate-900)
   - 280px expanded, 48px collapsed

2. **`/Users/ankur/Downloads/ml_sys_design/src/components/layout/SplitPane.tsx`**
   - Resizable split view with draggable divider
   - Three view modes: Graph Only, Split, Wizard Only
   - Min/max constraints for panes
   - Smooth drag interactions

3. **`/Users/ankur/Downloads/ml_sys_design/src/components/layout/index.ts`**
   - Barrel export for all layout components

### Hooks

4. **`/Users/ankur/Downloads/ml_sys_design/src/hooks/useProblems.ts`**
   - Problem loading and state management
   - Get problem by ID
   - Add new problems (gallery/draft)
   - Loading state

### Documentation

5. **`/Users/ankur/Downloads/ml_sys_design/LAYOUT_USAGE.md`**
   - Comprehensive usage guide
   - Props documentation
   - Integration examples

6. **`/Users/ankur/Downloads/ml_sys_design/EXAMPLE_APP.tsx`**
   - Complete working example
   - Shows all components integrated
   - Placeholder views for Graph and Wizard
   - Empty and loading states

## Quick Start

```tsx
import { Sidebar, SplitPane } from '@/components/layout';
import { useProblems } from '@/hooks/useProblems';

function App() {
  const { problemMetas, getProblemById } = useProblems();
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeProblem = activeProblemId ? getProblemById(activeProblemId) : null;

  return (
    <div className="flex h-screen">
      <Sidebar
        problems={problemMetas}
        activeProblemId={activeProblemId}
        onSelectProblem={setActiveProblemId}
        onGenerateNew={() => {}}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1">
        {activeProblem && (
          <SplitPane
            left={<GraphView problem={activeProblem} />}
            right={<WizardView problem={activeProblem} />}
          />
        )}
      </div>
    </div>
  );
}
```

## Features Implemented

### Sidebar
- ✅ Collapsible (280px → 48px)
- ✅ Search/filter problems
- ✅ Group by source (Built-in, Gallery, Drafts)
- ✅ Difficulty badges (beginner/intermediate/advanced)
- ✅ Tags display (max 3 visible)
- ✅ Active problem highlighting (blue background)
- ✅ Generate New Problem button
- ✅ Dark theme styling
- ✅ Smooth transitions
- ✅ Inline SVG icons (no dependencies)

### SplitPane
- ✅ Horizontal resizable split
- ✅ Draggable divider (4px, hover highlight)
- ✅ Three view modes (Graph Only, Split, Wizard Only)
- ✅ Min percentage constraints (default 25%)
- ✅ Toolbar with mode toggle buttons
- ✅ Smooth drag with mouse events
- ✅ Col-resize cursor on hover
- ✅ State management with useRef and useCallback

### useProblems Hook
- ✅ Load built-in problems from YAML
- ✅ Problem metadata management
- ✅ Get problem by ID
- ✅ Add new problems
- ✅ Loading state
- ✅ TypeScript typed

## Styling

All components use **Tailwind CSS 4** with the `@tailwindcss/vite` plugin.

The `index.css` file includes:
- Tailwind import: `@import "tailwindcss";`
- Custom animations (pulse-blue, dash-flow, slide-up, fade-in)
- ReactFlow overrides
- Custom scrollbar styling

## Icons

Custom inline SVG icons included (no external dependencies):
- ChevronLeft/Right - Navigation
- Search - Search input
- Plus - Generate button
- Network - Graph view icon
- Layout - Split view icon
- List - Wizard view icon
- Brain - App logo

## TypeScript

All components are fully typed with TypeScript interfaces:
- `SidebarProps`
- `SplitPaneProps`
- `ProblemMeta`
- `Problem`
- `ViewMode` type

## Integration with Existing Code

The components integrate with:
- ✅ Existing types from `/src/types/tree.ts`
- ✅ YAML problem loading from `/src/data/problems/`
- ✅ Vite path alias `@/` configured
- ✅ React 19 features
- ✅ Tailwind CSS 4

## Next Steps

To complete the application, you'll need to implement:

1. **GraphView Component** - Visualize problem tree with ReactFlow
2. **WizardView Component** - Step-through interview wizard
3. **Problem Generation** - AI-powered problem creation
4. **Gallery Integration** - Load problems from Supabase
5. **Draft Management** - Save/load user drafts

## Testing

To test the components:

```bash
npm run dev
```

Then replace your `src/App.tsx` with the contents of `EXAMPLE_APP.tsx` to see the layout in action.

## Design Decisions

1. **Dark Sidebar + Light Content**: Creates visual separation and hierarchy
2. **Inline SVG Icons**: No external dependencies, easier to customize
3. **Smooth Transitions**: 300ms transitions for all interactive elements
4. **Responsive Constraints**: Min 25% for split panes prevents unusable layouts
5. **Type Safety**: Full TypeScript coverage for better DX
6. **Accessibility**: Proper button semantics, hover states, focus states

## Performance Considerations

- `useMemo` for problem filtering/grouping
- `useCallback` for event handlers to prevent re-renders
- Efficient drag handling with refs
- No unnecessary state updates

## Browser Support

Supports all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

CSS features used:
- Flexbox
- CSS Grid
- CSS Transitions
- CSS Animations
- Custom Properties (via Tailwind)
