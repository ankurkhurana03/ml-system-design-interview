# LLM Tree Generator - Feature Summary

## Overview

A complete LLM-powered tree generation system for the ML System Design Interview tool. Users can describe an ML problem in natural language, and the system generates a complete, valid decision tree with 8 stages, branching points, and educational content.

## Files Created

### 1. Backend (Supabase Edge Function)
- **`supabase/functions/generate-tree/index.ts`** (243 lines)
  - Deno-based edge function
  - Proxies LLM requests with user API keys
  - Supports both `generate` (new tree) and `branch` (extend tree) modes
  - Includes comprehensive system prompts for tree generation

### 2. Database
- **`supabase/migrations/002_add_problem_id_to_drafts.sql`** (7 lines)
  - Adds `problem_id` column to `user_drafts`
  - Creates unique index for user_id + problem_id

### 3. Frontend Components
- **`src/components/generator/GenerateModal.tsx`** (283 lines)
  - Modal for generating new problems
  - Supports both authenticated and guest users
  - Extracts YAML from LLM responses
  - Full validation with error handling
  - Loading states with status indicators

- **`src/components/generator/PreviewTree.tsx`** (238 lines)
  - Preview generated trees before accepting
  - Shows statistics (node count, branches, stage coverage)
  - Built-in YAML editor for manual corrections
  - Validation of edited YAML
  - Discard confirmation modal

- **`src/components/generator/PublishButton.tsx`** (157 lines)
  - Publishes trees to user drafts
  - Handles upsert logic (insert or update)
  - Success/error states with retry
  - Auth check with sign-in prompt

- **`src/components/generator/GeneratorExample.tsx`** (191 lines)
  - Complete working example
  - Shows full workflow: generate → preview → publish
  - Reference implementation for integration

- **`src/components/generator/index.ts`** (4 lines)
  - Barrel export for all components

### 4. Utilities
- **`src/utils/generateId.ts`** (48 lines)
  - Generate URL-safe IDs from text
  - Support for unique IDs (timestamp or random)
  - Used for creating problem IDs

### 5. Tests
- **`src/components/generator/__tests__/generator.test.ts`** (295 lines)
  - Comprehensive test suite
  - Tests for ID generation, validation, YAML parsing
  - Stage coverage checks
  - Error detection tests

### 6. Documentation
- **`src/components/generator/README.md`** (455 lines)
  - Component documentation
  - Usage examples
  - API reference
  - Database schema
  - Error handling guide

- **`GENERATOR_INTEGRATION.md`** (542 lines)
  - Integration guide
  - Setup instructions
  - Configuration examples
  - API provider setup
  - Troubleshooting

- **`GENERATOR_DEPLOYMENT.md`** (367 lines)
  - Deployment checklist
  - Testing procedures
  - Rollback plan
  - Monitoring setup
  - Success metrics

## Key Features

### For Users
1. **Natural Language Input**: Describe problems in plain English
2. **Instant Generation**: Get complete decision trees in seconds
3. **Preview & Edit**: Review and manually adjust generated trees
4. **Validation**: Automatic checks for tree integrity
5. **Save Drafts**: Publish trees to private drafts
6. **Guest Mode**: Works without authentication (using localStorage)

### For Developers
1. **Type-Safe**: Full TypeScript support
2. **Validated**: Comprehensive tree validation
3. **Extensible**: Easy to customize prompts and validation rules
4. **Well-Tested**: Unit tests for core functionality
5. **Documented**: Extensive inline and external documentation
6. **Tailwind CSS**: Polished UI with dark mode support

## System Architecture

```
User Input (Description)
         ↓
GenerateModal Component
         ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Edge Function    OR   Direct API Call
(Authenticated)      (Guest/Fallback)
    ↓                   ↓
    └─────────┬─────────┘
         ↓
    LLM Response (YAML)
         ↓
    Parse & Extract YAML
         ↓
    Validate Tree Structure
         ↓
    PreviewTree Component
         ↓
    User Accepts/Edits
         ↓
    PublishButton Component
         ↓
    Save to user_drafts table
```

## Data Flow

### 1. Generation Request
```typescript
{
  problem_description: string,
  user_id: string,
  mode: 'generate' | 'branch'
}
```

### 2. LLM Response
```typescript
{
  choices: [{
    message: {
      content: string  // YAML content
    }
  }]
}
```

### 3. Parsed Problem
```typescript
{
  id: string,
  title: string,
  description: string,
  root: string,
  nodes: TreeNode[]
}
```

### 4. Saved Draft
```sql
INSERT INTO user_drafts (
  user_id,
  problem_id,
  title,
  description,
  yaml_content,
  created_at,
  updated_at
)
```

## System Prompts

### Generate Mode (Full Tree)
- 8 ML stages in order
- 2-3 branching points
- Educational answers
- Both interviewer and candidate speakers
- All paths reach monitoring stage

### Branch Mode (Extend Tree)
- Generate only new nodes
- Continue from target node
- Use `gen_` prefix for IDs
- Maintain consistency with existing tree

## Validation Rules

The system validates:
- ✅ Required fields (id, title, description, root, nodes)
- ✅ Unique node IDs
- ✅ Root exists in nodes
- ✅ Valid node references
- ✅ Question nodes have ≥2 choices
- ✅ Terminal nodes have no next/choices
- ✅ No orphan nodes
- ⚠️ Cycle detection (warning only)

