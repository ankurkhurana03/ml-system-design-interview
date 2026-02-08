# Generator Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────┐
│           GeneratorExample.tsx                  │
│  (Optional wrapper showing complete workflow)   │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │      GenerateModal.tsx                  │  │
│  │  ┌─────────────────────────────────┐   │  │
│  │  │ TextArea: Problem Description   │   │  │
│  │  └─────────────────────────────────┘   │  │
│  │  ┌─────────────────────────────────┐   │  │
│  │  │ Status: Generating/Parsing...   │   │  │
│  │  └─────────────────────────────────┘   │  │
│  │  [Generate] [Cancel]                    │  │
│  └─────────────────────────────────────────┘  │
│                    ↓                           │
│  ┌─────────────────────────────────────────┐  │
│  │       PreviewTree.tsx                   │  │
│  │  ┌─────────────────────────────────┐   │  │
│  │  │ Title & Description             │   │  │
│  │  └─────────────────────────────────┘   │  │
│  │  ┌─────────────────────────────────┐   │  │
│  │  │ Statistics (Nodes, Branches)    │   │  │
│  │  └─────────────────────────────────┘   │  │
│  │  ┌─────────────────────────────────┐   │  │
│  │  │ Stage Coverage Visualization    │   │  │
│  │  └─────────────────────────────────┘   │  │
│  │  [Discard] [Edit YAML] [Accept]        │  │
│  └─────────────────────────────────────────┘  │
│                    ↓                           │
│  ┌─────────────────────────────────────────┐  │
│  │      PublishButton.tsx                  │  │
│  │  [Publish to Gallery]                   │  │
│  │  Success/Error Messages                 │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│    User     │
│ Enters Text │
└──────┬──────┘
       ↓
┌──────────────────────────────────────────────────┐
│           GenerateModal Component                │
│                                                  │
│  1. Validate input                               │
│  2. Check authentication                         │
│  3. Get API key (Supabase or localStorage)       │
└──────┬───────────────────────────────────────────┘
       ↓
       ├─────────────────────┬─────────────────────┐
       ↓ (Authenticated)     ↓ (Guest/Fallback)   ↓
┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐
│ Supabase Edge    │  │  Direct Browser  │  │ localStorage│
│    Function      │  │    API Call      │  │   API Key   │
│                  │  │                  │  └─────────────┘
│ 1. Get user_id   │  │ 1. Use local key │
│ 2. Fetch settings│  │ 2. Build request │
│ 3. Call LLM      │  │ 3. Call LLM      │
└──────┬───────────┘  └──────┬───────────┘
       │                     │
       └──────────┬──────────┘
                  ↓
           ┌──────────────┐
           │  LLM API     │
           │  (OpenAI/    │
           │   Azure/etc) │
           └──────┬───────┘
                  ↓
           ┌──────────────────┐
           │  LLM Response    │
           │  (YAML content)  │
           └──────┬───────────┘
                  ↓
    ┌─────────────────────────────┐
    │  GenerateModal (continued)  │
    │                             │
    │  1. Extract YAML            │
    │  2. parseYaml()             │
    │  3. validateTree()          │
    └──────┬──────────────────────┘
           ↓
    ┌──────────────────┐
    │   Valid Problem  │
    │   Object Ready   │
    └──────┬───────────┘
           ↓
    ┌──────────────────────────────┐
    │   PreviewTree Component      │
    │                              │
    │  1. Display statistics       │
    │  2. Show stage coverage      │
    │  3. Allow YAML editing       │
    │  4. Revalidate on changes    │
    └──────┬───────────────────────┘
           ↓
    ┌──────────────┐
    │ User Actions │
    └──────┬───────┘
           ├─────────────────┬───────────────┐
           ↓ (Discard)       ↓ (Edit)        ↓ (Accept)
    ┌────────────┐    ┌─────────────┐  ┌────────────────┐
    │   Reset    │    │ YAML Editor │  │  Move to       │
    │   State    │    │ + Validate  │  │  Publish Step  │
    └────────────┘    └─────────────┘  └────────┬───────┘
                                               ↓
                                        ┌──────────────────┐
                                        │ PublishButton    │
                                        │                  │
                                        │ 1. Check auth    │
                                        │ 2. Stringify     │
                                        │ 3. Upsert draft  │
                                        └──────┬───────────┘
                                               ↓
                                        ┌──────────────────┐
                                        │  user_drafts     │
                                        │  (Supabase)      │
                                        └──────────────────┘
```

## State Machine

```
┌─────────┐
│  IDLE   │
└────┬────┘
     │ User clicks "Generate"
     ↓
┌──────────────┐
│ GENERATING   │ ← Calling LLM API
└────┬─────────┘
     │ Response received
     ↓
┌──────────────┐
│   PARSING    │ ← Extracting YAML
└────┬─────────┘
     │ YAML extracted
     ↓
