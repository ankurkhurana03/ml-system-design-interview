# ML System Design Interview Tool -- Design Document

## 1. Overview

An interactive web application that guides users through ML system design interviews using decision trees. Users navigate through the 8 standard ML design stages -- Problem Definition, Metrics, Data, Features, Model, Training, Deployment, and Monitoring -- with branching paths that reflect real design trade-offs. Each decision leads to different downstream considerations, mirroring the open-ended nature of actual ML system design interviews.

The app ships with **53 built-in problems** spanning recommendation systems, search ranking, fraud detection, NLP, computer vision, generative AI, and MLOps infrastructure. Users can also generate new problems using any OpenAI-compatible LLM, publish them to a community gallery, and practice in three distinct interview modes.

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 + TypeScript 5.9 + Vite 7 | Component framework with strict typing and fast HMR |
| Tree Visualization | @xyflow/react (ReactFlow v12) + @dagrejs/dagre | Interactive DAG graph with auto-layout, zoom/pan, minimap |
| Styling | Tailwind CSS 4 + `@tailwindcss/vite` plugin | Utility-first CSS with `@import "tailwindcss"` syntax |
| Markdown | react-markdown + remark-gfm | Rich content rendering (bold, code blocks, lists, tables) |
| Auth + DB | Supabase (PostgreSQL + OAuth + Edge Functions) | GitHub/Google OAuth, DB for gallery/comments, RLS policies |
| LLM Proxy | Supabase Edge Functions | Proxies to user's OpenAI-compatible API (avoids CORS) |
| TTS Engine | Web Speech API + kokoro-js | Voice-over with speaker-differentiated voices |
| Tree Format | YAML (`yaml` package) | Human-readable, diff-friendly, validated at load time |
| Compression | lz-string | Draft/session compression for localStorage |
| Unit Testing | Vitest 4 + Testing Library | 465+ tests across 31 files |
| E2E Testing | Playwright | 22 test specs covering critical user flows |
| Linting | ESLint 9 + Prettier + Husky + lint-staged | Pre-commit formatting and lint enforcement |

## 3. Key Features

### 3.1 Built-in Problem Library

53 YAML-defined ML system design problems organized across domains:

- **Ranking/Search**: Search engine ranking, YouTube video search, Amazon autocomplete, query understanding, podcast search
- **Recommendation**: Netflix top picks, Spotify Discover Weekly, TikTok For You, Instagram Explore, Pinterest home feed, Twitter news feed, similar artists
- **Ads**: Ad CTR prediction, ads reranking/calibration, bad ad detection, real-time ad auction
- **Fraud/Safety**: Fraud detection, bot detection, content moderation, harmful content (visual), fake news detection
- **NLP**: Sentiment analysis, language detection, machine translation, support chatbot, ticket classification
- **Computer Vision**: Self-driving detection, landmark recognition, privacy blurring, visual search, recycling classifier, document extraction
- **Pricing/Forecasting**: Dynamic pricing, Uber dynamic pricing, demand forecasting, insurance claim estimation, flight delay prediction
- **Infrastructure/MLOps**: Feature store, evaluation store, experimentation platform, drift monitoring, distributed training, RAG system
- **Marketplace**: Ride matching, Airbnb occupancy, food delivery ranking, duplicate listing detection
- **Social**: LinkedIn PYMK, notification relevance
- **Generative AI**: Text-to-image, voice assistant

### 3.2 Three Interview Modes

| Mode | Description | Key Settings |
|------|-------------|-------------|
| **Mock Interview** | Simulates a real interview with timer, dialogue, and voice | Timer enforced, no hints/graph/notes, dialogue-driven, voice auto-enabled |
| **Tutor** | Guided learning with full explanations and AI assistance | All features enabled (hints, comparison, notes, Ask AI, dialogue, graph) |
| **Designer** | Free exploration of the tree structure | All features enabled except dialogue and voice; exploration-focused |

Mode presets are defined in `ModeContext` and control 15+ UI feature flags including `timerEnforced`, `showHints`, `showComparison`, `showAskAI`, `showGraph`, `useDialogue`, and `voiceAutoEnabled`.