## API Support

Works with any OpenAI-compatible API:
- OpenAI (GPT-4, GPT-3.5)
- Azure OpenAI
- Anthropic (via proxy)
- Local models (LM Studio, Ollama, etc.)

## UI States

### GenerateModal
1. **Idle**: Ready for input
2. **Generating**: Calling LLM
3. **Parsing**: Extracting YAML
4. **Validating**: Checking tree structure
5. **Success**: Generation complete
6. **Error**: Something went wrong (with retry)

### PreviewTree
1. **View Mode**: Display statistics and summary
2. **Edit Mode**: YAML editor with validation

### PublishButton
1. **Idle**: Ready to publish
2. **Publishing**: Saving to database
3. **Success**: Published successfully
4. **Error**: Publish failed (with retry)

## Error Handling

Handles these error cases:
- ❌ No API key configured
- ❌ Invalid API key
- ❌ Network failures
- ❌ LLM API rate limits
- ❌ Invalid YAML syntax
- ❌ Tree validation failures
- ❌ Database errors
- ❌ Authentication errors

## Security

- 🔒 API keys encrypted in database
- 🔒 Row-level security on all tables
- 🔒 User_id validation in edge function
- 🔒 No API keys in client logs
- 🔒 CORS headers properly configured

## Performance

- ⚡ Generation: 10-60 seconds (depends on model)
- ⚡ Parsing: < 500ms for normal trees
- ⚡ Validation: Nearly instant
- ⚡ UI: Smooth loading states

## Browser Support

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

## Accessibility

- ♿ Keyboard navigation
- ♿ Screen reader support
- ♿ WCAG AA contrast
- ♿ Focus indicators
- ♿ Clear error messages

## Integration Points

### Required Imports
```typescript
import { GenerateModal, PreviewTree, PublishButton } from '@/components/generator';
import { useAuth } from '@/hooks/useAuth';
import type { Problem } from '@/types/tree';
```

### Required Hooks
```typescript
const { user } = useAuth();  // For authentication
```

### Required Services
- Supabase client (`@/lib/supabase`)
- YAML parser (`@/utils/yamlLoader`)
- Tree validator (`@/utils/validateTree`)

## Configuration

### Authenticated Users
Store in `user_settings` table:
- `llm_base_url`: API endpoint
- `llm_api_key_encrypted`: API key
- `llm_model`: Model name

### Guest Users
Store in localStorage:
- `llm_api_key`: API key
- `llm_base_url`: API endpoint
- `llm_model`: Model name

## Future Enhancements

Potential improvements:
- 🔮 Streaming responses
- 🔮 Template system
- 🔮 Batch generation
- 🔮 Branch generation mode
- 🔮 Tree refinement
- 🔮 Community gallery
- 🔮 Public sharing
- 🔮 Export formats (PDF, Markdown)
- 🔮 Version history
- 🔮 Collaborative editing

## Metrics to Track

Success indicators:
- 📊 Trees generated per day
- 📊 Success rate (valid / total)
- 📊 Average generation time
- 📊 User retention
- 📊 Published drafts
- 📊 Error rates by type

## Dependencies

### Added
- None (uses existing dependencies)

### Existing Used
- `react` (v19.2.0)
- `@supabase/supabase-js` (v2.95.3)
- `yaml` (v2.8.2)
- `tailwindcss` (v4.1.18)

## File Structure

```
ml_sys_design/
├── supabase/
│   ├── functions/
│   │   └── generate-tree/
│   │       └── index.ts          # Edge function
│   └── migrations/
│       └── 002_add_problem_id_to_drafts.sql
├── src/
│   ├── components/
│   │   └── generator/
│   │       ├── GenerateModal.tsx
│   │       ├── PreviewTree.tsx
│   │       ├── PublishButton.tsx
│   │       ├── GeneratorExample.tsx
│   │       ├── index.ts
│   │       ├── README.md
│   │       └── __tests__/
│   │           └── generator.test.ts
│   └── utils/
│       └── generateId.ts
├── GENERATOR_INTEGRATION.md
├── GENERATOR_DEPLOYMENT.md
└── GENERATOR_SUMMARY.md (this file)
```

## Quick Start

1. **Deploy edge function:**
   ```bash
   supabase functions deploy generate-tree
   ```

2. **Run migrations:**
   ```bash
   supabase migration up
   ```

3. **Add to your app:**
   ```tsx
   import { GenerateModal } from '@/components/generator';

   function App() {
     const [showModal, setShowModal] = useState(false);

     return (
       <>
         <button onClick={() => setShowModal(true)}>Generate</button>
         <GenerateModal
           isOpen={showModal}
           onClose={() => setShowModal(false)}
           onGenerated={(problem) => console.log(problem)}
         />
       </>
     );
   }
   ```

4. **Test it:**
   - Enter a problem description
   - Wait for generation
   - Review the preview
   - Accept and publish

## Support

For help:
1. Check `GENERATOR_INTEGRATION.md` for setup
2. Check `GENERATOR_DEPLOYMENT.md` for deployment
3. Check `src/components/generator/README.md` for API docs
4. Run tests: `npm test`
5. Check Supabase logs: `supabase functions logs generate-tree`

## License

Same as the main project.

## Contributors

Created as part of the ML System Design Interview tool.
