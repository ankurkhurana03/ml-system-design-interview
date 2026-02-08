---
name: new-problem
description: Create a new ML system design interview problem YAML file
user_invocable: true
---

# Create New ML Interview Problem

You are helping create a new ML system design interview decision tree YAML file.

## Step 1: Gather Requirements

Ask the user for:
1. **Problem title** (e.g., "Fraud Detection System")
2. **Brief description** (1-2 sentences)
3. **Number of branching points** (1-3, default 2)
4. **Key decision topics** (what should the branches be about?)

## Step 2: Use MCP Tools

If the `ml-interview-tree` MCP server is available:
1. Call `get_schema` to review the current schema
2. Call `scaffold` with the title, description, and branch count to get a valid skeleton
3. Fill in the educational content for each node
4. Call `validate_tree` to verify the result

If MCP tools are NOT available, follow the manual process below.

## Step 3: Manual Process (fallback)

Generate the YAML following these STRICT rules:

### Valid Stages (must appear in this order)
1. `problem_definition` - Problem scoping, ML framing
2. `metrics` - Success metrics, KPIs
3. `data` - Data sources, pipelines
4. `features` - Feature engineering
5. `model` - Model selection, architecture
6. `training` - Training strategy, optimization
7. `deployment` - Serving, infrastructure
8. `monitoring` - Production monitoring, alerting

### Valid Node Types
- `info` - Displays content, requires `next` field pointing to another node
- `question` - Branching point, requires `choices` array with 2+ options (each with label, answer, next)
- `terminal` - End of path, NO `next` or `choices` allowed
- `multi_select` - Multi-dimension selection (advanced, use sparingly)

### YAML Structure
```yaml
id: kebab-case-id
title: "Display Title"
description: "Brief description"
root: first_node_id
nodes:
  - id: unique_id
    stage: one_of_8_stages
    type: info|question|terminal
    label: "Short label (5-20 words)"
    speaker: interviewer|candidate
    content: |
      Detailed content (50-300 words)
    next: next_node_id  # only for info nodes
    choices:             # only for question nodes
      - label: "Option name"
        answer: "3-5 sentence explanation"
        next: target_node_id
```

### Critical Rules
1. ALL 8 stages must appear in every path from root to terminal
2. ALL branches must end with a `terminal` node in `monitoring` stage
3. ALL `next` references must point to existing node IDs
4. Question nodes need 2+ choices
5. Use descriptive IDs: `pd_1`, `metrics_question`, `data_sources`, etc.
6. Alternate speakers for natural dialogue flow
7. Make answers educational (explain trade-offs, real-world examples)

### ID Naming Convention
- Stage prefix: `pd_`, `metrics_`, `data_`, `feat_`, `model_`, `train_`, `deploy_`, `mon_`
- For branches: `metrics_a_1`, `metrics_b_1` (path A vs B)
- Terminal: `mon_a_terminal`, `mon_b_terminal`

## Step 4: Write the File

Save the YAML to: `src/data/problems/<id>.yaml`

Then update `src/data/problems/index.ts` to export the new problem by adding it to the imports and the `builtinProblems` array.

The index.ts file follows this pattern:

```typescript
import newProblemYaml from './<id>.yaml?raw';
```

Add the import at the top, then inside `loadBuiltinProblems()` add:

```typescript
const newProblem = parse(newProblemYaml) as Problem;
problems.push(newProblem);
```

## Step 5: Validate

Run `npx vitest run tests/unit/yamlLoader.test.ts` to ensure the YAML loads correctly.
Run `npm run build` to verify no build errors.

## Example Output

For "Build a fraud detection system for a payment processor" with 2 branches:
- Branch at problem_definition: "Rule-based vs ML-first approach"
- Branch at model: "Gradient boosting vs Neural network"
- ~20-30 nodes total
- Each path covers all 8 stages
- Educational content about fraud detection trade-offs