### 3.3 DAG Decision Trees

Trees are directed acyclic graphs (not simple trees) supporting:

- **Convergence nodes**: Multiple branches rejoin at shared downstream nodes (diamond pattern), reducing redundancy
- **Multi-select nodes**: Users select from dimension groups (e.g., latency requirements + data volume + serving pattern) with route-based dispatching
- **Dialogue scripts**: Per-node `dialogue[]` arrays with `speaker: interviewer | candidate` for tutor/mock modes
- **Citations**: Nodes can include `citations[]` URLs for source attribution

### 3.4 LLM Integration

**Multi-provider support** with presets for OpenAI, Perplexity, Ollama, and custom endpoints:

- **Scaffold-first generation**: `scaffoldTree()` generates a structurally valid skeleton (IDs, stages, types, `next` references); the LLM only fills content -- ensuring structural validity regardless of LLM quality
- **Quick mode**: 1 branch, single LLM call, ~30s generation
- **Extensive mode**: 3 branches, progressive background generation with `useProgressiveGeneration` hook and `GenerationProgressBar` UI
- **Gap-filling**: `findUnfilledNodes()` + `buildGapFillingPrompt()` handles truncated LLM responses with a second pass
- **Ensemble mode**: Combine responses from multiple LLM providers
- **Streaming**: Real-time response streaming for better UX
- **Robust parsing**: `tryParseJSON()` fixes truncated JSON; `stripThinkingBlocks()` removes `<think>` tags from reasoning models; `repairNodes()` converts broken question nodes to info nodes

### 3.5 Source Grounding

NotebookLM-inspired source management for grounding LLM responses in user-provided context:

- **Jina Reader API** (`r.jina.ai`): Extracts content from URLs as clean text
- **Jina Search API** (`s.jina.ai`): Web search for relevant sources
- **Source injection**: `buildSourceContext()` and `injectSourcesIntoPrompt()` append source content to LLM prompts within a token budget (12,000 chars max, 4,000 per source)
- **Citation extraction**: `extractCitationsFromText()` parses numbered `[1]`, `[2]` references from LLM output
- **Auto-search**: Automatically finds relevant sources for a problem
- **UI**: `SourcesPanel` with URL/text input, budget bar, source list management

### 3.6 Voice-Over and Hands-Free Mode

**Voice-over** (TTS): Web Speech API with speaker-differentiated voices (interviewer vs. candidate), play/pause/stop controls, speed adjustment (0.5x--2x), auto-advance through info nodes.

**Hands-free mode** (TTS + STT coordination):

- Always-on speech recognition with voice commands: "continue", "go back", "repeat", "select option N", "reset", "pause", "resume"
- Freeform text accumulation with 1,500ms silence debounce
- TTS/STT coordination: pauses recognition while speaking, resumes 600ms after
- Auto-restart on recognition end (300ms delay)
- Toggle auto-enables voice-over + auto-advance; persists to localStorage

### 3.7 LLM Dynamic Interview

In mock interview and tutor modes, users can type or speak freeform answers instead of selecting predefined choices:

