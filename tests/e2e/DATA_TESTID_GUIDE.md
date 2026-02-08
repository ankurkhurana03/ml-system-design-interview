# Adding data-testid Attributes for Stable Test Selectors

## Overview

While the current tests use semantic selectors (roles, text, etc.), adding `data-testid` attributes to key components will make tests more stable and resilient to UI changes.

## Recommended data-testid Attributes

### WizardPanel Component
**File**: `/src/components/wizard/WizardPanel.tsx`

```tsx
export function WizardPanel() {
  // ...
  return (
    <div className="flex flex-col h-full bg-gray-100" data-testid="wizard-panel">
      {/* Stage Indicator */}
      <div className="bg-white border-b border-gray-200" data-testid="stage-indicator">
        <StageIndicator currentStage={currentNode.stage} visitedStages={visitedStages} />
      </div>

      {/* Path Breadcrumb */}
      <div data-testid="path-breadcrumb">
        <PathBreadcrumb path={path} nodeMap={nodeMap} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Back Button */}
          {path.length > 0 && (
            <div className="mb-4">
              <button
                onClick={goBack}
                className="..."
                data-testid="back-button"
              >
                Back
              </button>
            </div>
          )}

          {/* Question Card */}
          <QuestionCard
            node={currentNode}
            onSelectChoice={selectChoice}
            onAdvance={advance}
            onReset={reset}
          />

          {/* Node Metadata */}
          <div className="mt-4 text-xs text-gray-500 text-center" data-testid="node-metadata">
            Node: {currentNode.id} | Stage: {currentNode.stage} | Type: {currentNode.type}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### QuestionCard Component
**File**: `/src/components/wizard/QuestionCard.tsx`

```tsx
export function QuestionCard({ node, onSelectChoice, onAdvance, onReset }: QuestionCardProps) {
  // ...
  return (
    <div
      className="bg-white rounded-lg shadow-lg border-l-4 overflow-hidden"
      style={{ borderLeftColor: getBorderColor() }}
      data-testid="question-card"
    >
      <div className="p-6">
        {/* Speaker Label */}
        <div className="mb-4">
          <span
            className="..."
            data-testid="speaker-label"
          >
            {isInterviewer ? 'Interviewer' : 'Candidate'}
          </span>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3" data-testid="node-label">
            {node.label}
          </h3>
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid="node-content">
            {node.content}
          </div>
        </div>

        {/* Info Node - Continue Button */}
        {node.type === 'info' && node.next && (
          <div className="flex justify-end">
            <button
              onClick={onAdvance}
              className="..."
              data-testid="continue-button"
            >
              Continue
            </button>
          </div>
        )}

        {/* Question Node - Choices */}
        {node.type === 'question' && node.choices && (
          <div className="space-y-3" data-testid="choices-container">
            {node.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => onSelectChoice(index)}
                className="..."
                data-testid={`choice-button-${index}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-gray-300 group-hover:border-blue-500 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-blue-500 transition-colors duration-200" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1" data-testid={`choice-label-${index}`}>
                      {choice.label}
                    </div>
                    {choice.answer && (
                      <div className="text-sm text-gray-600 whitespace-pre-wrap" data-testid={`choice-answer-${index}`}>
                        {choice.answer}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Terminal Node */}
        {node.type === 'terminal' && (
          <div className="space-y-3" data-testid="terminal-actions">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <span className="font-medium">Interview Complete</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onReset}
                className="..."
                data-testid="start-over-button"
              >
                Start Over
              </button>
              <button
                onClick={downloadTranscript}
                className="..."
                data-testid="download-transcript-button"
              >
                Download Transcript
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Sidebar Component
**File**: `/src/components/layout/Sidebar.tsx`

```tsx
export function Sidebar({ ... }: SidebarProps) {
  // ...

  if (isCollapsed) {
    return (
      <div className="w-12 h-screen bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 transition-all duration-300" data-testid="sidebar-collapsed">
        <button
          onClick={onToggleCollapse}
          className="..."
          title="Expand sidebar"
          data-testid="expand-sidebar-button"
        >
          <ChevronRightIcon />
        </button>
        {/* ... */}
      </div>
    );
  }

  return (
    <div className="w-70 h-screen bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300" data-testid="sidebar">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between" data-testid="sidebar-header">
        <div className="flex items-center gap-2">
          <BrainIcon />
          <h1 className="text-lg font-bold text-white">ML System Design</h1>
        </div>
        <button
          onClick={onToggleCollapse}
          className="..."
          title="Collapse sidebar"
          data-testid="collapse-sidebar-button"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="..."
            data-testid="search-problems-input"
          />
        </div>
      </div>

      {/* Problem List */}
      <div className="flex-1 overflow-y-auto" data-testid="problem-list">
        {/* Built-in Problems */}
        {groupedProblems.builtin.length > 0 && (
          <div className="p-3" data-testid="builtin-problems">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Built-in
            </h2>
            <div className="space-y-1">
              {groupedProblems.builtin.map(problem => (
                <ProblemItem
                  key={problem.id}
                  problem={problem}
                  isActive={problem.id === activeProblemId}
                  onClick={() => onSelectProblem(problem.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {groupedProblems.builtin.length === 0 &&
         groupedProblems.gallery.length === 0 &&
         groupedProblems.draft.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm" data-testid="no-problems-found">
            No problems found
          </div>
        )}
      </div>

      {/* Generate New Button */}
      <div className="p-3 border-t border-slate-700">
        <button
          onClick={onGenerateNew}
          className="..."
          data-testid="generate-new-button"
        >
          Generate New Problem
        </button>
      </div>
    </div>
  );
}

function ProblemItem({ problem, isActive, onClick }: ProblemItemProps) {
  return (
    <button
      onClick={onClick}
      className={`...`}
      data-testid={`problem-item-${problem.id}`}
      data-active={isActive}
    >
      {/* ... */}
    </button>
  );
}
```

### SplitPane Component
**File**: `/src/components/layout/SplitPane.tsx`

```tsx
export function SplitPane({ ... }: SplitPaneProps) {
  // ...
  return (
    <div className="flex flex-col h-screen bg-slate-50" data-testid="split-pane">
      {/* Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-center gap-1 px-4" data-testid="view-mode-toolbar">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('graph')}
            className={`...`}
            title="Graph Only"
            data-testid="graph-only-button"
          >
            <NetworkIcon />
            <span>Graph Only</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`...`}
            title="Split View"
            data-testid="split-button"
          >
            <LayoutIcon />
            <span>Split</span>
          </button>
          <button
            onClick={() => setViewMode('wizard')}
            className={`...`}
            title="Wizard Only"
            data-testid="wizard-only-button"
          >
            <ListIcon />
            <span>Wizard Only</span>
          </button>
        </div>
      </div>

      {/* Split Pane Container */}
      <div ref={containerRef} className="flex-1 flex relative overflow-hidden" data-testid="pane-container">
        {/* Left Panel */}
        {showLeft && (
          <div
            className="h-full overflow-auto"
            style={{ ... }}
            data-testid="graph-pane"
          >
            {left}
          </div>
        )}

        {/* Divider */}
        {showDivider && (
          <div
            className={`...`}
            onMouseDown={handleMouseDown}
            data-testid="pane-divider"
          >
            {/* ... */}
          </div>
        )}

        {/* Right Panel */}
        {showRight && (
          <div
            className="h-full overflow-auto"
            style={{ ... }}
            data-testid="wizard-pane"
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
}
```

### App Component
**File**: `/src/App.tsx`

```tsx
function AppContent() {
  // ...
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50" data-testid="app">
      <Sidebar ... />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-4" data-testid="top-bar">
          <div className="flex items-center gap-2">
            {problem && (
              <h2 className="text-sm font-semibold text-gray-700 truncate" data-testid="problem-title">
                {problem.title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="..."
              title="LLM Settings"
              data-testid="settings-button"
            >
              {/* ... */}
            </button>
            {!user && (
              <button
                onClick={() => setShowLogin(true)}
                className="..."
                data-testid="sign-in-button"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <SplitPane ... />
        </div>
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GenerateModal ... />
    </div>
  );
}
```

## Updating Tests to Use data-testid

Once you add the data-testid attributes, you can update tests to use them:

### Before (using class selectors)
```typescript
const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
```

### After (using data-testid)
```typescript
const wizardPanel = page.getByTestId('wizard-panel');
```

### Update helpers.ts
```typescript
export const selectors = {
  wizard: {
    panel: '[data-testid="wizard-panel"]',
    questionCard: '[data-testid="question-card"]',
    continueButton: '[data-testid="continue-button"]',
    backButton: '[data-testid="back-button"]',
    startOverButton: '[data-testid="start-over-button"]',
    choiceButton: '[data-testid^="choice-button-"]', // Matches choice-button-0, choice-button-1, etc.
    nodeMetadata: '[data-testid="node-metadata"]',
  },
  sidebar: {
    container: '[data-testid="sidebar"]',
    searchInput: '[data-testid="search-problems-input"]',
    collapseButton: '[data-testid="collapse-sidebar-button"]',
    expandButton: '[data-testid="expand-sidebar-button"]',
    generateButton: '[data-testid="generate-new-button"]',
  },
  viewModes: {
    graphOnlyButton: '[data-testid="graph-only-button"]',
    splitButton: '[data-testid="split-button"]',
    wizardOnlyButton: '[data-testid="wizard-only-button"]',
  },
};
```

## Benefits of data-testid

1. **Stability** - Tests won't break when CSS classes change
2. **Clarity** - Clear intent that element is used in tests
3. **Performance** - Faster selector queries
4. **Maintainability** - Easy to find elements in code
5. **Documentation** - Self-documenting test points

## Migration Strategy

### Phase 1: Add to Critical Components (Recommended)
1. WizardPanel
2. QuestionCard
3. Sidebar
4. SplitPane (view mode buttons)

### Phase 2: Update Tests Gradually
1. Update helpers.ts selectors
2. Run tests to ensure they still pass
3. Refactor tests one file at a time

### Phase 3: Add to Remaining Components
1. TranscriptButton
2. SettingsPanel
3. GenerateModal
4. Other components as needed

## Notes

- **Don't overuse** - Only add to elements that need to be tested
- **Keep names semantic** - Use descriptive names like `choice-button-0`
- **Use consistently** - Follow the naming pattern across components
- **Document changes** - Update this guide when adding new test IDs

## Testing the Changes

After adding data-testid attributes:

```bash
# Run tests to verify nothing broke
npm run test:e2e

# Update and test one file at a time
npx playwright test wizard-navigation.spec.ts

# Run in UI mode to debug
npx playwright test --ui
```

## Priority List

### High Priority (Critical Path)
- ✅ `wizard-panel`
- ✅ `question-card`
- ✅ `continue-button`
- ✅ `choice-button-{index}`
- ✅ `start-over-button`
- ✅ `download-transcript-button`

### Medium Priority (User Features)
- ✅ `sidebar`
- ✅ `search-problems-input`
- ✅ `problem-item-{id}`
- ✅ `view-mode-toolbar`
- ✅ `graph-only-button`, `split-button`, `wizard-only-button`

### Low Priority (Nice to Have)
- Stage indicators
- Breadcrumb items
- Settings panel elements
- Modal components

## Example: Updated Test

```typescript
// Before
test('should show choices at question node', async ({ page }) => {
  const choiceButtons = page.locator('button').filter({
    has: page.locator('.w-6.h-6.rounded-full.bg-white'),
  });
  expect(await choiceButtons.count()).toBeGreaterThanOrEqual(2);
});

// After (with data-testid)
test('should show choices at question node', async ({ page }) => {
  const choicesContainer = page.getByTestId('choices-container');
  const choiceButtons = choicesContainer.getByTestId(/choice-button-/);
  expect(await choiceButtons.count()).toBeGreaterThanOrEqual(2);
});
```

---

**Note**: The current tests work without data-testid attributes. This guide is optional but recommended for long-term maintainability.
