# Admin Moderation System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                        App.tsx                              │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │  useAuth()   │  │  useAdmin()  │  │  useProblems │    │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘    │   │
│  │         │                  │                               │   │
│  │         │                  └──> isAdmin                    │   │
│  │         │                       loading                    │   │
│  │         │                       pendingComments            │   │
│  │         │                       moderateComment()          │   │
│  │         │                       replyAsAdmin()             │   │
│  │         │                       refetch()                  │   │
│  │         │                                                  │   │
│  │  ┌──────▼──────────────────────────────────────────────┐  │   │
│  │  │           Conditional Admin Button                   │  │   │
│  │  │  {isAdmin && <Shield Icon onClick={openPanel}>}    │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────┬────────────────────────────────┘
│                                 │                                   │
│  ┌──────────────────────────────▼───────────────────────────────┐ │
│  │              ModerationPanel Component                        │ │
│  │                                                                │ │
│  │  ┌─────────┬──────────┬──────────┬──────┐                   │ │
│  │  │ Pending │ Approved │ Rejected │ All  │ ◄── Tabs          │ │
│  │  └─────────┴──────────┴──────────┴──────┘                   │ │
│  │                                                                │ │
│  │  [Search: _______________]  [Approve All] [Auto-Mod All]     │ │
│  │                                                                │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │ □ Comment 1                           [Type] [Status]  │  │ │
│  │  │   "Great suggestion..."                                 │  │ │
│  │  │   Problem: X | Node: Y | 2024-01-15                    │  │ │
│  │  │   [Approve] [Reject] [Reply] [Auto-Moderate]           │  │ │
│  │  ├────────────────────────────────────────────────────────┤  │ │
│  │  │ □ Comment 2                           [Type] [Status]  │  │ │
│  │  │   "Spam content..."                                     │  │ │
│  │  │   Problem: X | Node: Z | 2024-01-14                    │  │ │
│  │  │   [Approve] [Reject] [Reply] [Auto-Moderate]           │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  │  Selected: 2 comments  [Auto-Moderate (2)]                   │ │
│  └────────────────────────────────────────────────────────────────┘
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           │ Supabase Client
                           │
┌──────────────────────────▼───────────────────────────────────────────┐
│                        SUPABASE BACKEND                               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  PostgreSQL Database                         │   │
│  │                                                               │   │
│  │  ┌──────────────────┐     ┌──────────────────┐             │   │
│  │  │  admin_users     │     │  node_comments   │             │   │
│  │  ├──────────────────┤     ├──────────────────┤             │   │
│  │  │ user_id (PK)     │     │ id (PK)          │             │   │
│  │  │ role             │     │ problem_id       │             │   │
│  │  │ created_at       │     │ node_id          │             │   │
│  │  └──────────────────┘     │ user_id          │             │   │
│  │                            │ author_name      │             │   │
│  │  ┌──────────────────┐     │ content          │             │   │
│  │  │  user_settings   │     │ comment_type     │             │   │
│  │  ├──────────────────┤     │ parent_id        │             │   │
│  │  │ user_id          │     │ status           │             │   │
│  │  │ llm_base_url     │     │ created_at       │             │   │
│  │  │ llm_api_key_enc  │     │ updated_at       │             │   │
│  │  │ llm_model        │     └──────────────────┘             │   │
│  │  └──────────────────┘                                       │   │
│  │                                                               │   │
│  │  Row-Level Security (RLS) Policies:                          │   │
│  │  • Admins can read admin_users                               │   │
│  │  • Admins can manage ALL node_comments                       │   │
│  │  • Users can read approved/answered comments                 │   │
│  │  • Users can insert/update/delete own comments               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Edge Function: moderate-comments                │   │
│  │                                                               │   │
│  │  Input: { comment_ids: [], user_id: string }                │   │
│  │                                                               │   │
│  │  1. Verify admin status                                      │   │
│  │     ↓                                                         │   │
│  │  2. Fetch user's LLM settings                                │   │
│  │     ↓                                                         │   │
│  │  3. Fetch comments to moderate ──────────────────────┐       │   │
│  │     ↓                                                 │       │   │
│  │  4. Call LLM API ──────────────────────────┐         │       │   │
│  │     ↓                                       │         │       │   │
│  │  5. Parse LLM decisions                     │         │       │   │
│  │     ↓                                       │         │       │   │
│  │  6. Update comment statuses ◄───────────────┘         │       │   │
│  │     ↓                                                 │       │   │
│  │  7. Create AI answer comments (if any)                │       │   │
│  │     ↓                                                 │       │   │
│  │  Output: { results: [...] }                          │       │   │
│  └──────────────────────────────────┬────────────────────┘       │   │
│                                     │                            │   │
└─────────────────────────────────────┼────────────────────────────┘
                                      │
                                      │ HTTPS POST
                                      │
