# ML System Design MCP Server

MCP (Model Context Protocol) server that provides tools for developers maintaining and creating YAML decision trees for the ML System Design Interview tool.

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Tools

### `get_schema`
Returns the complete TypeScript interfaces, types, and validation rules for decision trees. No parameters.

### `get_example(problem_id)`
Reads and returns an example YAML file from `src/data/problems/`.
- `problem_id: "list"` -- lists available problem files
- `problem_id: "flight-delay"` -- returns that YAML file's content

### `validate_tree(yaml)`
Parses YAML and runs full validation (same rules as `src/utils/validateTree.ts`):
- Structure checks (id, title, description, root, nodes)
- Node field validation (stage, type, label, speaker, content)
- Type-specific checks (info needs next, question needs 2+ choices, terminal has no next)
- Reachability from root (orphan detection)
- Cycle detection

### `repair_nodes(yaml)`
Fixes common LLM output issues in node arrays:
- Invalid stages mapped via aliases (e.g., `problem_formulation` -> `problem_definition`)
- Invalid types corrected (last node = terminal, others = info)
- Question nodes with <2 choices converted to info
- Missing speaker defaults to `interviewer`
- Missing content/label coerced from other fields
- Terminal nodes with next/choices have them stripped
- Info nodes without next pointed to next node in array

### `scaffold(title, description, num_branches)`
Generates a skeleton YAML tree with all 8 ML stages, branching question nodes, placeholder content, and properly wired references.
- `title`: Problem title (e.g., "Fraud Detection")
- `description`: Brief description (optional)
- `num_branches`: 1-4 branching points (default: 2)

### `check_references(yaml)`
Quick reference integrity check. Verifies all `next` references point to existing node IDs.

## Claude Code Integration

The server is registered in `.claude/settings.local.json` and uses stdio transport. It is automatically available when using Claude Code in this project.

## Development

```bash
npm run dev    # Watch mode (recompiles on changes)
npm run build  # One-time build
npm start      # Run the compiled server
```