┌──────────────┐
│ VALIDATING   │ ← Running validateTree()
└────┬─────────┘
     │
     ├─────────────────┬──────────────┐
     ↓ (Valid)         ↓ (Invalid)   ↓
┌──────────┐    ┌──────────┐    ┌─────────┐
│ SUCCESS  │    │  ERROR   │    │ PREVIEW │
└────┬─────┘    └────┬─────┘    └────┬────┘
     │               │               │
     ↓               │               ├──→ Edit → VALIDATING
┌──────────┐         │               │
│ PREVIEW  │         ↓               ├──→ Accept → ACCEPTED
└────┬─────┘    Retry Button         │
     │               │               ↓
     │               └─→ IDLE    ┌──────────┐
     │                           │ ACCEPTED │
     ↓                           └────┬─────┘
┌──────────┐                          │
│ ACCEPTED │                          ↓
└────┬─────┘                   ┌──────────────┐
     │                         │ PUBLISHING   │
     ↓                         └────┬─────────┘
┌──────────────┐                    │
│ PUBLISHING   │              ┌─────┴──────┐
└────┬─────────┘              ↓            ↓
     │                   ┌──────────┐ ┌─────────┐
     ↓                   │ SUCCESS  │ │  ERROR  │
┌──────────┐            └──────────┘ └─────────┘
│ PUBLISHED│
└──────────┘
```

## API Request Flow

### Edge Function Path (Authenticated)

```
Browser                    Edge Function              Supabase DB           LLM API
   │                            │                         │                   │
   │ POST /generate-tree        │                         │                   │
   │ + user_id, description     │                         │                   │
   ├───────────────────────────→│                         │                   │
   │                            │                         │                   │
   │                            │ SELECT user_settings    │                   │
   │                            ├────────────────────────→│                   │
   │                            │                         │                   │
   │                            │ ← API key + settings    │                   │
   │                            │←────────────────────────┤                   │
   │                            │                         │                   │
   │                            │ POST /chat/completions  │                   │
   │                            │ + API key + prompt      │                   │
   │                            ├─────────────────────────┼──────────────────→│
   │                            │                         │                   │
   │                            │            YAML response (10-60s)           │
   │                            │←─────────────────────────┼───────────────────┤
   │                            │                         │                   │
   │ ← LLM response (YAML)      │                         │                   │
   │←───────────────────────────┤                         │                   │
   │                            │                         │                   │
   │ Parse & Validate           │                         │                   │
   │ (client-side)              │                         │                   │
   │                            │                         │                   │
```

### Direct API Path (Guest)

```
Browser                    localStorage              LLM API
   │                            │                      │
   │ GET llm_api_key            │                      │
   ├───────────────────────────→│                      │
   │                            │                      │
   │ ← API key                  │                      │
   │←───────────────────────────┤                      │
   │                            │                      │
   │ POST /chat/completions     │                      │
   │ + API key + prompt         │                      │
   ├─────────────────────────────┼─────────────────────→│
   │                            │                      │
   │            YAML response (10-60s)                 │
   │←─────────────────────────────┼──────────────────────┤
   │                            │                      │
   │ Parse & Validate           │                      │
   │ (client-side)              │                      │
   │                            │                      │
```

## Database Schema

```sql
┌───────────────────────────────────────────┐
│            user_settings                  │
├───────────────────────────────────────────┤
│ user_id (PK, FK → auth.users)            │
│ llm_base_url (text)                      │
│ llm_api_key_encrypted (text)             │
│ llm_model (text)                         │
│ created_at (timestamptz)                 │
│ updated_at (timestamptz)                 │
└───────────────────────────────────────────┘
                   │
                   │ 1:N
                   ↓
┌───────────────────────────────────────────┐
│            user_drafts                    │
├───────────────────────────────────────────┤
│ id (PK, uuid)                            │
│ user_id (FK → auth.users)               │
│ problem_id (text)                        │
│ title (text)                             │
│ description (text)                       │
│ yaml_content (text)                      │
│ created_at (timestamptz)                 │
│ updated_at (timestamptz)                 │
└───────────────────────────────────────────┘

Unique Index: (user_id, problem_id)
RLS Policy: auth.uid() = user_id
```

## Validation Pipeline

```
Raw YAML Text
     ↓
┌─────────────────────┐
│ YAML Parser (yaml)  │
│ - Parse syntax      │
│ - Build object      │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│ Type Check          │
│ - id: string        │
│ - title: string     │
│ - description: str  │
│ - root: string      │
│ - nodes: array      │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│ Structure Check     │
│ - Unique IDs        │
│ - Root exists       │
│ - Valid references  │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│ Node Type Check     │
│ - info has next     │
│ - question has ≥2   │
│   choices           │
│ - terminal has no   │
│   next/choices      │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│ Graph Check         │
│ - No orphans        │
│ - Cycle detection   │
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│   Valid Problem     │
└─────────────────────┘
```

## Error Recovery Flow

```
┌───────────┐
│   Error   │
└─────┬─────┘
      │
      ├────────────────────┬────────────────────┬─────────────────┐
      ↓                    ↓                    ↓                 ↓