- **Classification**: LLM classifies the response as `match_choice` (maps to existing choice), `clarification` (interviewer asks follow-up), or `novel_answer` (user's unique approach)
- **Novel branch generation**: For `novel_answer`, the LLM generates new downstream nodes that are merged into the tree via `mergeBranch`
- **Convergence-aware**: `getDownstreamSummaries()` provides downstream context so generated branches can converge back to existing nodes
- **Branch moderation**: Novel branches can be submitted for community/admin review

### 3.8 Interactive Branch Editing

Users can extend any tree:

- **At question nodes**: "Add Choice" button generates a new answer + downstream nodes via LLM
- **At info nodes**: "Add Decision" converts to a question node with LLM-generated branch
- **At terminal nodes**: "Continue" extends with additional nodes
- **`mergeBranch` utility**: Handles ID collision avoidance (prefix: `branch_{timestamp}_`), tree validation, and preview via `BranchEditModal`

### 3.9 Public Gallery

- Browse, search, sort (newest / most upvoted / alphabetical), and filter by difficulty
- Responsive grid layout (1/2/3 columns)
- Upvoting system (one vote per user per problem)
- Publish modal with difficulty selector and tags
- Gallery problems appear alongside built-in ones in the sidebar

### 3.10 Comments and Moderation

**Per-node comments** with types: `suggestion`, `question`, `feedback`, `answer`. Threaded replies via `parent_id`. No-login commenting with display name (localStorage fallback).

**Moderation modes** (configurable per admin):

| Mode | Behavior |
|------|----------|
| Full Auto | AI processes all pending comments autonomously; confidence threshold (default 0.7) gates auto-approval |
| AI-Assisted | AI suggests actions; admin confirms before applying |
| Manual | Traditional admin queue |

**Admin panel** with tabs: Queue (approve/reject/reply with bulk actions), Settings (mode selector, rules editor, confidence threshold), Audit Log (searchable, CSV export), Analytics (approval rates, AI vs. human split, 7-day trends).

**Edge functions**: `moderate-comments` (rule-based LLM evaluation), `auto-respond` (answers unanswered questions on 30s poll), `moderate-branches` (reviews user-generated branches).

### 3.11 Additional Features

- **Practice timer**: Optional 45-minute countdown with yellow (5 min) and red (1 min) warnings
- **Notes panel**: Per-problem notes persisted to localStorage, exported with transcript
- **Comparison mode**: After completing a path, view alternate branches not taken
- **Keyboard navigation**: Number keys (1--9) for choices, Enter/Space to continue, Backspace/Escape to go back, R to reset
- **Transcript download**: Client-side markdown generation from the path taken, formatted as interviewer/candidate dialogue
- **Session persistence**: Progress saved to localStorage per problem; restored on revisit
- **Dark mode**: System/light/dark theme with `ThemeContext`
- **Graph visualization**: ReactFlow with dagre auto-layout, minimap, stage-based coloring, visit-state highlighting (active = pulsing blue, visited = solid blue, unvisited = gray)
- **Mobile responsive**: Stacked layouts, abbreviated button text, touch-friendly
- **Ask AI**: Per-node AI Q&A panel powered by the user's LLM; answers saved as comments
- **Comment voting**: Upvote/downvote with optimistic UI, localStorage fallback for guests
- **Draft management**: Save, edit, and compress drafts locally before publishing

## 4. Data Model

### Core TypeScript Types (`src/types/tree.ts`)

```typescript
type MLStage = 'problem_definition' | 'metrics' | 'data' | 'features'
             | 'model' | 'training' | 'deployment' | 'monitoring';

type NodeType = 'info' | 'question' | 'terminal' | 'multi_select';
type Speaker = 'interviewer' | 'candidate';

interface TreeNode {
  id: string;
  stage: MLStage;
  type: NodeType;
  label: string;
  speaker: Speaker;
  content: string;                        // Markdown content (100-300 words)
  next?: string;                          // For info nodes
  choices?: Choice[];                     // For question nodes
  dimensionGroups?: DimensionGroup[];     // For multi_select nodes
  routes?: MultiSelectRoute[];            // For multi_select nodes
  defaultRoute?: string;                  // Fallback for multi_select
  dialogue?: DialogueLine[];              // Tutor/mock mode scripts
  citations?: string[];                   // Source URLs
}

interface Choice {
  label: string;
  answer: string;
  next: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  root: string;
  nodes: TreeNode[];
}

interface PathEntry {
  nodeId: string;
  choiceIndex?: number;
  choiceLabel?: string;
  multiSelectValues?: Record<string, string>;
}

type InterviewMode = 'mock_interview' | 'tutor' | 'designer';
```

### Supplementary Types

```typescript
interface ProblemMeta {
  id: string; title: string; description: string;
  author?: string; difficulty?: string;
  tags?: string[]; companies?: string[]; domains?: string[];
  source: 'builtin' | 'gallery' | 'draft';
}

interface NodeComment {
  id: string; problem_id: string; node_id: string;
  user_id?: string; author_name: string; content: string;
  comment_type: 'suggestion' | 'question' | 'feedback' | 'answer';
  parent_id?: string; status: 'pending' | 'approved' | 'answered' | 'rejected';
  vote_score?: number; user_vote?: 1 | -1 | null;
  replies?: NodeComment[];
}

interface UserSource {
  id: string; type: 'url' | 'text';
  url?: string; title: string; content: string;
  summary?: string; addedAt: string; charCount: number;
}

interface InterviewLLMResponse {
  intent: 'match_choice' | 'clarification' | 'novel_answer';
  matchedChoiceIndex?: number;
  interviewerReply: string;
  choiceLabel?: string; choiceAnswer?: string;
}
```

## 5. State Management

### WizardContext (React Context + useReducer)

`WizardContext` is the single source of truth for navigation state. Both the graph view and wizard panel consume it.

```
State:
  problem: Problem | null
  currentNodeId: string
  path: PathEntry[]
  visitedNodeIds: Set<string>

Actions:
  SET_PROBLEM         -- Load problem (restores saved session from localStorage)
  UPDATE_PROBLEM      -- Update problem in-place (preserves navigation; used for live background generation)
  SELECT_CHOICE       -- Pick choice at question node, advance
  SUBMIT_MULTI_SELECT -- Submit multi-select dimension choices
  ADVANCE             -- Continue from info node
  GO_BACK             -- Pop last path entry
  RESET               -- Return to root
  JUMP_TO_NODE        -- Jump to any visited node (graph click)
  APPEND_DIALOGUE     -- Add dynamic dialogue lines to a node (LLM interview)
```

Session state (currentNodeId, path, visitedNodeIds) is automatically persisted to and restored from localStorage per problem ID.

### Other Contexts

| Context | Purpose |
|---------|---------|
| `ModeContext` | Interview mode selection with 15+ feature flags per mode |
| `VoiceOverContext` | TTS state: playing/paused/stopped, speed, auto-advance |
| `HandsFreeContext` | STT state: recognition instance, TTS/STT coordination, voice commands |
| `ThemeContext` | Light/dark/system theme preference |

**Provider nesting order**: `ThemeProvider` > `ModeProvider` > `VoiceOverProvider` > `WizardProvider` > `HandsFreeProvider` > `AppContent`

## 6. YAML Decision Tree Schema

Each problem is a single YAML file. Example:

```yaml
id: flight-delay
title: "Flight Delay Prediction"
description: "Design an ML system to predict flight delays for a major airline."
difficulty: intermediate
root: pd_start

nodes:
  - id: pd_start
    stage: problem_definition
    type: info
    label: "Problem Statement"
    speaker: interviewer
    content: |
      Let's design an ML system for predicting flight delays...
    dialogue:
      - speaker: interviewer
        text: "Let's tackle a real-world problem -- flight delay prediction."
      - speaker: candidate
        text: "I'd start by clarifying the business requirements..."
    next: pd_formulation

  - id: pd_formulation
    stage: problem_definition
    type: question
    label: "Regression vs Classification"
    speaker: interviewer
    content: |
      Should we predict delay in minutes or classify as on-time/delayed?
    choices:
      - label: "Regression (predict minutes)"
        answer: "I'd frame this as regression..."
        next: met_regression
      - label: "Classification (on-time vs delayed)"
        answer: "I'd use binary classification..."
        next: met_classification

  - id: pd_scope
    stage: problem_definition
    type: multi_select
    label: "System Requirements"
    speaker: interviewer
    content: "Let's define the system scope..."
    dimensionGroups:
      - id: requirements
        label: "Requirements"
        dimensions:
          - id: latency
            label: "Latency requirement"
            options:
              - { value: "real_time", label: "Real-time (<100ms)" }
              - { value: "batch", label: "Batch (hourly/daily)" }
    routes:
      - key: "real_time"
        next: data_streaming
      - key: "batch"
        next: data_batch
    defaultRoute: data_batch

  - id: end
    stage: monitoring
    type: terminal
    label: "Design Complete"
    speaker: interviewer
    content: "Excellent work on this design!"
```

### Node Types

| Type | Purpose | Key Fields |
|------|---------|-----------|
| `info` | Display content, advance linearly | `next` (target node ID) |
| `question` | Present branching choices | `choices[]` with `label`, `answer`, `next` |
| `multi_select` | Multi-dimensional selection | `dimensionGroups[]`, `routes[]`, `defaultRoute` |
| `terminal` | End of a path | No navigation fields |

### Validation

`validateTree()` checks: valid root reference, all `next`/`choice.next` point to existing nodes, valid stages, valid types, no orphan nodes, convergence reference validity, multi-select route integrity.

## 7. LLM Generation Pipeline

### Scaffold-First Architecture

Unlike approaches that ask the LLM to generate the entire YAML structure, this app separates structure from content:

```
1. User provides: title, description, branch count (1/2/3)
2. scaffoldTree() generates:
   - Valid node IDs with stage abbreviations (pd_, met_, dat_, feat_, mod_, train_, deploy_, mon_)
   - Correct types (info/question/terminal) with all next references
   - Branch placement at stages 1, 3, 4 (metrics, features, model) -- common decision points
   - Convergence nodes where branches rejoin
   - [FILL: ...] placeholders for content
3. LLM fills content for each node (batched by stage)
4. Gap-filling pass handles any truncated/unfilled nodes
5. Client-side validation before display
```

### Generation Flow

```
User clicks "Generate" → GenerateModal opens
  → User enters title + description + selects Quick/Extensive
  → scaffoldTree() creates skeleton
  → LLM API call via Supabase Edge Function (generate-tree)
  → tryParseJSON() + stripThinkingBlocks() clean response
  → repairNodes() fixes structural issues
  → Quick: single call, display immediately
  → Extensive: batch 0 in modal, batches 1-3 via useProgressiveGeneration
  → UPDATE_PROBLEM action streams nodes into live wizard
  → Unfilled nodes show loading spinner instead of [FILL:] placeholder
```

### Ollama Compatibility

Local models tested: `qwen3:8b` (best balance), `qwen2.5:32b` (reliable but slow), `llama3.1:8b` (classification only). Workarounds include `stripThinkingBlocks()` for `<think>` tags, `tryParseJSON()` for truncated output, and graceful degradation on parse failures.

## 8. Source Grounding System

```
Sources Panel
  ├── Add URL → Jina Reader API (r.jina.ai) → extracted text
  ├── Add Text → paste content directly
  ├── Auto Search → Jina Search API (s.jina.ai) → result list
  └── Budget Bar → 12,000 char budget across all sources

Source Injection into LLM Prompts
  ├── buildSourceContext() → formats sources within budget (4,000 chars/source)
  ├── injectSourcesIntoPrompt() → appends context block to system prompt
  └── extractCitationsFromText() → parses [1], [2] references from output

Integration Points
  ├── useAIAnswer (Ask AI panel)
  ├── useInterviewLLM (classify + branch generation)
  ├── QuestionCard (choice explanations)
  └── AskAIPanel (per-node Q&A)
```

## 9. Database Schema (Supabase)

```sql
-- User LLM settings (API key removed server-side; stored client-side only)
user_settings (user_id PK, llm_base_url, llm_model)

-- Draft problems (compressed YAML)
user_drafts (id PK, user_id FK, problem_id, title, description, yaml_content)

-- Node comments with threading
node_comments (id PK, problem_id, node_id, user_id FK nullable, author_name,
               content, comment_type, parent_id FK self, status, vote_score)

-- Comment votes (one per user/fingerprint per comment)
comment_votes (id PK, comment_id FK, user_id FK nullable, user_fingerprint,
               vote_type check('up','down'), unique(comment_id, user_fingerprint))

-- Admin roles
admin_users (user_id PK, role check('moderator','admin'))

-- Public gallery
gallery_problems (id PK, user_id FK, title, description, yaml_content,
                  difficulty, tags, companies, domains, upvote_count)
gallery_upvotes (id PK, problem_id FK, user_id FK, unique(problem_id, user_id))

-- Moderation configuration (per admin)
moderation_config (id PK, user_id FK, mode check('full_auto','ai_assisted','manual'),
                   rules JSONB, confidence_threshold float default 0.7,
                   auto_respond_enabled boolean default false)

-- Moderation audit log
moderation_audit_log (id PK, actor_id FK nullable, actor_type, action, comment_id FK,
                      reason, confidence, created_at)

-- User-generated branches pending moderation
generated_branches (id PK, problem_id, user_id, yaml_content, status, created_at)
```

All tables use row-level security (RLS). Comments are publicly readable when approved. Users manage their own settings/drafts. Admins manage all comments and moderation config.

## 10. Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `generate-tree` | Proxies LLM call to generate/fill YAML decision tree content | "Generate" button in modal |
| `moderate-comments` | Evaluates pending comments against configurable rulebook via LLM | Auto (polling) or manual (admin click) |
| `moderate-branches` | Reviews user-generated branches for quality and safety | Branch submission |
| `auto-respond` | Answers unanswered questions using node context | 30s polling when enabled |
| `answer-question` | Generates context-aware AI answer for per-node Q&A | "Ask AI" panel |

All functions read the requesting user's LLM settings to proxy calls.

## 11. Stage Color Coding

| Stage | Color | Hex |
|-------|-------|-----|
| Problem Definition | Blue | `#3b82f6` |
| Metrics | Purple | `#a855f7` |
| Data | Green | `#22c55e` |
| Features | Amber | `#f59e0b` |
| Model | Red | `#ef4444` |
| Training | Orange | `#f97316` |
| Deployment | Cyan | `#06b6d4` |
| Monitoring | Pink | `#ec4899` |

## 12. Directory Structure

```
src/
├── App.tsx                          # Root component, provider nesting
├── main.tsx                         # Entry point
├── index.css                        # Tailwind imports
├── types/
│   └── tree.ts                      # All TypeScript interfaces and types
├── constants/                       # App-wide constants
├── data/
│   └── problems/                    # 53 built-in YAML problem files + loader
├── lib/
│   └── supabase.ts                  # Supabase client initialization
├── context/
│   ├── WizardContext.tsx             # Navigation state (useReducer + session persistence)
│   ├── ModeContext.tsx               # Interview mode + feature flags
│   ├── VoiceOverContext.tsx          # TTS state and controls
│   ├── HandsFreeContext.tsx          # STT + voice commands + TTS/STT coordination
│   └── ThemeContext.tsx              # Dark/light/system theme
├── hooks/
│   ├── useAuth.ts                   # Supabase OAuth
│   ├── useProblems.ts               # Load built-in + gallery + draft problems
│   ├── useWizardState.ts            # Wizard state consumption
│   ├── useMode.ts                   # Mode context consumption
│   ├── useInterviewLLM.ts           # Freeform input classify + respond + branch gen
│   ├── useAIAnswer.ts               # Per-node Ask AI
│   ├── useNodeComments.ts           # Comment CRUD
│   ├── useGallery.ts                # Gallery browse + upvote
│   ├── useSources.ts                # Source management (add URL/text, search, summarize)
│   ├── useSpeechRecognition.ts      # Web Speech API wrapper
│   ├── useVoiceOver.ts              # TTS hook
│   ├── useKeyboardNav.ts            # Keyboard shortcuts
│   ├── useProgressiveGeneration.ts  # Background batch generation
│   ├── useAdmin.ts                  # Admin role check
│   ├── useAutoModeration.ts         # Auto-moderate polling
│   ├── useAutoRespond.ts            # Auto-respond polling
│   ├── useAuditLog.ts               # Audit log queries
│   └── useModerationConfig.ts       # Moderation settings
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              # Problem list, search, collapse
│   │   └── SplitPane.tsx            # Resizable graph/wizard split
│   ├── auth/
│   │   ├── LoginPage.tsx            # OAuth login
│   │   └── SettingsPanel.tsx        # LLM provider settings, API keys
│   ├── graph/
│   │   ├── TreeGraph.tsx            # ReactFlow canvas with dagre layout
│   │   ├── TreeNode.tsx             # Custom node component (stage-colored)
│   │   └── TreeEdge.tsx             # Custom edge component
│   ├── wizard/
│   │   ├── WizardPanel.tsx          # Main wizard view
│   │   ├── QuestionCard.tsx         # Choice buttons, answer display
│   │   ├── MultiSelectCard.tsx      # Dimension group selection
│   │   ├── StageIndicator.tsx       # 8-stage progress bar
│   │   ├── PathBreadcrumb.tsx       # Navigation breadcrumb trail
│   │   ├── FreeformInput.tsx        # Text/voice freeform answer input
│   │   ├── DialogueView.tsx         # Interviewer/candidate dialogue display
│   │   ├── ModeSelector.tsx         # Mock/Tutor/Designer toggle
│   │   ├── ComparisonMode.tsx       # Alternate branch comparison
│   │   ├── PracticeTimer.tsx        # 45-min countdown timer
│   │   ├── NotesPanel.tsx           # Per-problem notes
│   │   ├── NodeComments.tsx         # Per-node comment section
│   │   ├── AskAIPanel.tsx           # AI Q&A panel
│   │   ├── SourcesPanel.tsx         # Source management UI
│   │   ├── CitationsList.tsx        # Numbered citation display
│   │   └── VoiceOverControls.tsx    # TTS play/pause/speed controls
│   ├── transcript/
│   │   ├── TranscriptButton.tsx     # Download trigger
│   │   └── generateTranscript.ts    # Markdown generation from path
│   ├── generator/
│   │   ├── GenerateModal.tsx        # LLM generation wizard (title, desc, branch count)
│   │   ├── GenerationProgressBar.tsx # Stage-by-stage progress pills
│   │   ├── PreviewTree.tsx          # Generated tree preview
│   │   ├── BranchEditModal.tsx      # Branch editing preview/confirm
│   │   ├── PublishButton.tsx        # Publish to gallery
│   │   └── GeneratorExample.tsx     # Example output reference
│   ├── gallery/
│   │   ├── GalleryView.tsx          # Browse/search/filter gallery
│   │   └── PublishModal.tsx         # Difficulty + tags for publishing
│   ├── admin/
│   │   ├── ModerationPanel.tsx      # Tabs: Queue, Branches, Settings, Audit, Analytics
│   │   ├── ModerationSettings.tsx   # Mode selector, rules editor, threshold
│   │   ├── AuditLogPanel.tsx        # Searchable audit log with CSV export
│   │   └── ModerationAnalytics.tsx  # Charts and summary cards
│   └── draft/
│       └── EditDraftModal.tsx       # Draft YAML editor
├── utils/
│   ├── yamlLoader.ts                # YAML parsing and Problem construction
│   ├── validateTree.ts              # Structural validation (stages, refs, convergence)
│   ├── layoutEngine.ts              # Dagre graph layout computation
│   ├── treeTraversal.ts             # Path utilities, downstream summaries
│   ├── scaffoldTree.ts              # Structure-first tree skeleton generator
│   ├── mergeBranch.ts               # Branch merging with ID collision avoidance
│   ├── llmClient.ts                 # callLLM, tryParseJSON, stripThinkingBlocks, callLLMWithSources
│   ├── llmEnsemble.ts              # Multi-provider ensemble orchestration
│   ├── llmKeyStore.ts               # LLM API key management (localStorage)
│   ├── jinaClient.ts                # Jina Reader/Search API wrappers
│   ├── sourceInjection.ts           # Source context building and citation extraction
│   ├── sourcesStore.ts              # Source CRUD (localStorage)
│   ├── voiceCommands.ts             # Voice command parsing (regex patterns)
│   ├── branchModeration.ts          # Branch submission for moderation
│   ├── draftStore.ts                # Draft CRUD (localStorage)
│   ├── progressStore.ts             # Progress tracking (localStorage)
│   ├── compression.ts               # lz-string compression utilities
│   └── generateId.ts                # ID generation helpers
tests/
├── unit/                            # 29 Vitest test files (465+ tests)
└── e2e/                             # 22 Playwright test specs
supabase/
├── migrations/                      # 11 SQL migration files
│   ├── 001_initial_schema.sql
│   ├── 002_add_problem_id_to_drafts.sql
│   ├── 003_node_comments.sql
│   ├── 004_admin_roles.sql
│   ├── 005_gallery.sql
│   ├── 006_comment_votes.sql
│   ├── 007_moderation_config.sql
│   ├── 008_audit_log.sql
│   ├── 009_generated_branches.sql
│   ├── 010_remove_api_key.sql
│   └── 011_company_domain_tags.sql
└── functions/
    ├── generate-tree/               # LLM proxy for tree generation
    ├── moderate-comments/           # Comment moderation via LLM
    ├── moderate-branches/           # Branch moderation via LLM
    ├── auto-respond/                # Auto-answer unanswered questions
    └── answer-question/             # Per-node AI Q&A
mcp-server/                          # MCP developer tooling server
├── src/                             # TypeScript source
├── dist/                            # Compiled output
├── package.json
└── tsconfig.json
```

## 13. MCP Developer Tooling

The `mcp-server/` directory contains a Model Context Protocol server registered as `ml-interview-tree` in `.mcp.json`. It provides tools for programmatic tree creation and validation:

| Tool | Purpose |
|------|---------|
| `get_schema` | Returns complete TypeScript interfaces and validation rules |
| `get_example` | Returns example YAML files (use `problem_id='list'` to browse) |
| `validate_tree` | Validates YAML against all structural rules |
| `repair_nodes` | Fixes common LLM output issues (bad stages, missing fields, broken multi_select) |
| `scaffold` | Generates a skeleton YAML tree covering all 8 stages with branching |
| `check_references` | Verifies all `next` references point to existing node IDs |

Build: `cd mcp-server && npm run build`

A Claude Code skill (`.claude/skills/new-problem.md`) provides a `/new-problem` command for creating YAML problem files with comprehensive prompts covering DAG diamond patterns, dialogue guidelines, multi-select usage, convergence best practices, and citation integration.

## 14. Testing

### Unit Tests (Vitest)

465+ tests across 31 files covering:

- YAML parsing and validation (`validateTree`, `yamlLoader`)
- Tree traversal and layout (`treeTraversal`, `layoutEngine`)
- Transcript generation (`generateTranscript`)
- State management (`wizardReducer`, `modeContext`, `multiSelect`)
- LLM utilities (`llmClient`, `llmEnsemble`, `scaffoldTree`, `llmKeyStore`)
- Source grounding (`sourcesStore`, `jinaClient`, `sourceInjection`)
- Branch editing (`mergeBranch`, `branchModeration`)
- Comments (`useNodeComments`, `citationsList`)
- Voice (`voiceCommands`)
- Components (`StageIndicator`)
- Problem-specific (`dynamicPricing`, `sample`, `useInterviewLLM`)

### E2E Tests (Playwright)

22 specs covering: app loading, wizard navigation, view modes, sidebar, transcript, settings, comments, multi-select, interview modes.

### Quality Standards

- TypeScript strict mode
- ESLint + Prettier with Husky pre-commit hooks
- `data-testid` attributes on interactive elements for stable E2E selectors
- `@/` path alias (configured in both `vite.config.ts` and `tsconfig.app.json`)

## 15. Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- (Optional) Supabase project for auth/gallery/comments
- (Optional) OpenAI-compatible LLM API key for generation features
- (Optional) Jina API key for source grounding

### Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Run unit tests
npm run test          # Watch mode
npm run test:run      # Single run

# Run E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint and format
npm run lint
npm run lint:fix
npm run format

# Build for production
npm run build

# Build MCP server
cd mcp-server && npm run build
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

LLM API keys and Jina API keys are stored client-side in localStorage (never committed to the repository or sent to the app's own backend).

## 16. Access Model

| Action | Requirement |
|--------|------------|
| Browse problems and navigate trees | None (fully public) |
| Read approved comments | None |
| Submit comments | Display name (no login required) |
| Save notes and progress | Automatic (localStorage) |
| Generate trees via LLM | LLM API key (stored client-side) |
| Publish to gallery | Supabase login |
| Upvote gallery problems | Supabase login |
| Moderate comments/branches | Admin role in `admin_users` table |
| Use source grounding | Jina API key (stored client-side) |
