# Layout Architecture

Visual guide to the layout component structure and data flow.

## Component Hierarchy

```
App
├── Sidebar (280px | 48px)
│   ├── Header
│   │   ├── Logo (Brain Icon)
│   │   ├── Title "ML System Design"
│   │   └── Collapse Toggle (Chevron)
│   ├── Search Input
│   ├── Problem List (scrollable)
│   │   ├── Group: "Built-in"
│   │   │   └── ProblemItem[]
│   │   ├── Group: "Gallery"
│   │   │   └── ProblemItem[]
│   │   └── Group: "My Drafts"
│   │       └── ProblemItem[]
│   └── Footer
│       └── Generate New Button
│
└── Main Content (flex-1)
    └── SplitPane
        ├── Toolbar (fixed top)
        │   └── View Mode Buttons
        │       ├── Graph Only
        │       ├── Split (default)
        │       └── Wizard Only
        ├── Left Panel (variable width)
        │   └── GraphView Component
        ├── Divider (4px, draggable)
        └── Right Panel (variable width)
            └── WizardView Component
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│ useProblems Hook                                │
│                                                 │
│ 1. Loads: loadBuiltinProblems()                │
│ 2. State: problems[], problemMetas[]            │
│ 3. Provides: getProblemById(), addProblem()     │
└────────────┬────────────────────────────────────┘
             │
             │ problemMetas[]
             ↓
┌────────────────────────────────────────────────┐
│ App Component                                  │
│                                                │
│ State:                                         │
│ - activeProblemId: string | null              │
│ - sidebarCollapsed: boolean                    │
│                                                │
│ Handlers:                                      │
│ - onSelectProblem(id)                         │
│ - onGenerateNew()                             │
│ - onToggleCollapse()                          │
└─────┬──────────────────────────┬───────────────┘
      │                          │
      │ problemMetas[]           │ activeProblem
      │ activeProblemId          │
      │ handlers                 │
      ↓                          ↓
┌─────────────────┐    ┌────────────────────────┐
│ Sidebar         │    │ SplitPane              │
│                 │    │                        │
│ Displays:       │    │ Left:  GraphView       │
│ - Problem list  │    │ Right: WizardView      │
│ - Search        │    │                        │
│ - Groups        │    │ Controls split %       │
│                 │    │ View mode toggle       │
└─────────────────┘    └────────────────────────┘
```

## State Management

```typescript
// App.tsx (main state container)
const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

// Derived state
const activeProblem = activeProblemId
  ? getProblemById(activeProblemId)
  : null;
```

```typescript
// Sidebar.tsx (local UI state)
const [searchQuery, setSearchQuery] = useState('');

// Computed/filtered problems
const groupedProblems = useMemo(() => {
  const filtered = problems.filter(/* search logic */);
  return {
    builtin: filtered.filter(p => p.source === 'builtin'),
    gallery: filtered.filter(p => p.source === 'gallery'),
    draft: filtered.filter(p => p.source === 'draft'),
  };
}, [problems, searchQuery]);
```

```typescript
// SplitPane.tsx (local UI state)
const [splitPercent, setSplitPercent] = useState(defaultSplit);
const [isDragging, setIsDragging] = useState(false);
const [viewMode, setViewMode] = useState<ViewMode>('split');

// Refs for drag handling
const containerRef = useRef<HTMLDivElement>(null);
const dragStartX = useRef(0);
const dragStartPercent = useRef(0);
```

## Layout Dimensions

### Sidebar States

```
Expanded (default):
┌────────────────────────┐
│ 280px                  │
│                        │
│ [Logo] ML System Design│
│                        │
│ [Search...]            │
│                        │
│ Built-in               │
│ ┌──────────────────┐   │
│ │ Problem 1        │   │
│ │ Description...   │   │
│ │ [B] tag tag      │   │
│ └──────────────────┘   │
│                        │
│ [+ Generate New]       │
└────────────────────────┘

Collapsed:
┌──┐
│🧠│ 48px
│  │
│🔍│
│  │
│📄│
│  │
│  │
│  │
│ +│
└──┘
```

### SplitPane Modes

```
Graph Only:
┌─────────────────────────────────────┐
│ [Graph Only] Split Wizard Only      │
├─────────────────────────────────────┤
│                                     │
│         GraphView (100%)            │
│                                     │
└─────────────────────────────────────┘

Split (default):
┌─────────────────────────────────────┐
│ Graph Only [Split] Wizard Only      │
├──────────────────┬──────────────────┤
│                  ║                  │
│  GraphView (50%) ║ WizardView (50%) │
│                  ║                  │
└──────────────────┴──────────────────┘
                   ↕️ draggable

Wizard Only:
┌─────────────────────────────────────┐
│ Graph Only Split [Wizard Only]      │
├─────────────────────────────────────┤
│                                     │
│       WizardView (100%)             │
│                                     │
└─────────────────────────────────────┘
```

## Event Flow

### Problem Selection

```
User clicks problem in Sidebar
         ↓
Sidebar: onSelectProblem(problemId)
         ↓
App: setActiveProblemId(problemId)
         ↓
App: activeProblem = getProblemById(problemId)
         ↓
SplitPane receives activeProblem
         ↓
GraphView + WizardView render with problem data
```