┌─────────────┐    ┌──────────────┐    ┌──────────────┐  ┌──────────────┐
│ API Error   │    │ Parse Error  │    │ Valid. Error │  │   DB Error   │
└─────┬───────┘    └──────┬───────┘    └──────┬───────┘  └──────┬───────┘
      │                   │                   │                 │
      ↓                   ↓                   ↓                 ↓
┌─────────────┐    ┌──────────────┐    ┌──────────────┐  ┌──────────────┐
│ Show error  │    │ Show YAML    │    │ Show specific│  │ Show error   │
│ + Retry btn │    │ + Edit btn   │    │ errors + Fix │  │ + Retry btn  │
└─────┬───────┘    └──────┬───────┘    └──────┬───────┘  └──────┬───────┘
      │                   │                   │                 │
      ↓                   ↓                   ↓                 ↓
┌─────────────┐    ┌──────────────┐    ┌──────────────┐  ┌──────────────┐
│ Retry API   │    │ User edits   │    │ User fixes   │  │ Retry save   │
│ call        │    │ YAML         │    │ or regenerate│  │              │
└─────────────┘    └──────────────┘    └──────────────┘  └──────────────┘
```

## Prompt Engineering Flow

```
User Description
     ↓
┌─────────────────────────────────────────┐
│        System Prompt Selection          │
│  ┌─────────────┐    ┌───────────────┐  │
│  │  GENERATE   │    │    BRANCH     │  │
│  │   (Full)    │    │  (Extend)     │  │
│  └─────────────┘    └───────────────┘  │
└──────────┬──────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│      System Prompt Components           │
│  1. YAML Schema Definition              │
│  2. ML Stages (8 stages)               │
│  3. Rules (branching, speakers, etc.)  │
│  4. Example Structure                   │
└──────────┬──────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│         LLM Processing                  │
│  - Temperature: 0.7                     │
│  - Max Tokens: 8000                     │
│  - Model: gpt-4o (or user choice)      │
└──────────┬──────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│         Response Processing             │
│  1. Extract YAML from markdown blocks   │
│  2. Parse YAML                          │
│  3. Validate structure                  │
│  4. Return Problem object               │
└─────────────────────────────────────────┘
```

## Component Responsibilities

### GenerateModal
- ✓ Input collection
- ✓ Authentication check
- ✓ API key retrieval
- ✓ LLM request orchestration
- ✓ Response parsing
- ✓ Initial validation
- ✓ Loading states
- ✓ Error handling

### PreviewTree
- ✓ Statistics calculation
- ✓ Stage coverage visualization
- ✓ YAML editing interface
- ✓ Re-validation
- ✓ User confirmation
- ✓ Discard confirmation

### PublishButton
- ✓ Authentication check
- ✓ YAML serialization
- ✓ Database upsert logic
- ✓ Success/error states
- ✓ Retry mechanism

## Security Layers

```
┌────────────────────────────────────────────┐
│            Browser (Client)                │
│  - API keys in encrypted storage           │
│  - No sensitive data in console            │
│  - HTTPS only                              │
└──────────────┬─────────────────────────────┘
               ↓
┌────────────────────────────────────────────┐
│         Edge Function (Server)             │
│  - Validates user_id                       │
│  - Fetches encrypted keys from DB          │
│  - Never logs sensitive data               │
│  - CORS headers configured                 │
└──────────────┬─────────────────────────────┘
               ↓
┌────────────────────────────────────────────┐
│          Supabase Database                 │
│  - Row Level Security (RLS) enabled        │
│  - Users can only access own data          │
│  - API keys stored encrypted               │
│  - Auth required for writes                │
└────────────────────────────────────────────┘
```

## Monitoring Points

```
┌────────────────┐
│  Client Side   │
├────────────────┤
│ • API calls    │
│ • Parse errors │
│ • Valid errors │
│ • UI errors    │
└────────┬───────┘
         ↓
┌────────────────┐
│  Edge Func     │
├────────────────┤
│ • Invocations  │
│ • Duration     │
│ • Errors       │
│ • Timeouts     │
└────────┬───────┘
         ↓
┌────────────────┐
│   Database     │
├────────────────┤
│ • Queries      │
│ • Inserts      │
│ • RLS denials  │
│ • Performance  │
└────────┬───────┘
         ↓
┌────────────────┐
│  LLM API       │
├────────────────┤
│ • Requests     │
│ • Tokens used  │
│ • Errors       │
│ • Costs        │
└────────────────┘
```