┌─────────────────────────────────────▼────────────────────────────────┐
│                          LLM API (External)                           │
│                                                                       │
│  OpenAI, Anthropic, or compatible API                                │
│                                                                       │
│  Input:                                                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ {                                                              │  │
│  │   "model": "gpt-4o",                                           │  │
│  │   "messages": [                                                │  │
│  │     {                                                          │  │
│  │       "role": "system",                                        │  │
│  │       "content": "You are a content moderator..."             │  │
│  │     },                                                         │  │
│  │     {                                                          │  │
│  │       "role": "user",                                          │  │
│  │       "content": "Moderate these comments:\n[...]"            │  │
│  │     }                                                          │  │
│  │   ],                                                           │  │
│  │   "temperature": 0.3                                           │  │
│  │ }                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Output:                                                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ {                                                              │  │
│  │   "choices": [{                                                │  │
│  │     "message": {                                               │  │
│  │       "content": "[                                            │  │
│  │         {                                                      │  │
│  │           \"id\": \"uuid1\",                                   │  │
│  │           \"decision\": \"approved\",                          │  │
│  │           \"reason\": \"Helpful suggestion\",                  │  │
│  │           \"answer\": null                                     │  │
│  │         },                                                     │  │
│  │         {                                                      │  │
│  │           \"id\": \"uuid2\",                                   │  │
│  │           \"decision\": \"approved\",                          │  │
│  │           \"reason\": \"Good question\",                       │  │
│  │           \"answer\": \"Gradient descent is...\"              │  │
│  │         },                                                     │  │
│  │         {                                                      │  │
│  │           \"id\": \"uuid3\",                                   │  │
│  │           \"decision\": \"rejected\",                          │  │
│  │           \"reason\": \"Spam detected\"                        │  │
│  │         }                                                      │  │
│  │       ]"                                                       │  │
│  │     }                                                          │  │
│  │   }]                                                           │  │
│  │ }                                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

### Manual Moderation Flow
```
User (Admin)
    │
    ├─> Clicks "Approve" button
    │
    └─> supabase.from('node_comments')
            .update({ status: 'approved' })
            .eq('id', commentId)
        │
        ├─> PostgreSQL validates RLS policy
        │   (is user in admin_users?)
        │
        ├─> Updates row if authorized
        │
        └─> Returns success
            │
            └─> UI removes from pending list
```

### Auto-Moderation Flow
```
User (Admin)
    │
    ├─> Clicks "Auto-Moderate" button
    │
    └─> supabase.functions.invoke('moderate-comments', {
            body: { comment_ids: [...], user_id: 'xxx' }
        })
        │
        ├─> Edge Function receives request
        │
        ├─> Step 1: Verify admin
        │   SELECT * FROM admin_users WHERE user_id = 'xxx'
        │   ↓
        │   If not found → 403 Unauthorized
        │
        ├─> Step 2: Fetch LLM settings
        │   SELECT * FROM user_settings WHERE user_id = 'xxx'
        │   ↓
        │   If no API key → 400 Bad Request
        │
        ├─> Step 3: Fetch comments
        │   SELECT * FROM node_comments WHERE id IN (...)
        │
        ├─> Step 4: Call LLM API
        │   POST https://api.openai.com/v1/chat/completions
        │   Headers: { Authorization: Bearer <API_KEY> }
        │   Body: { model, messages, temperature }
        │   ↓
        │   LLM processes and returns decisions
        │
        ├─> Step 5: Parse JSON response
        │   Extract decision array from LLM message content
        │   ↓
        │   If parsing fails → 500 Error
        │
        ├─> Step 6: Apply decisions
        │   FOR EACH decision:
        │     UPDATE node_comments
        │     SET status = decision.decision
        │     WHERE id = decision.id
        │
        ├─> Step 7: Create AI answers
        │   FOR EACH decision WITH answer:
        │     INSERT INTO node_comments
        │     (parent_id, content, author_name='AI Moderator', ...)
        │
        └─> Return { results: [...] }
            │
            └─> UI refetches comments and updates display
```

