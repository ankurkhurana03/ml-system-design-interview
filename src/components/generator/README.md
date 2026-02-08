# LLM Tree Generator

This directory contains components for generating ML system design interview decision trees using LLMs.

## Components

### 1. GenerateModal

Main modal for generating new problem trees from natural language descriptions.

**Usage:**
```tsx
import { GenerateModal } from '@/components/generator';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerated = (problem: Problem) => {
    console.log('Generated problem:', problem);
    // Use the problem...
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Generate Tree</button>
      <GenerateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onGenerated={handleGenerated}
      />
    </>
  );
}
```

**Features:**
- Supports both Supabase Edge Function (authenticated) and direct LLM API calls
- Extracts YAML from LLM responses (handles markdown code blocks)
- Validates generated trees with comprehensive error messages
- Shows generation progress with status indicators
- Automatic retry on error

**API Keys:**
- Authenticated users: Uses API keys stored in Supabase `user_settings` table
- Guest users: Uses API keys from `localStorage` (keys: `llm_api_key`, `llm_base_url`, `llm_model`)

### 2. PreviewTree

Preview component for reviewing generated trees before accepting them.

**Usage:**
```tsx
import { PreviewTree } from '@/components/generator';

function MyComponent() {
  const [problem, setProblem] = useState<Problem>(generatedProblem);

  return (
    <PreviewTree
      problem={problem}
      onAccept={() => console.log('Accepted!')}
      onEdit={() => console.log('Opening editor...')}
      onDiscard={() => console.log('Discarded')}
    />
  );
}
```

**Features:**
- Shows problem metadata (title, description, node count, branch points)
- Stage coverage visualization with completion status
- Lists all decision points with choice counts
- Built-in YAML editor for manual corrections
- Validates changes before saving
- Discard confirmation modal

### 3. PublishButton

Button for publishing generated trees to the user's draft gallery.

**Usage:**
```tsx
import { PublishButton } from '@/components/generator';

function MyComponent() {
  const problem = useMemo(() => generatedProblem, []);

  return (
    <PublishButton
      problem={problem}
      onPublished={() => console.log('Published!')}
    />
  );
}
```

**Features:**
- Saves problem as YAML to `user_drafts` table
- Updates existing drafts if problem_id already exists
- Shows loading/success/error states
- Requires authentication (shows sign-in prompt for guests)

## Supabase Edge Function

The `generate-tree` edge function is located at:
```
supabase/functions/generate-tree/index.ts
```

**Deployment:**
```bash
supabase functions deploy generate-tree
```

**Environment Variables:**
The function automatically reads:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

**Endpoints:**

POST `/functions/v1/generate-tree`

**Request Body:**
```json
{
  "problem_description": "Build a fraud detection system...",
  "user_id": "user-uuid",
  "mode": "generate"  // or "branch"
}
```

For branching mode:
```json
{
  "existing_yaml": "...",
  "target_node_id": "node_id",
  "user_prompt": "Add a path that explores ensemble models",
  "user_id": "user-uuid",
  "mode": "branch"
}
```

**Response:**
```json
{
  "choices": [{
    "message": {
      "content": "id: fraud-detection\ntitle: ...\n..."
    }
  }]
}
```

## System Prompts

Two system prompts are included:

### 1. GENERATE_SYSTEM_PROMPT
Used for generating complete trees from scratch. Includes:
- Full YAML schema documentation
- The 8 ML stages in order
- Rules for creating branching points
- Example structure

### 2. BRANCH_SYSTEM_PROMPT
Used for extending existing trees with new branches. Includes:
- Instructions for generating only new nodes
- ID prefixing conventions (`gen_` prefix)
- Stage continuation rules

## Database Schema

### user_settings
Stores user LLM configuration:
```sql
create table user_settings (
  user_id uuid primary key,
  llm_base_url text default 'https://api.openai.com/v1',
  llm_api_key_encrypted text,
  llm_model text default 'gpt-4o',
  created_at timestamptz,
  updated_at timestamptz
);
```

### user_drafts
Stores generated problem drafts:
```sql
create table user_drafts (
  id uuid primary key,
  user_id uuid,
  problem_id text,  -- Added in migration 002
  title text not null,
  description text,
  yaml_content text not null,
  created_at timestamptz,
  updated_at timestamptz
);
```

## Example Flow

```tsx
import { useState } from 'react';
import { GenerateModal, PreviewTree, PublishButton } from '@/components/generator';
import type { Problem } from '@/types/tree';

function GeneratorExample() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [generatedProblem, setGeneratedProblem] = useState<Problem | null>(null);
  const [accepted, setAccepted] = useState(false);

  const handleGenerated = (problem: Problem) => {
    setGeneratedProblem(problem);
    setShowGenerate(false);
  };

  const handleAccept = () => {
    setAccepted(true);
  };

  const handleDiscard = () => {
    setGeneratedProblem(null);
    setAccepted(false);
  };

  return (
    <div className="p-6">
      {!generatedProblem && (
        <button onClick={() => setShowGenerate(true)}>
          Generate New Problem
        </button>
      )}

      <GenerateModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        onGenerated={handleGenerated}
      />

      {generatedProblem && !accepted && (
        <PreviewTree
          problem={generatedProblem}
          onAccept={handleAccept}
          onEdit={() => console.log('Edit')}
          onDiscard={handleDiscard}
        />
      )}

      {generatedProblem && accepted && (
        <div>
          <h2>Problem Accepted!</h2>
          <PublishButton
            problem={generatedProblem}
            onPublished={() => console.log('Published!')}
          />
        </div>
      )}
    </div>
  );
}
```

## Validation

All generated trees are validated using `validateTree()` from `@/utils/validateTree`.

**Validation checks:**
- All required fields present (id, title, description, root, nodes)
- Node IDs are unique
- Root node exists in nodes array
- All node references are valid
- Question nodes have at least 2 choices
- Terminal nodes have no next/choices
- No orphan nodes (all reachable from root)
- Cycle detection (warning only)

## Error Handling

The components handle various error cases:
- LLM API failures (network, authentication, rate limits)
- YAML parsing errors
- Tree validation failures
- Database errors (for publishing)

Each error is displayed with a clear message and retry option where applicable.

## Styling

All components use Tailwind CSS 4 with dark mode support. The design follows the app's existing visual language with:
- Rounded corners (`rounded-md`, `rounded-lg`)
- Consistent spacing (Tailwind spacing scale)
- Blue primary color (`blue-600`)
- Green for success (`green-600`)
- Red for errors/destructive actions (`red-600`)
- Backdrop blur for modals (`backdrop-blur-sm`)

## Future Enhancements

Potential improvements:
- Branch generation mode (extend existing trees)
- Batch generation (multiple problems at once)
- Template system (start from predefined templates)
- GitHub PR integration for publishing to gallery
- Collaborative editing
- Version history for drafts
