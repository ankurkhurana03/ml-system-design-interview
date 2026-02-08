---
name: new-problem
description: Create a new ML system design interview problem YAML file (full DAG with convergence, dialogue, citations)
user_invocable: true
---

# Create New ML Interview Problem

You are creating a high-quality ML system design interview decision tree as a YAML DAG (directed acyclic graph). The result should be an immersive, educational experience — like a senior ML engineer walking a candidate through a real system design.

## Step 1: Gather Requirements

Ask the user for:
1. **Problem title** (e.g., "Fraud Detection System")
2. **Brief description** (1-2 sentences)
3. **Companies** that commonly ask this (e.g., ["Google", "Meta", "Stripe"])
4. **Domains** it covers (e.g., ["NLP", "Ranking/Search", "Time Series"])
5. **Number of branching points** (1-4, default 2-3)
6. **Key decision topics** (what should the branches be about?)
7. **DAG structure preference**:
   - Full DAG with convergence (recommended for 2+ branches — branches diverge at decisions, converge at shared stages)
   - Pure tree (every path is independent — simpler but more repetitive content)
8. **Dialogue depth**:
   - Full (3-5 natural exchanges per node — best for tutor/mock mode)
   - Basic (2-3 lines per node)
   - None (no dialogue scripts)

## Step 2: Use MCP Tools

If the `ml-interview-tree` MCP server is available:
1. Call `get_schema` to review the current schema (includes DAG convergence docs, citations, companies/domains)
2. Call `scaffold` with the title, description, and branch count to get a valid DAG skeleton
3. Fill in all educational content, dialogue scripts, and citations
4. Call `validate_tree` to verify the result
5. Call `check_references` to verify all next references are valid

If MCP tools are NOT available, follow the manual process in Step 3.

## Step 3: System Prompt — How to Write Great ML Interview Problems

### DAG Diamond Pattern

The **diamond-DAG pattern** is the key structural pattern:

```
              ┌─ Branch A info ─┐
Question ─────┤                  ├──► Convergence node (shared)
              └─ Branch B info ─┘
```

- **Diverge** at question nodes (2-3 choices, each leading to a branch-specific info node)
- **Converge** at a shared node in a later stage where content is the same regardless of prior choice
- Convergence makes sense at: data pipeline, training infrastructure, deployment architecture, monitoring (often shared across design choices)
- Branch-specific content belongs at: metrics (different for regression vs classification), features (depends on model choice), model details (architecture-specific)

Example of convergence in YAML:
```yaml
# Branch A answer leads to shared data node
- id: metrics_regression
  stage: metrics
  type: info
  next: data_pipeline    # ← converges

# Branch B answer also leads to same shared data node
- id: metrics_classification
  stage: metrics
  type: info
  next: data_pipeline    # ← converges

# Shared convergence node — reached from both branches
- id: data_pipeline
  stage: data
  type: info
  next: feature_engineering
```

### Content Guidelines

Each node's `content` field should be **educational and conversational** (100-300 words):

- **Info nodes (interviewer)**: Set context, explain concepts, present constraints. Use markdown: bold for key terms, bullet lists for data sources/requirements, code blocks for formulas.
- **Info nodes (candidate)**: Present analysis, trade-offs, recommendations. Show reasoning process ("I'd choose X because...").
- **Question nodes**: Frame a genuine design decision. Present 2-3 choices with real trade-offs (not a right/wrong answer).
- **Choice answers**: Deep technical explanation (150-300 words). Include: rationale, advantages, disadvantages, real-world examples, when this choice is appropriate vs when the alternative would be better.
- **Terminal nodes**: Summarize the full path of decisions, strengths of the approach, challenges to address. Make the candidate feel they completed a real interview.

Content tone should be:
- **Professional but approachable** — like a senior engineer mentoring, not a textbook
- **Specific** — use real numbers, real companies, real tools (e.g., "LightGBM typically trains in ~30 seconds on 10M rows" not "the model trains quickly")
- **Trade-off focused** — every choice has pros AND cons, acknowledge them
- **Practical** — mention real-world gotchas, production concerns, operational complexity

### Dialogue Guidelines (Critical for Tutor Mode)

Every node should have a `dialogue` array with **3-5 natural exchanges**. This is what makes the tutor/mock interview mode feel like a real conversation, not a lecture.

```yaml
dialogue:
  - speaker: interviewer
    text: "Let's talk about how we'd deploy this model. What architecture would you propose?"
  - speaker: candidate
    text: "I'd start with a batch prediction pipeline. We can generate predictions for all scheduled flights overnight and cache them."
  - speaker: interviewer
    text: "Interesting choice. What about flights where conditions change rapidly — say a sudden storm?"
  - speaker: candidate
    text: "Good point. We could add a real-time refresh layer that re-predicts when significant input changes are detected, like weather alerts or incoming aircraft delays."
  - speaker: interviewer
    text: "That's a nice hybrid approach. Let's explore the details."
```

Key dialogue principles:
- **Interviewer asks probing questions**, sets context, pushes for depth ("What about edge cases?", "How would you handle X?")
- **Candidate demonstrates thinking**, explains reasoning, acknowledges trade-offs ("I'd choose X because... but we'd need to watch out for Y")
- **Natural flow** — the dialogue should read like a real conversation, not Q&A ping-pong
- **Don't just repeat the content** — dialogue should ADD value: clarifying questions, follow-up probes, candidate thought process
- **Match the speaker field** of the node: question nodes are typically `speaker: interviewer` (asking), answer info nodes are typically `speaker: candidate` (explaining their choice)

