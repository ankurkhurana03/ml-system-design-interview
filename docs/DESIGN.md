# ML System Design Interview Tool — Design Document

## 1. Overview

An interactive web app that guides users through ML system design interviews using a decision tree. At each stage of the standard ML design template (Problem Definition → Metrics → Data → Features → Model → Training → Deployment → Monitoring), clarifying questions branch the solution path — e.g., choosing regression vs. classification leads to different metrics, models, and deployment strategies.

Users can also bring their own LLM (any OpenAI-compatible API) to auto-generate new problem trees, and publish them to a public gallery.

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + TypeScript + Vite | ReactFlow is React-native; Vite gives fast dev/build |
| Tree visualization | @xyflow/react (ReactFlow v12) + @dagrejs/dagre | Interactive graph with auto-layout, zoom/pan, click-to-navigate |
| Styling | Tailwind CSS 4 | Utility-first, fast iteration |
| Auth + DB | Supabase (hosted PostgreSQL + OAuth + Edge Functions) | GitHub/Google OAuth out-of-box, DB for gallery, edge functions for LLM proxy |
| LLM proxy | Supabase Edge Function | Receives user's stored API key + base URL, proxies to their LLM. Avoids CORS |
| Tree format | YAML files | Human-readable, diff-friendly, version-controllable |
| Transcript | Client-side Blob | No backend needed for downloads |
| Unit Testing | Vitest | Fast, Vite-native, ESM-first |
| E2E Testing | Playwright | Cross-browser, reliable, great DX |

## 3. Decision Tree YAML Schema

Each problem is a single YAML file. Node types:
- **`info`** — displays content, advances linearly via `next`
- **`question`** — presents branching choices, each with an ideal `answer`
- **`terminal`** — end of a path

```yaml
id: flight-delay
title: "Flight Delay Prediction"
description: "Design an ML system to predict flight delays for a major airline."
root: start

nodes:
  - id: start
    stage: problem_definition
    type: info
    label: "Problem Statement"
    speaker: interviewer
    content: |
      Let's design an ML system for predicting flight delays...
    next: q_framing

  - id: q_framing
    stage: problem_definition
    type: question
    label: "Regression vs Classification"
    speaker: interviewer
    content: |
      Should we predict delay in minutes or classify {early, on-time, late}?
    choices:
      - label: "Regression (predict minutes)"
        answer: |
          I'd frame this as regression — predicting delay in minutes...
        next: reg_metrics
      - label: "Classification"
        answer: |
          I'd frame this as multi-class classification with buckets...
        next: cls_metrics

  - id: end
    stage: monitoring
    type: terminal
    label: "Design Complete"
    speaker: interviewer
    content: "Excellent — comprehensive design!"
```

The `speaker` field + `choices[].answer` field enable the downloadable transcript to read as a real interviewer/candidate dialogue.

## 4. State Architecture

### WizardContext (React Context + useReducer)

```
State: {
  problem: Problem | null
  currentNodeId: string
  path: PathEntry[]
  visitedNodeIds: Set<string>
}

Actions:
  SET_PROBLEM    → Load new problem, reset state
  SELECT_CHOICE  → Pick choice at question node, advance
  ADVANCE        → Continue from info node
  GO_BACK        → Pop last path entry
  RESET          → Return to root
  JUMP_TO_NODE   → Jump to visited node (graph click)
```

### Graph + Wizard Sync

```
┌──────┬───────────────────────┬───────────────────────┐
│      │   GRAPH VIEW          │   WIZARD VIEW         │
│ SIDE │   (ReactFlow)         │                       │
│ BAR  │                       │  [Stage Indicator]    │
│      │   Full tree visible.  │  [Path Breadcrumb]    │
│ List │   Active path = blue  │  [Current Q/A Card]   │
│  of  │   Current = pulsing   │  [Choice Buttons]     │
│probs │   Unvisited = gray    │                       │
│      │                       │  [Download Transcript]│
│ [+]  │   Click a choice node │  [Generate New]       │
│ New  │   = same as wizard    │                       │
└──────┴───────────────────────┴───────────────────────┘
```

