# Admin Moderation Panel & LLM Auto-Moderation

This document describes the admin moderation system for node comments in the ML System Design Interview tool.

## Overview

The moderation system includes:
- **Admin role management** - Designate users as moderators or admins
- **Full-featured moderation panel** - Review, approve, reject, and reply to comments
- **LLM-powered auto-moderation** - Automatically moderate comments using AI
- **Bulk actions** - Process multiple comments at once
- **Real-time filtering** - Search and filter comments by status, problem, node, or author

## Files Created

### 1. Database Migration
**Location:** `/supabase/migrations/004_admin_roles.sql`

Creates the `admin_users` table and adds RLS policies for admin comment management.

```sql
-- Admin users table
create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'moderator' check (role in ('moderator', 'admin')),
  created_at timestamptz default now()
);
```

### 2. Admin Hook
**Location:** `/src/hooks/useAdmin.ts`

React hook that provides:
- `isAdmin` - Boolean indicating if current user is an admin
- `loading` - Loading state for admin check
- `pendingComments` - List of pending comments
- `moderateComment(id, status)` - Moderate a single comment
- `replyAsAdmin(parentId, content, problemId, nodeId)` - Reply to a comment as moderator
- `refetch()` - Refresh pending comments list

### 3. Moderation Panel Component
**Location:** `/src/components/admin/ModerationPanel.tsx`

Full-featured admin panel with:
- **Tab navigation:** Pending | Approved | Rejected | All
- **Search & filter:** Filter by content, author, problem_id, or node_id
- **Per-comment actions:**
  - Approve (green button)
  - Reject (red button)
  - Reply (opens inline reply form)
  - Auto-Moderate (sends to LLM)
- **Bulk actions:**
  - Approve All
  - Auto-Moderate All
  - Auto-Moderate Selected (with checkbox selection)
- **Comment display:**
  - Author name
  - Type badge (suggestion/question/feedback/answer)
  - Status badge (pending/approved/rejected/answered)
  - Problem ID and Node ID
  - Timestamp
  - Content

### 4. Edge Function for Auto-Moderation
**Location:** `/supabase/functions/moderate-comments/index.ts`

Serverless function that:
1. Verifies the requesting user is an admin
2. Fetches the user's LLM settings (API key, base URL, model)
3. Sends comments to the LLM for evaluation
4. Parses the LLM's moderation decisions
5. Updates comment statuses in the database
6. Optionally creates AI-generated answers for questions

**LLM Response Format:**
```json
[
  {
    "id": "comment-uuid",
    "decision": "approved|rejected",
    "reason": "brief explanation",
    "answer": "optional AI-generated answer for questions"
  }
]
```

### 5. App.tsx Updates
**Location:** `/src/App.tsx`

Added:
- Import of `useAdmin` hook and `ModerationPanel` component
- Admin shield button in top bar (only visible to admins)
- Moderation panel modal state management

## Setup Instructions

### 1. Run Database Migration

```bash
# Using Supabase CLI
supabase db push

# Or manually execute the migration in Supabase Dashboard
# Navigate to SQL Editor and run the contents of 004_admin_roles.sql
```

### 2. Grant Admin Access to Users

To make a user an admin, insert a row into the `admin_users` table:

```sql
-- Get the user's ID first
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Grant admin role
INSERT INTO admin_users (user_id, role)
VALUES ('user-uuid-here', 'admin');

-- Or grant moderator role
INSERT INTO admin_users (user_id, role)
VALUES ('user-uuid-here', 'moderator');
```

**Role Differences:**
- `moderator` - Can review and moderate comments
- `admin` - Same as moderator (extendable for future admin-only features)

### 3. Deploy Edge Function

```bash
# Deploy the moderate-comments function
supabase functions deploy moderate-comments

# Set environment variables if needed
# (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are automatically available)
```

### 4. Configure LLM Settings

Before using auto-moderation, users must configure their LLM settings:
1. Click the Settings gear icon in the top bar
2. Configure:
   - **LLM Base URL** (e.g., `https://api.openai.com/v1`)
   - **LLM API Key** (e.g., OpenAI API key)
   - **Model** (e.g., `gpt-4o`, `claude-3-5-sonnet-20241022`)

These settings are stored in the `user_settings` table and used by the auto-moderation function.

## Usage

### For Admins

1. **Access the Panel:**
   - Sign in as an admin user
   - Click the shield icon in the top bar
   - The moderation panel opens as a modal

2. **Review Comments:**
   - Switch tabs to view Pending, Approved, Rejected, or All comments
   - Use the search bar to filter comments
   - Each comment shows full metadata (author, type, problem, node, timestamp)