### Sidebar Collapse

```
User clicks collapse button
         ↓
Sidebar: onToggleCollapse()
         ↓
App: setSidebarCollapsed(!sidebarCollapsed)
         ↓
Sidebar: isCollapsed prop changes
         ↓
CSS transition: width 280px → 48px (300ms)
         ↓
Conditional rendering: full content ↔ icons only
```

### Split Pane Drag

```
User hovers divider
         ↓
CSS: cursor: col-resize, bg-gray-300 → bg-blue-500
         ↓
User mousedown on divider
         ↓
handleMouseDown: setIsDragging(true)
                 store dragStartX, dragStartPercent
         ↓
document.addEventListener('mousemove', handleMouseMove)
         ↓
handleMouseMove: calculate deltaX
                 convert to deltaPercent
                 setSplitPercent with constraints
                 panels resize in real-time
         ↓
User mouseup
         ↓
handleMouseUp: setIsDragging(false)
               remove event listeners
               restore cursor
```

## Styling Strategy

### Tailwind Classes Used

**Layout:**
- `flex`, `flex-col`, `flex-1`
- `h-screen`, `h-full`, `w-full`
- `overflow-hidden`, `overflow-y-auto`
- `relative`, `absolute`, `inset-0`

**Spacing:**
- `p-{2,3,4,6,8}` (padding)
- `m-{2,4,6}` (margin)
- `gap-{1,2,3}` (flex/grid gap)
- `space-y-{1,2}` (vertical spacing)

**Colors:**
- Sidebar: `bg-slate-{700,800,900}`, `text-white`, `text-slate-{200,300,400}`
- Content: `bg-white`, `bg-gray-{50,100,200}`
- Active: `bg-blue-{600,700}`, `text-blue-{100,500}`
- Hover: `hover:bg-slate-{700,800}`, `hover:bg-blue-700`

**Typography:**
- `text-{xs,sm,lg,xl,2xl}`
- `font-{medium,semibold,bold}`
- `leading-{tight,relaxed}`
- `uppercase`, `tracking-wider`

**Borders & Radius:**
- `border`, `border-{gray,slate}-{200,700}`
- `rounded-{lg,full}`

**Transitions:**
- `transition-colors`
- `transition-all duration-300`

**Interactive:**
- `cursor-pointer`, `cursor-col-resize`
- `hover:*`, `focus:*`
- `focus:outline-none`, `focus:ring-2`, `focus:ring-blue-500`

## Responsive Behavior

### Sidebar
- **> 1024px**: Expanded by default (280px)
- **Collapsed**: 48px (icon-only, manual toggle)
- **Scroll**: Problem list scrolls independently

### SplitPane
- **Minimum widths**: 25% each panel (configurable)
- **View modes**: Full control via toolbar buttons
- **Drag**: Real-time resize between 25-75%

### Main Content
- Uses flexbox to fill available space
- Adapts to sidebar collapse/expand
- SplitPane panels resize proportionally

## Performance Optimizations

1. **useMemo**: Problem filtering/grouping only recalculates when dependencies change
2. **useCallback**: Event handlers stable across renders
3. **useRef**: Drag state doesn't trigger re-renders
4. **Conditional rendering**: Only show active mode panels
5. **CSS transitions**: Hardware-accelerated transforms

## Accessibility Features

1. **Semantic HTML**: `<button>`, `<input>`, proper heading hierarchy
2. **Keyboard navigation**: Tab order follows visual order
3. **Focus states**: Visible focus rings on interactive elements
4. **Alt text**: Icon buttons have title attributes
5. **Color contrast**: WCAG AA compliant (dark sidebar, light content)
6. **Screen reader**: Proper ARIA labels where needed

## Browser Compatibility

**CSS Features:**
- Flexbox ✅ (all modern browsers)
- CSS Transitions ✅ (all modern browsers)
- CSS Grid ✅ (used by Tailwind)
- Custom properties ✅ (via Tailwind)

**JS Features:**
- ES2022 ✅ (configured in tsconfig)
- React 19 ✅
- TypeScript ✅

**Minimum versions:**
- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+

## File Sizes

```
Sidebar.tsx    : ~9.2 KB (compressed)
SplitPane.tsx  : ~7.3 KB (compressed)
useProblems.ts : ~1.1 KB (compressed)
index.ts       : ~110 B

Total: ~17.7 KB (before minification)
```

With tree-shaking and minification, production bundle size will be significantly smaller.

## Future Enhancements

Potential improvements (not implemented):

1. **Persist UI State**
   - LocalStorage for sidebar collapsed state
   - Remember split percentage
   - Save view mode preference

2. **Keyboard Shortcuts**
   - Ctrl+B: Toggle sidebar
   - Ctrl+G: Graph only
   - Ctrl+W: Wizard only
   - Ctrl+S: Split view

3. **Touch Support**
   - Touch drag for split divider
   - Swipe gestures for view modes

4. **Themes**
   - Light/dark mode toggle
   - Custom color schemes

5. **Animations**
   - Smooth problem list updates
   - Loading skeletons
   - Micro-interactions

6. **Accessibility**
   - ARIA live regions for updates
   - Reduced motion support
   - High contrast mode
