# Phase 8: Interactive Branch Editing - User Workflow

## Visual Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        TreeGraph                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  ┌──────────┐      ┌──────────┐      ┌──────────┐  │   │
│  │  │  Node 1  │─────▶│  Node 2  │─────▶│  Node 3  │  │   │
│  │  │  (info)  │      │(question)│      │(terminal)│  │   │
│  │  │          │      │          │      │          │  │   │
│  │  │  [+ Add  │      │  [+ Add  │      │ [+ Cont- │  │   │
│  │  │ Decision]│      │  Choice] │      │  inue]   │  │   │
│  │  └────┬─────┘      └────┬─────┘      └────┬─────┘  │   │
│  │       │                 │                 │         │   │
│  └───────┼─────────────────┼─────────────────┼─────────┘   │
│          │                 │                 │             │
│          └─────────────────┼─────────────────┘             │
│                            │                               │
│                    onClick(nodeId, editType)               │
│                            │                               │
│                            ▼                               │
│                  setBranchEditTarget({nodeId, editType})   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              │ Opens modal
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   BranchEditModal                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Choice Label: [Hybrid approach________]              │ │
│  │                                                       │ │
│  │ Description:  [Combine collaborative and content-    │ │
│  │                based filtering for better...]         │ │
│  │                                                       │ │
│  │              [Cancel]  [Generate]                     │ │
│  └───────────────────────────┬───────────────────────────┘ │
│                              │ User clicks Generate        │
└──────────────────────────────┼─────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │  1. Call LLM (Supabase or Direct)       │
        │  2. Extract YAML from response           │
        │  3. Parse nodes                          │
        │  4. Call mergeBranch()                   │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              mergeBranch (utils)                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 1. Remap node IDs (add branch_timestamp_ prefix)     │ │
│  │ 2. Based on editType:                                │ │
│  │    - add-choice: Add choice to question node         │ │
│  │    - add-decision: Convert info → question           │ │
│  │    - continue: Convert terminal → info               │ │
│  │ 3. Validate merged tree                              │ │
│  │ 4. Return updated Problem                            │ │
│  └───────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              Preview in Modal                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Preview: 5 new nodes                                 │ │
│  │                                                       │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │ Data Strategy              [data]               │ │ │
│  │ │ Let's explore alternative data sources...        │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  │ ┌─────────────────────────────────────────────────┐ │ │
│  │ │ Feature Selection          [features]           │ │ │
│  │ │ How should we approach feature engineering...   │ │ │
│  │ └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │              [Discard]  [Accept & Add]                │ │
│  └───────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────┘
                                │ User clicks Accept
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 WizardContext                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ dispatch({ type: 'UPDATE_PROBLEM',                   │ │
│  │            payload: updatedProblem })                 │ │
│  │                                                       │ │
│  │ Preserves:                                            │ │
│  │ - currentNodeId                                       │ │
│  │ - path                                                │ │
│  │ - visitedNodeIds                                      │ │
│  └───────────────────────────┬───────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tree Re-renders                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ReactFlow automatically:                              │ │
│  │ - Adds new nodes to layout                            │ │
│  │ - Creates new edges                                   │ │
│  │ - Maintains current view position                     │ │
│  │ - Shows updated tree with new branch                  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Edit Type Behaviors

### 1. Add Choice (Question Node)

**Before:**
```yaml
- id: data_question
  type: question
  choices:
    - label: "SQL Database"
      next: features_1
    - label: "Data Lake"
      next: features_2
```

**After clicking "+ Add Choice":**
```yaml
- id: data_question
  type: question
  choices:
    - label: "SQL Database"
      next: features_1
    - label: "Data Lake"
      next: features_2
    - label: "Hybrid approach"      # NEW
      next: branch_1234_data_hybrid # NEW (points to new branch)
```

### 2. Add Decision (Info Node)

**Before:**
```yaml
- id: data_info
  type: info
  next: features_1
```

**After clicking "+ Add Decision":**
```yaml
- id: data_info
  type: question              # Changed from info
  choices:
    - label: "Continue as before"
      next: features_1        # Original path preserved
    - label: "Alternative approach"
      next: branch_1234_alt_1 # New branch
```

### 3. Continue (Terminal Node)

**Before:**
```yaml
- id: monitoring_end
  type: terminal
```

**After clicking "+ Continue":**
```yaml
- id: monitoring_end
  type: info                  # Changed from terminal
  next: branch_1234_advanced_1  # New branch
```

## LLM Prompt Structure

### For Branch Generation

**System Prompt (from Edge Function):**
```
You are an expert ML system design interviewer.
Generate NEW branch nodes to extend an existing decision tree.

RULES:
1. Generate ONLY new nodes (not the entire tree)
2. Use unique IDs with a "gen_" prefix
3. Continue from target node's stage through remaining stages
4. End with terminal node in monitoring stage
```

