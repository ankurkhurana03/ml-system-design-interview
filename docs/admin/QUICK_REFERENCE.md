# Admin Moderation Quick Reference

## Quick Setup (30 seconds)

```bash
# 1. Run migration
supabase db push

# 2. Make yourself admin (replace with your user ID)
# Get your user ID from Supabase Dashboard → Authentication → Users
psql -h db.xxx.supabase.co -U postgres -d postgres -c \
  "INSERT INTO admin_users (user_id, role) VALUES ('YOUR-USER-ID', 'admin');"

# 3. Deploy edge function
supabase functions deploy moderate-comments

# 4. Done! Refresh app and click shield icon
```

## SQL Quick Commands

### Make User Admin
```sql
INSERT INTO admin_users (user_id, role)
VALUES ('paste-user-id-here', 'admin');
```

### Check Who is Admin
```sql
SELECT u.email, a.role, a.created_at
FROM admin_users a
JOIN auth.users u ON u.id = a.user_id;
```

### Remove Admin Access
```sql
DELETE FROM admin_users WHERE user_id = 'user-id-here';
```

### View All Pending Comments
```sql
SELECT id, author_name, content, comment_type, created_at
FROM node_comments
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Manually Approve Comment
```sql
UPDATE node_comments
SET status = 'approved', updated_at = NOW()
WHERE id = 'comment-id-here';
```

### View Comment Statistics
```sql
SELECT
  status,
  comment_type,
  COUNT(*) as count
FROM node_comments
GROUP BY status, comment_type
ORDER BY status, comment_type;
```

## UI Quick Actions

### Access Admin Panel
1. Sign in as admin user
2. Click **shield icon** (top right, next to settings gear)

### Auto-Moderate All Pending
1. Open moderation panel
2. Go to **Pending** tab
3. Click **Auto-Moderate All** button

### Search Comments
1. Open moderation panel
2. Type in search box (searches content, author, problem, node)

## LLM Configuration

### Set Up API Key (In App)
1. Click **Settings gear** icon
2. Fill in:
   - **LLM Base URL:** `https://api.openai.com/v1`
   - **LLM API Key:** Your OpenAI/Anthropic key
   - **Model:** `gpt-4o` or `claude-3-5-sonnet-20241022`
3. Click **Save**

## Troubleshooting Quick Fixes

### Shield Icon Not Showing
```sql
-- Check if you're in admin_users
SELECT * FROM admin_users WHERE user_id = 'your-user-id';

-- If not, add yourself
INSERT INTO admin_users (user_id, role) VALUES ('your-user-id', 'admin');
```

### Auto-Moderation Fails with "No API key"
1. Click Settings gear
2. Add LLM Base URL and API Key
3. Save and retry

## Edge Function Commands

### Deploy Function
```bash
supabase functions deploy moderate-comments
```

### View Logs (Real-time)
```bash
supabase functions logs moderate-comments --follow
```

## Support & Resources

- **Full Documentation:** `ADMIN_MODERATION_README.md`
- **Setup Guide:** `ADMIN_SETUP_CHECKLIST.md`
- **Architecture:** `ARCHITECTURE_DIAGRAM.md`