Both views consume WizardContext. Clicking a choice in either view dispatches the same action; both views re-render.

## 5. Storage Architecture

### GitHub-Backed Gallery
Published YAML problem files live in a public GitHub repo. Why:
- Version history on every tree edit (free)
- PR-based contribution workflow (community review)
- Anyone can fork and customize
- YAML diffs are human-readable in GitHub's UI
- CI can validate YAML against schema on every PR

### Supabase (lightweight, for user state + comments)

**Tables:**
- `user_settings` — LLM API keys, base URL, model name (secrets stay out of GitHub)
- `user_drafts` — User's private/draft problems before publishing
- `node_comments` — Community suggestions, questions, and feedback on individual nodes
- `admin_users` — Users with moderator/admin roles for comment moderation

**Row-level security** ensures users can only access their own data. Approved comments are publicly readable. Admins can manage all comments.

### Access Model
- **Reading content**: No login required. All tree content and approved comments are publicly accessible.
- **Commenting**: Allowed without login (stored with guest name). Login enables persistence across devices.
- **Generating trees**: Requires LLM API key (stored in `user_settings`).
- **Moderation**: Requires admin role in `admin_users` table.

## 6. LLM Tree Generation

### Flow
1. User clicks "+ Generate New Problem"
2. Modal opens → user enters problem description
3. App calls Supabase Edge Function with user's description
4. Edge function fetches user's LLM settings (API key, base URL)
5. Edge function calls user's LLM with system prompt (YAML schema + example + instructions)
6. Generated YAML is validated client-side and shown in preview
7. User can edit, save (private), or publish (public)

### Interactive Branch Editing
Users can extend any tree:
- **At question nodes**: "+ Add Choice" → LLM generates answer + downstream nodes
- **At info nodes**: "+ Add Decision Point" → converts to question with LLM branch
- **At terminal nodes**: "+ Continue" → LLM generates additional nodes

## 7. Transcript Download

Client-side markdown generation from the path taken:
```markdown
# ML System Design Interview: Flight Delay Prediction
**Date**: 2026-02-07

## Problem Definition
**Interviewer**: Let's design an ML system...
> **Decision**: Regression vs Classification
> **Choice**: Regression (predict minutes)
**Candidate**: I'd frame this as regression...

## Metrics
...
```

## 8. Community Comments & Suggestions

Every node in the decision tree has a collapsible comments section where users can:
- **Suggest** alternative questions or approaches for that stage
- **Ask questions** about the content or ML concepts
- **Leave feedback** on the quality of the node's content

### Comment Schema
```sql
node_comments (
  id, problem_id, node_id, user_id, author_name,
  content, comment_type, parent_id, status,
  created_at, updated_at
)
```

- `comment_type`: `suggestion` | `question` | `feedback` | `answer`
- `status`: `pending` | `approved` | `answered` | `rejected`
- `parent_id`: enables threaded replies (answers to questions)

### No-Login Commenting
Users can comment without signing in by providing a display name. Comments are stored with `user_id = null` and the provided `author_name`. For users without Supabase configured, comments fall back to localStorage.

### Moderation

#### Configurable Moderation Modes (Moltbook-Inspired)
Admins select one of three moderation modes via `moderation_config`:

| Mode | Behavior |
|------|----------|
| **Full Auto** | AI processes all pending comments autonomously — no human in the loop. Comments are approved/rejected based on configurable rules and a confidence threshold (default 0.7). Low-confidence decisions are flagged for review. |
| **AI-Assisted** | AI evaluates and suggests actions, but a human admin reviews and confirms each decision before it takes effect. |
| **Manual** | Traditional queue — admin sees all pending comments and manually approves/rejects/replies. |

#### Moderation Rules (Configurable Rulebook)
Admins define rules in a JSON rulebook stored in `moderation_config.rules`:
- **Relevance**: Comment must relate to ML system design content
- **Constructiveness**: No low-effort or unconstructive comments
- **Appropriateness**: No spam, profanity, or personal attacks
- **Custom rules**: Admins can add domain-specific rules (e.g., "reject promotional content")