## Component Hierarchy

```
App
└── WizardProvider
    └── AppContent
        ├── useAuth()
        ├── useAdmin()
        ├── useProblems()
        │
        ├── Sidebar
        ├── SplitPane
        │   ├── TreeGraph
        │   └── WizardPanel
        │
        ├── SettingsPanel (modal)
        ├── GenerateModal (modal)
        └── ModerationPanel (modal) ◄── NEW
            │
            ├── Tab Navigation
            ├── Search Input
            ├── Bulk Action Buttons
            │
            └── Comment List
                └── Comment Card (foreach comment)
                    ├── Checkbox
                    ├── Metadata (author, type, status)
                    ├── Content
                    ├── IDs (problem, node)
                    ├── Timestamp
                    ├── Action Buttons
                    │   ├── Approve
                    │   ├── Reject
                    │   ├── Reply
                    │   └── Auto-Moderate
                    │
                    └── Reply Form (conditional)
                        ├── Textarea
                        └── Send/Cancel buttons
```

## State Management

```
useAdmin Hook State:
├── isAdmin: boolean
├── loading: boolean
├── pendingComments: NodeComment[]
│
└── Functions:
    ├── moderateComment(id, status)
    ├── replyAsAdmin(parentId, content, problemId, nodeId)
    └── refetch()

ModerationPanel Component State:
├── activeTab: 'pending' | 'approved' | 'rejected' | 'all'
├── comments: NodeComment[]
├── loading: boolean
├── searchTerm: string
├── replyingTo: string | null
├── replyContent: string
├── autoModerateLoading: boolean
└── selectedComments: Set<string>
```

## API Endpoints

```
Supabase Client (Auto-generated REST API):
├── GET    /rest/v1/admin_users         (with RLS)
├── GET    /rest/v1/node_comments       (with RLS)
├── POST   /rest/v1/node_comments       (with RLS)
├── PATCH  /rest/v1/node_comments       (with RLS)
└── DELETE /rest/v1/node_comments       (with RLS)

Supabase Functions (Serverless):
└── POST   /functions/v1/moderate-comments
    Request:  { comment_ids: string[], user_id: string }
    Response: { results: Decision[] }
```

## Security Layers

```
┌─────────────────────────────────────────────────┐
│ Layer 1: Frontend (Client-Side)                 │
│ • useAdmin() checks admin_users table           │
│ • Only shows admin UI if isAdmin === true       │
│ • Prevents non-admins from seeing panel         │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Layer 2: Row-Level Security (Database)          │
│ • RLS policies enforce access control           │
│ • Only admins can query ALL node_comments       │
│ • Regular users see only approved comments      │
│ • Users can only modify their own comments      │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Layer 3: Edge Function (Server-Side)            │
│ • Verifies admin status before processing       │
│ • Uses service role key to bypass RLS           │
│ • Validates user_id matches authenticated user  │
│ • CORS restricts allowed origins                │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│ Layer 4: LLM API (External)                     │
│ • User's own API key (not shared)               │
│ • Rate limiting by API provider                 │
│ • Cost isolation per admin user                 │
└─────────────────────────────────────────────────┘
```

## File Structure

```
/Users/ankur/Downloads/ml_sys_design/
│
├── src/
│   ├── components/
│   │   └── admin/
│   │       └── ModerationPanel.tsx ◄── NEW (Full moderation UI)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts               (existing)
│   │   └── useAdmin.ts ◄────────── NEW (Admin logic)
│   │
│   ├── types/
│   │   └── tree.ts                  (existing, has CommentType/CommentStatus)
│   │
│   └── App.tsx ◄──────────────────  MODIFIED (Added admin button)
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   (existing)
│   │   ├── 002_add_problem_id.sql   (existing)
│   │   ├── 003_node_comments.sql    (existing)
│   │   └── 004_admin_roles.sql ◄─── NEW (Admin tables & RLS)
│   │
│   └── functions/
│       └── moderate-comments/
│           └── index.ts ◄──────────  NEW (LLM auto-moderation)
│
└── Documentation:
    ├── ADMIN_MODERATION_README.md     (Comprehensive guide)
    ├── ADMIN_SETUP_CHECKLIST.md       (Quick setup steps)
    ├── IMPLEMENTATION_SUMMARY.md      (Feature overview)
    └── ARCHITECTURE_DIAGRAM.md ◄───── This file
```
