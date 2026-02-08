# Layout Components Checklist

## ✅ Completed Tasks

### Component Files Created

- ✅ `/src/components/layout/Sidebar.tsx` - Collapsible sidebar with problem navigation
- ✅ `/src/components/layout/SplitPane.tsx` - Resizable split pane with view modes
- ✅ `/src/components/layout/index.ts` - Barrel export file

### Hook Created

- ✅ `/src/hooks/useProblems.ts` - Problem loading and state management

### Configuration Updates

- ✅ `/src/index.css` - Added Tailwind import (already updated by user)
- ✅ `/src/data/problems/index.ts` - Problem loading function (already updated by user)

### Documentation Created

- ✅ `LAYOUT_USAGE.md` - Comprehensive usage guide
- ✅ `EXAMPLE_APP.tsx` - Complete working example
- ✅ `LAYOUT_COMPONENTS_SUMMARY.md` - Quick reference summary
- ✅ `LAYOUT_CHECKLIST.md` - This file

## 📋 Implementation Details

### Sidebar Component
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

**Features:**
- Search/filter problems by title, description, or tags
- Group problems by source (Built-in, Gallery, My Drafts)
- Display difficulty badges (beginner/intermediate/advanced)
- Show up to 3 tags per problem
- Highlight active problem with blue background
- "Generate New Problem" button at bottom
- Collapse to 48px width (icon-only mode)
- Dark theme (slate-900 background)
- Smooth 300ms transitions

**Responsive States:**
- Expanded: 280px width, full content visible
- Collapsed: 48px width, icons only with tooltips

### SplitPane Component
```typescript
interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultSplit?: number;  // percentage, default 50
  minLeft?: number;       // min percentage, default 25
  minRight?: number;      // min percentage, default 25
}
```

**Features:**
- Three view modes: "Graph Only", "Split", "Wizard Only"
- Draggable divider in split mode (4px width)
- Divider highlights on hover (gray-300 → blue-500)
- Cursor changes to col-resize on divider hover
- Respects min/max percentage constraints
- Smooth drag with mousedown/mousemove/mouseup
- Toolbar with view mode toggle buttons
- State persistence during drag

**Drag Behavior:**
- Uses refs to track drag state
- Calculates delta in percentages
- Enforces min constraints (default 25% each side)
- Updates in real-time during drag
- Smooth transition when released

### useProblems Hook
```typescript
{
  problems: Problem[];
  problemMetas: ProblemMeta[];
  loading: boolean;
  getProblemById: (id: string) => Problem | undefined;
  addProblem: (problem: Problem, source?: 'gallery' | 'draft') => void;
}
```

**Features:**
- Loads built-in problems on mount
- Manages problem metadata separately (for performance)
- Provides helper to get full problem by ID
- Add new problems (gallery or draft)
- Loading state for async operations

## 🎨 Styling Details

### Color Palette