The `moderate-comments` edge function sends these rules alongside the comment to the LLM, which returns a decision with a confidence score (0-1). In Full Auto mode, decisions above the threshold are applied immediately.

#### Manual Moderation (Admin Panel)
Admins access a dedicated moderation panel (modal) with tabs:
- **Queue**: Pending comments with approve/reject/reply actions, filtering by problem/node/author/type, bulk actions
- **Settings**: Mode selector cards, rules editor, confidence threshold slider
- **Audit Log**: Searchable table of all moderation actions (AI and human) with CSV export
- **Analytics**: Summary cards (total actions, approval rate, AI vs human split), action distribution chart, 7-day activity timeline

#### LLM Agent Moderation
The `moderate-comments` Supabase Edge Function:
- Evaluates each comment against the configured rulebook
- Returns `approved` or `rejected` decisions with reasons and confidence scores
- Auto-generates answers to questions when possible (inserted as reply with `comment_type: 'answer'`, `author_name: 'AI Moderator'`)

#### Auto-Responder
The `auto-respond` edge function automatically answers unanswered questions:
- Triggered by polling (30s interval) when auto-respond is enabled
- Uses node context (problem title, node content, stage) for relevant answers
- Inserts answers as `comment_type: 'answer'` with `author_name: 'AI Assistant'`
- Tracks responded comment IDs to prevent duplicates

#### Audit Log & Analytics
All moderation actions (approve, reject, auto-moderate, auto-respond) are logged to `moderation_audit_log`:
- Actor (admin user or 'system' for AI), action type, target comment, reason, confidence score
- Filterable by date range, actor, action type
- Exportable as CSV for compliance/reporting
- Analytics dashboard shows approval rates, AI vs human action split, and 7-day activity trends

Admin roles are stored in `admin_users` table with `role: 'moderator' | 'admin'`.

## 9. Stage Color Coding

| Stage | Color | Hex |
|-------|-------|-----|
| Problem Definition | Blue | #3b82f6 |
| Metrics | Purple | #a855f7 |
| Data | Green | #22c55e |
| Features | Amber | #f59e0b |
| Model | Red | #ef4444 |
| Training | Orange | #f97316 |
| Deployment | Cyan | #06b6d4 |
| Monitoring | Pink | #ec4899 |

## 10. Testing Strategy

**Coverage target: 80%+ feature coverage across unit and e2e tests.**

### Unit Tests (Vitest) — `tests/unit/`
- YAML parsing and validation (`validateTree`, `yamlLoader`)
- Tree traversal utilities (`treeTraversal`)
- Layout computation (`layoutEngine`)
- Transcript generation (`generateTranscript`)
- WizardContext reducer logic
- Comment hook logic (`useNodeComments`)
- Admin hook logic (`useAdmin`)

### E2E Tests (Playwright) — `tests/e2e/`
- **App loading**: Sidebar renders, problem auto-loads, wizard shows first node
- **Wizard navigation**: Continue through info nodes, pick choices at question nodes, back button, full path completion
- **View modes**: Toggle between Graph Only / Split / Wizard Only
- **Sidebar**: Collapse/expand, search/filter problems
- **Transcript**: Complete a path and download markdown file
- **Settings**: Open/close LLM settings panel
- **Comments**: Open comment section, submit a suggestion, see it appear
- **Moderation**: Admin sees pending queue, approves/rejects comments
- **Generate**: Enter problem description, generate tree, preview

### Coding Standards
- ESLint + Prettier with pre-commit hooks (Husky + lint-staged)
- TypeScript strict mode
- `data-testid` attributes on key interactive elements for stable e2e selectors

## 11. Database Schema (Complete)

