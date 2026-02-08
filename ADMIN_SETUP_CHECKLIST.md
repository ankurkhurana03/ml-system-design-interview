# Admin Moderation Setup Checklist

Quick setup guide for the admin moderation system.

## 1. Database Setup

### Run Migration
```bash
supabase db push
```

Or manually execute in Supabase Dashboard SQL Editor:
```sql
-- Copy contents from: supabase/migrations/004_admin_roles.sql
```

### Create Admin Users
```sql
-- Find user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Grant admin access
INSERT INTO admin_users (user_id, role)
VALUES ('paste-user-id-here', 'admin');
```

## 2. Deploy Edge Function

```bash
# Deploy the auto-moderation function
supabase functions deploy moderate-comments
```

## 3. Configure LLM Settings (In App)

1. Sign in to the app
2. Click the Settings gear icon (top right)
3. Fill in:
   - **LLM Base URL:** `https://api.openai.com/v1` (or your LLM provider)
   - **LLM API Key:** Your API key
   - **Model:** `gpt-4o` (or `claude-3-5-sonnet-20241022`, etc.)
4. Save

## 4. Test Admin Access

1. Sign in with admin account
2. Verify shield icon appears in top bar
3. Click shield to open moderation panel
4. Test features:
   - View pending/approved/rejected/all comments
   - Search and filter
   - Approve/reject individual comments
   - Reply to a comment
   - Auto-moderate a single comment
   - Auto-moderate multiple comments

## 5. Test Auto-Moderation

### Create Test Comments (via Supabase SQL Editor)
```sql
-- Insert a test question
INSERT INTO node_comments (problem_id, node_id, author_name, content, comment_type)
VALUES ('test-problem', 'test-node', 'Test User', 'How does gradient descent work?', 'question');

-- Insert a spam comment
INSERT INTO node_comments (problem_id, node_id, author_name, content, comment_type)
VALUES ('test-problem', 'test-node', 'Spammer', 'BUY CHEAP VIAGRA!!!', 'suggestion');

-- Insert a good suggestion
INSERT INTO node_comments (problem_id, node_id, author_name, content, comment_type)
VALUES ('test-problem', 'test-node', 'Good User', 'Consider adding a section about regularization techniques.', 'suggestion');
```

### Test Auto-Moderation
1. Open moderation panel
2. Go to "Pending" tab
3. Click "Auto-Moderate All" or select comments and click "Auto-Moderate (N)"
4. Wait for processing
5. Verify:
   - Spam is rejected
   - Good suggestion is approved
   - Question is approved and may have an AI-generated answer

## Files Created

- ✅ `/supabase/migrations/004_admin_roles.sql` - Database schema
- ✅ `/src/hooks/useAdmin.ts` - Admin functionality hook
- ✅ `/src/components/admin/ModerationPanel.tsx` - Moderation UI
- ✅ `/supabase/functions/moderate-comments/index.ts` - LLM auto-moderation
- ✅ `/src/App.tsx` - Updated with admin button and panel

## Troubleshooting

### Shield icon not showing
```sql
-- Verify you're in admin_users table
SELECT * FROM admin_users WHERE user_id = 'your-user-id';
```

### Auto-moderation not working
- Check Supabase Functions logs: `supabase functions logs moderate-comments`
- Verify LLM settings are configured correctly
- Test your API key with curl:
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "test"}]}'
```

### Comments not appearing
- Check RLS policies are enabled
- Verify migration ran successfully: `supabase db diff`
- Check browser console for errors

## Next Steps

- Add more admins/moderators as needed
- Monitor comment quality
- Adjust LLM system prompt in edge function if needed
- Consider adding email notifications for new pending comments
- Set up monitoring/alerting for the edge function

## Resources

- Full documentation: `ADMIN_MODERATION_README.md`
- Supabase Dashboard: https://app.supabase.com
- Edge Function Logs: `supabase functions logs moderate-comments --follow`