### Multi-select Usage

Use `multi_select` nodes for **scoping/clarifying questions** at the start of the interview (stage: problem_definition). These let the user configure multiple dimensions simultaneously:

```yaml
- id: pd_scope
  stage: problem_definition
  type: multi_select
  label: "Clarifying Questions"
  speaker: interviewer
  content: "Let's scope the problem..."
  dimensionGroups:
    - id: system_reqs
      label: "System Requirements"
      dimensions:
        - id: latency
          label: "Latency Requirement"
          options:
            - value: real_time
              label: "Real-time (<100ms)"
            - value: batch
              label: "Batch (hourly)"
  defaultRoute: next_node_id
```

Use `question` nodes (not multi_select) for **design decisions** where the user picks ONE approach (regression vs classification, batch vs real-time deployment, etc.).

### Stage Coverage Rules

- Every path from root to terminal MUST touch all 8 stages in order
- Stages don't need equal numbers of nodes — problem_definition and monitoring often have more
- Branching typically happens at: metrics (regression vs classification), features (feature strategy), model (architecture choice), deployment (batch vs real-time)
- The first stage (problem_definition) should include: problem intro, multi_select scoping, ML formulation

### Citation Integration

Add `citations` when referencing:
- Specific papers or research
- Industry blog posts about real systems
- Documentation for tools/frameworks mentioned
- Standard references (NOAA weather API, FAA data, etc.)

```yaml
citations:
  - "https://arxiv.org/abs/xxxx.xxxxx"
  - "https://engineering.uber.com/example-post"
```

### ID Naming Convention

Use descriptive, stage-prefixed IDs:
- `pd_start`, `pd_scope`, `pd_formulation` (problem_definition)
- `met_question`, `met_regression`, `met_classification` (metrics)
- `data_pipeline`, `data_quality` (data)
- `feat_question`, `feat_temporal`, `feat_realtime` (features)
- `mod_question`, `mod_boosting`, `mod_neural` (model)
- `train_strategy`, `train_validation` (training)
- `deploy_question`, `deploy_batch`, `deploy_realtime` (deployment)
- `mon_question`, `mon_drift`, `mon_ab_testing`, `mon_terminal` (monitoring)

## Step 4: YAML Structure Reference

### Complete Problem with all fields:
```yaml
id: kebab-case-id
title: "Display Title"
description: "Brief description of the problem"
companies: ["Google", "Amazon", "Stripe"]
domains: ["Tabular/Structured", "Time Series"]
root: pd_start
nodes:
  # Info node
  - id: pd_start
    stage: problem_definition
    type: info
    label: "Problem Statement"
    speaker: interviewer
    content: |
      **Full markdown** supported here.

      - Bullet points
      - Bold **terms**
      - Code: `model.predict(X)`
    next: pd_scope
    dialogue:
      - speaker: interviewer
        text: "Welcome! Today we'll design..."
      - speaker: candidate
        text: "Interesting! Can you tell me more about..."
      - speaker: interviewer
        text: "Sure. The system needs to..."
    citations:
      - "https://example.com/reference"

  # Multi-select node (for scoping)
  - id: pd_scope
    stage: problem_definition
    type: multi_select
    label: "Clarifying Questions"
    speaker: interviewer
    content: "Select your assumptions for each dimension."
    dimensionGroups:
      - id: requirements
        label: "Requirements"
        dimensions:
          - id: dim_1
            label: "Dimension 1"
            description: "What aspect to consider?"
            options:
              - value: opt_a
                label: "Option A"
              - value: opt_b
                label: "Option B"
    defaultRoute: pd_formulation
    dialogue:
      - speaker: interviewer
        text: "Before we dive in, let's clarify some requirements..."

  # Question node (branching decision)
  - id: met_question
    stage: metrics
    type: question
    label: "Metric Selection"
    speaker: interviewer
    content: "How should we measure success?"
    choices:
      - label: "Precision-focused metrics"
        answer: |
          Detailed explanation (150-300 words) of why
          precision-focused metrics are appropriate...
        next: met_precision_info
      - label: "Recall-focused metrics"
        answer: |
          Detailed explanation of recall-focused approach...
        next: met_recall_info
    dialogue:
      - speaker: interviewer
        text: "Now let's think about metrics..."

  # Terminal node
  - id: mon_terminal
    stage: monitoring
    type: terminal
    label: "Interview Complete"
    speaker: interviewer
    content: |
      Excellent work! Summary of all decisions made...
```

## Step 5: Write the File

Save the YAML to: `src/data/problems/<id>.yaml`

Then update `src/data/problems/index.ts` to export the new problem:

```typescript
import newProblemYaml from './<id>.yaml?raw';

// Inside loadBuiltinProblems():
const newProblem = parse(newProblemYaml) as BuiltinProblem;
problems.push(newProblem);
```

## Step 6: Validate

1. If MCP available: `validate_tree` + `check_references` on the YAML
2. `npm run build` — verify no build errors
3. `npx vitest run` — verify all tests pass
4. Check in browser: load the problem, navigate all paths, verify graph shows DAG convergence visually

## Target Metrics

A well-crafted problem should have:
- **25-40 nodes** for 2-3 branching points
- **2-4 convergence points** (diamond-DAG pattern)
- **100+ unique paths** through the DAG
- **Every node** has dialogue (3-5 lines) and educational content (100-300 words)
- **All 8 stages** covered in every path
- **Natural conversational flow** in tutor mode — should feel like a real interview, not a quiz