**User Prompt:**
```
Existing tree YAML:
```yaml
[full existing tree]
```

Target node ID: data_question
Target node stage: data
User request: Hybrid approach combining SQL and NoSQL

Generate ONLY the new branch nodes as a YAML array.
```

## State Management

### WizardContext State Flow

```
Initial State:
{
  problem: Problem,
  currentNodeId: "data_1",
  path: ["root", "data_1"],
  visitedNodeIds: Set(["root", "data_1"])
}

↓ UPDATE_PROBLEM action

Updated State:
{
  problem: UpdatedProblem,        # New nodes added
  currentNodeId: "data_1",         # PRESERVED
  path: ["root", "data_1"],        # PRESERVED
  visitedNodeIds: Set(["root", "data_1"])  # PRESERVED
}
```

### Why UPDATE_PROBLEM vs SET_PROBLEM?

- **SET_PROBLEM**: Resets to root, clears path, used when loading new problem
- **UPDATE_PROBLEM**: Preserves navigation, used when extending current problem

## Error Handling Flow

```
Generate Click
    │
    ▼
Try Supabase Edge Function
    │
    ├─▶ Success ──────────────────────┐
    │                                  │
    └─▶ Fail ──▶ Try Local API Key    │
                    │                  │
                    ├─▶ Success ───────┤
                    │                  │
                    └─▶ Fail ──────────┤
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │ Parse YAML               │
                        │  ├─▶ Success ─────────┐  │
                        │  └─▶ Fail ──▶ Error   │  │
                        └──────────┬──────────────┘
                                   │
                                   ▼
                        ┌──────────────────────────┐
                        │ Merge Branch             │
                        │  ├─▶ Valid ──────────┐   │
                        │  └─▶ Invalid ─▶ Error│   │
                        └──────────┬─────────────┘
                                   │
                                   ▼
                              Show Preview
```

## File Interaction Map

```
TreeNode.tsx
    │
    ├─▶ Import EditType ──────────┐
    │                             │
    └─▶ Call onBranchEdit ────┐   │
                              │   │
TreeGraph.tsx                 │   │
    │                         │   │
    ├─▶ Import EditType ◀─────┼───┘
    ├─▶ Import BranchEditModal│
    │                         │
    ├─▶ Receive callback ◀────┘
    │
    └─▶ Render modal ────────┐
                             │
BranchEditModal.tsx          │
    │                        │
    ├─▶ Import mergeBranch ◀─┼───┐
    ├─▶ Import Problem       │   │
    │                        │   │
    └─▶ Call LLM ───────┐    │   │
                        │    │   │
                        ▼    │   │
                  Get YAML   │   │
                        │    │   │
                        ▼    │   │
                 Parse nodes │   │
                        │    │   │
                        └────┼───┘
                             │
mergeBranch.ts               │
    │                        │
    ├─▶ Import Problem ◀─────┘
    ├─▶ Import validateTree
    │
    └─▶ Return merged problem ────┐
                                   │
WizardContext.tsx                  │
    │                              │
    └─▶ UPDATE_PROBLEM action ◀────┘
```

## User Experience Timeline

```
0s    │ User hovers over node
      │ "+ Add Choice" button fades in
      │
0.2s  │ User clicks button
      │ Modal opens with fade animation
      │
2s    │ User types "Hybrid approach"
      │ Adds description
      │
2.5s  │ Clicks "Generate"
      │ Button disabled, spinner shows
      │
5s    │ LLM responds with YAML
      │ Status: "Parsing nodes..."
      │
5.2s  │ Nodes parsed successfully
      │ Status: "Merging with existing tree..."
      │
5.4s  │ Validation complete
      │ Preview shows: "5 new nodes"
      │ List of new nodes appears
      │
8s    │ User reviews nodes
      │ Clicks "Accept & Add"
      │
8.2s  │ Success message briefly shows
      │ Modal closes
      │
8.5s  │ Tree re-renders with new branch
      │ Layout adjusts automatically
      │ User sees new nodes in graph
```

## Testing Scenarios

### Happy Path
1. Hover over question node → "+ Add Choice" appears
2. Click button → Modal opens
3. Enter label and description → Generate button enabled
4. Click Generate → LLM called successfully
5. View preview → New nodes shown
6. Click Accept → Tree updates with new branch

### Error Scenarios
1. **No API Key**: Error shown, prompts user to configure
2. **LLM API Error**: Retry button appears
3. **Invalid YAML**: Parse error shown with details
4. **Validation Failed**: Specific validation errors displayed
5. **Network Error**: Error message with retry option

### Edge Cases
1. Empty description → Uses only choice label
2. Very long generation → Loading indicator persists
3. Cancel during generation → Request aborted (if supported)
4. Multiple rapid clicks → Debounced/disabled during processing