```sql
-- User LLM settings
user_settings (user_id PK, llm_base_url, llm_api_key_encrypted, llm_model)

-- Draft problems
user_drafts (id PK, user_id FK, title, description, yaml_content)

-- Node comments
node_comments (id PK, problem_id, node_id, user_id FK nullable, author_name,
               content, comment_type, parent_id FK self, status, vote_score)

-- Comment votes
comment_votes (id PK, comment_id FK, user_id FK nullable, user_fingerprint,
               vote_type check('up','down'), unique(comment_id, user_fingerprint))

-- Admin roles
admin_users (user_id PK, role check('moderator','admin'))

-- Gallery
gallery_problems (id PK, user_id FK, title, description, yaml_content,
                  difficulty, tags, upvote_count)
gallery_upvotes (id PK, problem_id FK, user_id FK, unique(problem_id, user_id))

-- Moderation config (singleton per admin)
moderation_config (id PK, user_id FK, mode check('full_auto','ai_assisted','manual'),
                   rules JSONB, confidence_threshold float default 0.7,
                   auto_respond_enabled boolean default false)

-- Moderation audit log
moderation_audit_log (id PK, actor_id FK nullable, actor_type check('admin','system'),
                      action check('approve','reject','auto_moderate','auto_respond','flag'),
                      comment_id FK, reason text, confidence float, created_at)
```

All tables use RLS. Comments are publicly readable when approved. Users manage their own settings/drafts. Admins manage all comments and moderation config. Audit log is admin-readable only.

## 12. Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `generate-tree` | Proxies LLM call to generate new YAML decision tree | User clicks "Generate" |
| `moderate-comments` | Sends pending comments to LLM for moderation with configurable rules and confidence scoring | Auto (Full Auto mode polling) or manual (admin clicks "Auto-Moderate") |
| `answer-question` | Generates context-aware AI answers for node-specific questions | User clicks "Ask AI" on a node |
| `auto-respond` | Automatically answers unanswered questions using node context | 30s polling when auto-respond is enabled |

All functions read the requesting user's LLM settings from `user_settings` to proxy the call.

## 13. Interactive Branch Editing

Users can extend any tree by adding new branches via LLM:
- **At question nodes**: "Add Choice" button generates a new answer + downstream nodes
- **At info nodes**: "Add Decision" converts to a question node with LLM-generated branch
- **At terminal nodes**: "Continue" extends with additional nodes

The `mergeBranch` utility handles ID collision avoidance (prefix: `branch_{timestamp}_`), tree validation, and three edit modes. The BranchEditModal provides a preview before accepting changes.

## 14. Public Gallery

Published problems are stored in the `gallery_problems` Supabase table:
- Browse gallery modal with search, sort (newest/upvoted/alphabetical), and difficulty filter
- Responsive grid layout (1/2/3 columns)
- Upvoting system with `gallery_upvotes` table (one vote per user per problem)
- Publish modal with difficulty selector and tags input
- Gallery problems appear alongside built-in ones in the sidebar

## 15. Polish Features (Implemented)

- **Comparison mode**: After completing a path, view alternate branches not taken at each decision point
- **Practice timer**: Optional 45-minute countdown with yellow (5min) and red (1min) warnings
- **Notes panel**: Per-problem notes persisted to localStorage, exported with transcript
- **Keyboard navigation**: Number keys (1-9) for choices, Enter/Space to continue, Backspace/Escape to go back, R to reset
- **Responsive layout**: Mobile-friendly with stacked layouts, abbreviated button text
- **Markdown rendering**: Node content and choice answers render rich markdown (bold, code, lists)
- **Comment voting**: Upvote/downvote with optimistic UI, localStorage fallback for guests, sort by votes or newest
- **AI-generated answers**: "Ask AI" panel on each node, edge function proxy, saves Q&A as comments
- **Voice-over mode**: Web Speech API with speaker-differentiated voices, play/pause/stop, speed control (0.5x-2x), auto-advance through info nodes

## 16. Future Enhancements
- **Streaming AI responses**: Stream LLM answers for better UX
- **Practice session analytics**: Track time spent per stage, choices made, scores
- **Spaced repetition**: Schedule review of weak areas
- **Collaborative sessions**: Real-time multi-user interview practice
- **Custom problem templates**: User-defined stage templates beyond the standard 8
- **Export to PDF**: Formatted PDF transcript with diagrams
- **Offline mode**: Service worker for offline tree browsing
