# ML System Design Interview Tool

## Project Overview
Interactive web app that guides users through ML system design interviews using decision trees. Users navigate through 8 ML design stages (Problem Definition → Metrics → Data → Features → Model → Training → Deployment → Monitoring) with branching paths based on design choices.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Visualization**: @xyflow/react (ReactFlow v12) + @dagrejs/dagre for auto-layout
- **Styling**: Tailwind CSS 4 (utility-first, `@import "tailwindcss"` in CSS)
- **Auth + DB**: Supabase (PostgreSQL + OAuth + Edge Functions)
- **LLM Proxy**: Supabase Edge Function (proxies to user's OpenAI-compatible API)
- **Tree Format**: YAML files (human-readable, validated at load time)
- **Testing**: Vitest (unit) + Playwright (e2e)

## Project Structure
```
src/
├── types/tree.ts          # Core interfaces: Problem, TreeNode, Choice, PathEntry, MLStage
├── data/problems/         # Built-in YAML problem files + loader
├── lib/supabase.ts        # Supabase client
├── hooks/                 # useAuth, useProblems, useWizardState
├── context/WizardContext  # Shared state: currentNodeId, path, visitedNodeIds
├── components/
│   ├── layout/            # Sidebar, SplitPane
│   ├── auth/              # LoginPage, SettingsPanel
│   ├── graph/             # TreeGraph (ReactFlow), TreeNode, TreeEdge
│   ├── wizard/            # WizardPanel, QuestionCard, StageIndicator, PathBreadcrumb
│   ├── transcript/        # TranscriptButton, generateTranscript
│   └── generator/         # GenerateModal, PreviewTree, PublishButton
├── utils/                 # yamlLoader, validateTree, layoutEngine, treeTraversal
tests/
├── unit/                  # Vitest unit tests
└── e2e/                   # Playwright e2e tests
supabase/
├── migrations/            # SQL schema
└── functions/             # Edge functions (generate-tree)
```

## Key Architecture Decisions

### Decision Tree YAML Schema
Each problem is a single YAML file with nodes of 3 types:
- `info` — displays content, advances linearly via `next`
- `question` — presents branching choices, each with `answer` + `next`
- `terminal` — end of a path

### State Management
`WizardContext` (React Context + useReducer) is the single source of truth. Both the graph view and wizard view consume it. Actions: SET_PROBLEM, SELECT_CHOICE, ADVANCE, GO_BACK, RESET, JUMP_TO_NODE.

### Graph + Wizard Sync
Both views render from the same state. Clicking a choice in either view dispatches the same action. Graph nodes are colored by stage, highlighted by visit state (active=pulsing blue, visited=solid blue, unvisited=gray).

## Coding Standards
- TypeScript strict mode
- ESLint + Prettier for linting/formatting
- Husky + lint-staged for pre-commit hooks
- Use `@/` path alias for imports (mapped to `src/`)
- Prefer named exports for components, default export for pages
- Use Tailwind CSS utility classes — no custom CSS unless necessary
- Test critical flows with Playwright e2e tests

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Type-check + build
- `npm run test` — Run unit tests (Vitest)
- `npm run test:e2e` — Run e2e tests (Playwright)
- `npm run lint` — Lint
- `npm run lint:fix` — Lint + auto-fix
- `npm run format` — Format with Prettier
- `npm run type-check` — TypeScript type checking

## ML Stages (ordered)
1. `problem_definition` — blue-500
2. `metrics` — purple-500
3. `data` — green-500
4. `features` — amber-500
5. `model` — red-500
6. `training` — orange-500
7. `deployment` — cyan-500
8. `monitoring` — pink-500

## Environment Variables
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