3. **Moderate Individual Comments:**
   - **Approve:** Click green "Approve" button
   - **Reject:** Click red "Reject" button
   - **Reply:** Click "Reply" button, write response, send (auto-approved as "answer" type)
   - **Auto-Moderate:** Click "Auto-Moderate" to let AI decide

4. **Bulk Actions:**
   - **Approve All:** Approves all pending comments visible in current filter
   - **Auto-Moderate All:** Sends all pending comments to LLM
   - **Auto-Moderate Selected:** Check boxes next to comments, then click "Auto-Moderate (N)"

5. **LLM Auto-Moderation:**
   - The LLM evaluates each comment for:
     - Constructiveness and relevance
     - Spam, offensive content, or low quality
     - Opportunity to provide helpful answers to questions
   - Comments are automatically approved or rejected
   - Questions may receive AI-generated answers posted as replies

### For Regular Users

- Users can submit comments on nodes (via existing UI)
- Comments start with `status='pending'`
- Only approved/answered comments are visible to regular users
- Users can see replies from "Moderator" or "AI Moderator"

## Technical Details

### Database Schema

**admin_users:**
- `user_id` (uuid, FK to auth.users)
- `role` (text: 'moderator' or 'admin')
- `created_at` (timestamptz)

**node_comments:** (existing table, updated RLS)
- New RLS policy: Admins can manage ALL comments

### Row-Level Security

```sql
-- Admins can read the admin_users table
create policy "Admins can read admin_users"
  on admin_users for select using (
    auth.uid() in (select user_id from admin_users)
  );

-- Admins can perform all operations on node_comments
create policy "Admins can manage all comments"
  on node_comments for all using (
    auth.uid() in (select user_id from admin_users)
  );
```

### Auto-Moderation Flow

```
User clicks "Auto-Moderate"
  ↓
Frontend calls supabase.functions.invoke('moderate-comments')
  ↓
Edge function verifies admin status
  ↓
Edge function fetches user's LLM settings
  ↓
Edge function sends comments to LLM API
  ↓
LLM returns decisions (approved/rejected + optional answers)
  ↓
Edge function updates comment statuses
  ↓
Edge function creates AI-generated reply comments
  ↓
Frontend refetches comments and updates UI
```

### LLM System Prompt

The auto-moderation function uses this system prompt:

```
You are a content moderator for an ML system design interview learning platform.
Evaluate each comment and decide:
- "approved" - constructive, relevant, helpful suggestion/question/feedback
- "rejected" - spam, offensive, off-topic, low-quality, or inappropriate
- "answer" - if you can provide a helpful answer to a question, include your answer

Be lenient with genuine questions even if poorly worded.
Reject only clearly inappropriate content.
```

## Customization

### Modifying LLM Behavior

Edit `/supabase/functions/moderate-comments/index.ts`:
- Adjust the `systemPrompt` to change moderation criteria
- Modify `temperature` (currently 0.3) for more/less creative responses
- Change the model fallback (currently `gpt-4o`)

### Styling the Panel

Edit `/src/components/admin/ModerationPanel.tsx`:
- Update Tailwind classes for custom styling
- Modify badge colors for different statuses/types
- Adjust panel size (currently `max-w-7xl h-[90vh]`)

### Adding More Admin Features

1. Create new tools in `useAdmin` hook
2. Add buttons/sections to `ModerationPanel`
3. Extend RLS policies as needed

## Troubleshooting

### Admin button not showing
- Ensure user is in `admin_users` table
- Check browser console for errors in `useAdmin` hook
- Verify RLS policies are enabled

### Auto-moderation failing
- Ensure user has configured LLM settings (Settings panel)
- Check Supabase Functions logs: `supabase functions logs moderate-comments`
- Verify API key has sufficient credits/access
- Test LLM API directly with curl

### Comments not updating
- Check browser console for errors
- Verify RLS policies allow admin access
- Ensure database migration ran successfully

## Security Considerations

1. **Admin Access Control:** Only users in `admin_users` table can access moderation features
2. **API Key Storage:** LLM API keys are stored encrypted in `user_settings` table
3. **Service Role Key:** Edge function uses service role key to bypass RLS when needed
4. **Rate Limiting:** Consider adding rate limits to auto-moderation to prevent API abuse

## Future Enhancements

Potential improvements:
- Analytics dashboard (moderation metrics, comment trends)
- Email notifications for new pending comments
- Comment editing history/audit log
- Batch import/export of moderation decisions
- Machine learning model to learn from admin decisions
- User reputation scores based on approved comments
- Customizable auto-moderation rules per problem/category