**Sidebar (Dark Theme):**
- Background: `slate-900` (#0f172a)
- Border: `slate-700` (#334155)
- Text: `white` / `slate-200`
- Hover: `slate-800` (#1e293b)
- Active: `blue-600` (#2563eb)
- Search input: `slate-800` background

**Main Content (Light Theme):**
- Background: `white` / `gray-50` (#f9fafb)
- Border: `gray-200` (#e5e7eb)
- Divider: `gray-300` (#d1d5db)
- Divider hover: `blue-500` (#3b82f6)
- Toolbar: `white` background

**Difficulty Badges:**
- Beginner: `green-600` (#16a34a)
- Intermediate: `yellow-600` (#ca8a04)
- Advanced: `red-600` (#dc2626)

### Icons

All icons are inline SVG (no dependencies):
- Brain (app logo) - 24x24
- Chevron Left/Right - 20x20
- Search - 16x16
- Plus - 20x20
- Network (graph) - 16x16
- Layout (split) - 16x16
- List (wizard) - 16x16

### Transitions

All interactive elements use 300ms transitions:
```css
transition-colors
transition-all duration-300
```

## 🔧 Integration Guide

### Step 1: Import Components
```tsx
import { Sidebar, SplitPane } from '@/components/layout';
import { useProblems } from '@/hooks/useProblems';
```

### Step 2: Set Up State
```tsx
const { problemMetas, getProblemById } = useProblems();
const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
```

### Step 3: Render Layout
```tsx
<div className="flex h-screen">
  <Sidebar {...sidebarProps} />
  <div className="flex-1">
    <SplitPane left={<GraphView />} right={<WizardView />} />
  </div>
</div>
```

## 🧪 Testing

### Manual Testing Checklist

**Sidebar:**
- [ ] Collapse/expand animation smooth
- [ ] Search filters problems correctly
- [ ] Problem groups display properly
- [ ] Difficulty badges show correct colors
- [ ] Tags display (max 3)
- [ ] Active problem highlighted
- [ ] Generate button clickable
- [ ] Long problem names/descriptions truncate
- [ ] Scrolling works with many problems

**SplitPane:**
- [ ] All three view modes work (Graph, Split, Wizard)
- [ ] Divider draggable in split mode
- [ ] Divider highlights on hover
- [ ] Cursor changes to col-resize
- [ ] Min percentages enforced
- [ ] Smooth drag without jank
- [ ] View mode buttons toggle correctly
- [ ] Content fills available space

**useProblems:**
- [ ] Problems load on mount
- [ ] getProblemById returns correct problem
- [ ] addProblem adds to correct source
- [ ] Loading state shows initially
- [ ] No memory leaks or stale closures

## 📝 Notes

1. **Built-in Problems**: The hook loads problems from `/src/data/problems/flight-delay.yaml` via the `loadBuiltinProblems()` function.

2. **Path Aliases**: The `@/` alias is configured in `vite.config.ts` to resolve to `./src`.

3. **Tailwind CSS 4**: Uses the new `@tailwindcss/vite` plugin. Make sure `@import "tailwindcss";` is in `index.css`.

4. **React 19**: Components use React 19 features (automatic batching, improved ref handling).

5. **TypeScript**: All components are strictly typed. Run `npm run build` to check for type errors.

6. **Performance**: Uses `useMemo` for filtering and `useCallback` for event handlers to optimize re-renders.

## 🚀 Next Steps

To complete the application:

1. **Create GraphView Component**
   - Use ReactFlow (@xyflow/react)
   - Visualize problem tree structure
   - Show node types with different colors
   - Handle node selection

2. **Create WizardView Component**
   - Step-through interview simulation
   - Display current node content
   - Show choices for question nodes
   - Track interview path
   - Show stage progress

3. **Implement Problem Generation**
   - AI prompt engineering
   - YAML serialization
   - Draft saving/loading
   - Validation

4. **Add Gallery Integration**
   - Supabase connection
   - Problem upload/download
   - Rating system
   - Comments/feedback

5. **Add Authentication**
   - Use existing useAuth hook
   - Protect draft operations
   - User profiles

## 📊 File Structure

```
src/
├── components/
│   └── layout/
│       ├── Sidebar.tsx        (9.2 KB)
│       ├── SplitPane.tsx      (7.3 KB)
│       └── index.ts           (110 B)
├── hooks/
│   └── useProblems.ts         (1.1 KB)
├── data/
│   └── problems/
│       ├── index.ts           (326 B)
│       └── flight-delay.yaml  (48 KB)
├── types/
│   └── tree.ts                (existing)
└── index.css                  (updated)
```

## ✨ Design Highlights

1. **Visual Hierarchy**: Dark sidebar + light content creates clear separation
2. **Smooth Interactions**: 300ms transitions on all interactive elements
3. **Responsive**: Handles collapse, resize, and view mode changes
4. **Type Safe**: Full TypeScript coverage with strict mode
5. **No Dependencies**: Inline SVG icons, no icon library needed
6. **Accessible**: Proper button semantics, hover states, focus indicators
7. **Performant**: Optimized with React hooks (useMemo, useCallback)

## 🎉 Summary

All layout components are complete and ready to use. The implementation follows best practices for:
- React 19 patterns
- TypeScript strict mode
- Tailwind CSS 4 conventions
- Responsive design
- Accessibility
- Performance optimization

See `EXAMPLE_APP.tsx` for a complete working example!
