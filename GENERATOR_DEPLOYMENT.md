# LLM Tree Generator - Deployment Checklist

## Pre-Deployment

- [ ] Review all files created:
  - [ ] `supabase/functions/generate-tree/index.ts`
  - [ ] `supabase/migrations/002_add_problem_id_to_drafts.sql`
  - [ ] `src/components/generator/GenerateModal.tsx`
  - [ ] `src/components/generator/PreviewTree.tsx`
  - [ ] `src/components/generator/PublishButton.tsx`
  - [ ] `src/components/generator/GeneratorExample.tsx`
  - [ ] `src/components/generator/index.ts`
  - [ ] `src/utils/generateId.ts`

- [ ] Run tests:
  ```bash
  npm test src/components/generator/__tests__/generator.test.ts
  ```

- [ ] Verify TypeScript compilation:
  ```bash
  npm run build
  ```

## Database Setup

- [ ] Run existing migrations:
  ```bash
  supabase migration up
  ```

- [ ] Verify tables exist:
  ```sql
  -- Should return data
  SELECT * FROM user_settings LIMIT 1;
  SELECT * FROM user_drafts LIMIT 1;
  ```

- [ ] Test row-level security:
  ```sql
  -- As authenticated user, should work
  SELECT * FROM user_settings WHERE user_id = auth.uid();

  -- As anonymous, should return nothing
  SELECT * FROM user_settings;
  ```

## Supabase Edge Function

- [ ] Install Supabase CLI (if not already):
  ```bash
  npm install -g supabase
  ```

- [ ] Login to Supabase:
  ```bash
  supabase login
  ```

- [ ] Link to your project:
  ```bash
  supabase link --project-ref YOUR_PROJECT_REF
  ```

- [ ] Deploy the function:
  ```bash
  supabase functions deploy generate-tree
  ```

- [ ] Test the function:
  ```bash
  curl -i --location --request POST \
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-tree' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"problem_description":"Test problem","user_id":"test","mode":"generate"}'
  ```

- [ ] Check function logs:
  ```bash
  supabase functions logs generate-tree
  ```

## Environment Variables

- [ ] Verify Supabase environment variables in `.env`:
  ```
  VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

- [ ] Verify edge function has access to:
  - `SUPABASE_URL` (auto-injected)
  - `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)

## Testing Flow

### 1. Test Guest Flow (No Auth)

- [ ] Open app without signing in
- [ ] Open browser console
- [ ] Set localStorage API key:
  ```javascript
  localStorage.setItem('llm_api_key', 'your-api-key');
  localStorage.setItem('llm_base_url', 'https://api.openai.com/v1');
  localStorage.setItem('llm_model', 'gpt-4o');
  ```
- [ ] Open Generate Modal
- [ ] Enter a test problem: "Build a recommendation system for Netflix"
- [ ] Verify generation works
- [ ] Review generated tree in preview
- [ ] Try editing YAML
- [ ] Verify validation works
- [ ] Try to publish (should show "Sign in to publish")

### 2. Test Authenticated Flow

- [ ] Sign in with GitHub/Google
- [ ] Go to Settings
- [ ] Add LLM API key, base URL, and model
- [ ] Save settings
- [ ] Verify settings saved:
  ```javascript
  // In browser console
  supabase.from('user_settings').select('*').eq('user_id', 'YOUR_USER_ID').single()
  ```
- [ ] Open Generate Modal
- [ ] Enter a test problem
- [ ] Verify generation uses Supabase function
- [ ] Accept the generated tree
- [ ] Publish to drafts
- [ ] Navigate to drafts page
- [ ] Verify draft appears

### 3. Test Error Cases

- [ ] Try generating without API key (should show error)
- [ ] Try generating with invalid API key (should show error with retry)
- [ ] Try parsing invalid YAML (should show validation errors)
- [ ] Try publishing without auth (should show sign-in prompt)
- [ ] Test network timeout (disable network, try to generate)

## Integration Tests

- [ ] Test with different LLM providers:
  - [ ] OpenAI
  - [ ] Azure OpenAI (if available)
  - [ ] Local model via LM Studio (if available)

- [ ] Test with different problem types:
  - [ ] Short problem (1 sentence)
  - [ ] Medium problem (1 paragraph)
  - [ ] Long problem (multiple paragraphs with details)

- [ ] Test tree quality:
  - [ ] Verify all 8 stages present
  - [ ] Verify branching points exist
  - [ ] Verify content is educational
  - [ ] Verify no validation errors

## UI/UX Tests

- [ ] Test modal:
  - [ ] Opens and closes properly
  - [ ] Backdrop click closes modal
  - [ ] ESC key closes modal (if implemented)
  - [ ] Loading states display correctly
  - [ ] Error messages are clear

- [ ] Test preview:
  - [ ] Statistics display correctly
  - [ ] Stage coverage visualization works
  - [ ] Edit mode works
  - [ ] YAML validation in edit mode works
  - [ ] Discard confirmation works

- [ ] Test publish button:
  - [ ] Shows correct state for auth/no-auth
  - [ ] Loading spinner displays
  - [ ] Success message displays
  - [ ] Error handling works

## Performance Tests

- [ ] Test generation time:
  - [ ] Simple problem: < 30 seconds
  - [ ] Complex problem: < 60 seconds
  - [ ] If too slow, adjust max_tokens or model

- [ ] Test YAML parsing:
  - [ ] Small tree (10 nodes): < 100ms
  - [ ] Large tree (100 nodes): < 500ms

- [ ] Test validation:
  - [ ] Should be nearly instant for normal trees

## Browser Testing

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Chrome (responsive)
- [ ] Mobile Safari (responsive)

## Dark Mode Testing

- [ ] All components render correctly in dark mode
- [ ] Text is readable
- [ ] Contrast is sufficient
- [ ] No white flashes on mode change

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader announces states
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Error messages are clear

## Security Checks

- [ ] API keys stored securely (encrypted in database)
- [ ] Row-level security enabled on all tables
- [ ] Edge function validates user_id
- [ ] No API keys in client-side logs
- [ ] No sensitive data in error messages

## Documentation

- [ ] README.md updated with generator info
- [ ] Integration guide reviewed
- [ ] Example code tested
- [ ] API documentation accurate

## Monitoring Setup

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Set up usage analytics
- [ ] Monitor edge function invocations
- [ ] Monitor API costs
- [ ] Set up alerts for errors

## Rollback Plan

If issues occur:

1. [ ] Document the issue
2. [ ] Revert edge function:
   ```bash
   supabase functions deploy generate-tree --previous-version
   ```
3. [ ] Disable feature in UI (feature flag)
4. [ ] Notify users if necessary
5. [ ] Fix issues in development
6. [ ] Re-test thoroughly
7. [ ] Re-deploy

## Post-Deployment

- [ ] Monitor error rates for 24 hours
- [ ] Check user feedback
- [ ] Review generated trees for quality
- [ ] Adjust system prompts if needed
- [ ] Document any issues encountered
- [ ] Update documentation with learnings

## Success Metrics

After 1 week, measure:
- [ ] Number of trees generated
- [ ] Success rate (valid trees / total attempts)
- [ ] Average generation time
- [ ] User retention (users who generate multiple trees)
- [ ] Published drafts count
- [ ] Error rate by type

## Optional Enhancements

Consider adding in future iterations:
- [ ] Streaming responses for better UX
- [ ] Template system (start from examples)
- [ ] Batch generation
- [ ] Tree refinement (regenerate specific sections)
- [ ] Community gallery integration
- [ ] Tree sharing with public links
- [ ] Export to different formats (PDF, Markdown)
- [ ] Version history for drafts
- [ ] Collaborative editing

## Support Resources

- [ ] Create FAQ for common issues
- [ ] Add troubleshooting guide
- [ ] Document common error codes
- [ ] Create example problem descriptions
- [ ] Add tips for better generation results

---

## Quick Start Commands

```bash
# Run all checks
npm test && npm run build

# Deploy everything
supabase migration up
supabase functions deploy generate-tree

# Test locally
npm run dev
# Open http://localhost:5173

# Monitor logs
supabase functions logs generate-tree --follow
```

## Contact

For issues or questions:
- GitHub Issues: [Your repo]
- Email: [Your email]
- Discord: [Your server]
