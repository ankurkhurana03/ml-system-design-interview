import { test, expect } from '@playwright/test';

test.describe('Node Comments', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    // Wait for problem to load
    await page.waitForLoadState('networkidle');

    // Wait for wizard panel to be visible with extended timeout
    const wizardPanel = page.locator('[data-testid="wizard-panel"]').or(page.locator('.flex.flex-col.h-full.bg-gray-100'));
    await expect(wizardPanel.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show comments toggle on each node', async ({ page }) => {
    // Look for the comments toggle text
    const commentsToggle = page.getByText(/add a suggestion|comment/i).first();
    await expect(commentsToggle).toBeVisible({ timeout: 5000 });
  });

  test('should expand comments section on click', async ({ page }) => {
    // Find and click the comments toggle
    const commentsToggle = page.getByText(/add a suggestion|comment/i).first();
    await commentsToggle.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Should see either "No comments yet" or the add comment button
    const noCommentsText = page.getByText(/no comments yet/i);
    const addCommentBtn = page.getByText(/\+ add comment/i);

    const hasNoComments = await noCommentsText.isVisible({ timeout: 2000 }).catch(() => false);
    const hasAddButton = await addCommentBtn.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasNoComments || hasAddButton).toBeTruthy();
  });

  test('should collapse comments section when clicked again', async ({ page }) => {
    // Expand comments
    const commentsToggle = page.getByText(/add a suggestion|comment/i).first();
    await commentsToggle.click();
    await page.waitForTimeout(300);

    // Verify it's expanded
    const addCommentBtn = page.getByText(/\+ add comment/i);
    await expect(addCommentBtn).toBeVisible({ timeout: 2000 });

    // Collapse comments
    await commentsToggle.click();
    await page.waitForTimeout(300);

    // Verify it's collapsed
    await expect(addCommentBtn).not.toBeVisible();
  });

  test('should open comment form when Add Comment is clicked', async ({ page }) => {
    // Expand comments
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);

    // Click Add Comment button
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Should see the form with name input, type selector, and textarea
    await expect(page.getByPlaceholder(/your name/i)).toBeVisible({ timeout: 3000 });

    // Check for type selector (should have "Suggestion" option selected)
    const typeSelector = page.locator('select').filter({ hasText: /suggestion|question|feedback/i });
    await expect(typeSelector.first()).toBeVisible();

    // Check for textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('should submit a comment successfully', async ({ page }) => {
    // Expand comments
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);

    // Open form
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Fill in the form
    await page.getByPlaceholder(/your name/i).fill('Test User');
    await page.locator('textarea').first().fill('This is a test suggestion for the system design');

    // Submit
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Comment should appear in the list
    await expect(page.getByText('Test User').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('This is a test suggestion for the system design')).toBeVisible();

    // Form should be hidden
    const nameInput = page.getByPlaceholder(/your name/i);
    await expect(nameInput).not.toBeVisible();
  });

  test('should display comment with correct type badge', async ({ page }) => {
    // Expand comments and open form
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Submit a suggestion
    await page.getByPlaceholder(/your name/i).fill('Badge Tester');

    // Select "Question" type
    const typeSelector = page.locator('select').first();
    await typeSelector.selectOption('question');

    await page.locator('textarea').first().fill('Is this the right approach?');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Should see Question badge
    const questionBadge = page.locator('.text-xs.px-1\\.5.py-0\\.5.rounded').filter({ hasText: /question/i });
    await expect(questionBadge.first()).toBeVisible({ timeout: 3000 });
  });

  test('should persist author name across submissions', async ({ page }) => {
    // Expand comments and submit first comment
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('Persistent User');
    await page.locator('textarea').first().fill('First comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Open form again
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Name should be pre-filled
    const nameInput = page.getByPlaceholder(/your name/i);
    await expect(nameInput).toHaveValue('Persistent User');
  });

  test('should cancel comment form', async ({ page }) => {
    // Expand comments and open form
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Fill in some data
    await page.getByPlaceholder(/your name/i).fill('Cancel User');
    await page.locator('textarea').first().fill('This will be cancelled');

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    await page.waitForTimeout(300);

    // Form should be hidden
    await expect(page.getByPlaceholder(/your name/i)).not.toBeVisible();

    // Add Comment button should be visible again
    await expect(page.getByText(/\+ add comment/i).first()).toBeVisible();
  });

  test('should disable submit button when content is empty', async ({ page }) => {
    // Expand comments and open form
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Fill name but leave content empty
    await page.getByPlaceholder(/your name/i).fill('Empty Content User');

    // Submit button should be disabled
    const submitBtn = page.getByRole('button', { name: /^submit$/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('should enable submit button when content is added', async ({ page }) => {
    // Expand comments and open form
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    const submitBtn = page.getByRole('button', { name: /^submit$/i });
    await expect(submitBtn).toBeDisabled();

    // Add content
    await page.locator('textarea').first().fill('Now there is content');

    // Submit button should be enabled
    await expect(submitBtn).not.toBeDisabled();
  });

  test('should show reply button on comments', async ({ page }) => {
    // Add a comment first
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('Original Commenter');
    await page.locator('textarea').first().fill('Original comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Reply button should be visible
    const replyBtn = page.getByRole('button', { name: /^reply$/i });
    await expect(replyBtn.first()).toBeVisible({ timeout: 3000 });
  });

  test('should open reply form when Reply is clicked', async ({ page }) => {
    // Add a comment first
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('Original Commenter');
    await page.locator('textarea').first().fill('Original comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Click Reply
    await page.getByRole('button', { name: /^reply$/i }).first().click();
    await page.waitForTimeout(300);

    // Should show "Replying to comment" text
    await expect(page.getByText(/replying to comment/i)).toBeVisible({ timeout: 3000 });

    // Form should be visible
    await expect(page.getByPlaceholder(/your name/i)).toBeVisible();
  });

  test('should submit a reply to a comment', async ({ page }) => {
    // Add a parent comment
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('Parent Commenter');
    await page.locator('textarea').first().fill('Parent comment that needs a reply');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Click Reply
    await page.getByRole('button', { name: /^reply$/i }).first().click();
    await page.waitForTimeout(300);

    // Fill reply form
    await page.getByPlaceholder(/your name/i).fill('Reply Author');
    await page.locator('textarea').first().fill('This is my reply to your comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Reply should appear nested under parent
    await expect(page.getByText('Reply Author')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('This is my reply to your comment')).toBeVisible();
  });

  test('should cancel reply and return to normal comment form', async ({ page }) => {
    // Add a comment first
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('Original Commenter');
    await page.locator('textarea').first().fill('Original comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Click Reply
    await page.getByRole('button', { name: /^reply$/i }).first().click();
    await page.waitForTimeout(300);

    // Should show "Replying to comment"
    await expect(page.getByText(/replying to comment/i)).toBeVisible();

    // Click "Cancel reply"
    await page.getByRole('button', { name: /cancel reply/i }).click();
    await page.waitForTimeout(300);

    // "Replying to comment" should be gone
    await expect(page.getByText(/replying to comment/i)).not.toBeVisible();
  });

  test('should show multiple comments', async ({ page }) => {
    // Add first comment
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('User One');
    await page.locator('textarea').first().fill('First comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Add second comment
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('User Two');
    await page.locator('textarea').first().fill('Second comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Both should be visible
    await expect(page.getByText('User One').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('User Two').first()).toBeVisible();
    await expect(page.getByText('First comment')).toBeVisible();
    await expect(page.getByText('Second comment')).toBeVisible();
  });

  test('should show comment count in toggle button', async ({ page }) => {
    // Initially should show "Add a suggestion or question"
    const commentsToggle = page.getByText(/add a suggestion|comment/i).first();
    await expect(commentsToggle).toBeVisible({ timeout: 5000 });

    // Add a comment
    await commentsToggle.click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    await page.getByPlaceholder(/your name/i).fill('Counter User');
    await page.locator('textarea').first().fill('Counting comment');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Collapse and check count
    await commentsToggle.click();
    await page.waitForTimeout(300);

    // Should now show "1 comment"
    await expect(page.getByText(/1 comment$/i)).toBeVisible({ timeout: 3000 });
  });

  test('should use Anonymous if name is not provided', async ({ page }) => {
    // Expand comments and open form
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Leave name empty, just fill content
    await page.locator('textarea').first().fill('Anonymous comment content');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Should show "Anonymous" as author
    await expect(page.getByText('Anonymous').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Anonymous comment content')).toBeVisible();
  });

  test('should support different comment types (suggestion, question, feedback)', async ({ page }) => {
    // Expand comments
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);

    // Add a suggestion
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder(/your name/i).fill('Suggester');
    await page.locator('select').first().selectOption('suggestion');
    await page.locator('textarea').first().fill('This is a suggestion');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Add a question
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder(/your name/i).fill('Questioner');
    await page.locator('select').first().selectOption('question');
    await page.locator('textarea').first().fill('This is a question?');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Add feedback
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder(/your name/i).fill('Feedback Giver');
    await page.locator('select').first().selectOption('feedback');
    await page.locator('textarea').first().fill('This is feedback');
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // All three should be visible with correct badges
    await expect(page.getByText('Suggester').first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Questioner').first()).toBeVisible();
    await expect(page.getByText('Feedback Giver').first()).toBeVisible();
  });

  test('should clear form after successful submission', async ({ page }) => {
    // Expand comments and open form
    await page.getByText(/add a suggestion|comment/i).first().click();
    await page.waitForTimeout(300);
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Fill form
    await page.getByPlaceholder(/your name/i).fill('Form Clearer');
    await page.locator('textarea').first().fill('Content to be cleared');

    // Submit
    await page.getByRole('button', { name: /^submit$/i }).click();
    await page.waitForTimeout(500);

    // Open form again
    await page.getByText(/\+ add comment/i).first().click();
    await page.waitForTimeout(200);

    // Name should be preserved, but textarea should be empty
    await expect(page.getByPlaceholder(/your name/i)).toHaveValue('Form Clearer');
    await expect(page.locator('textarea').first()).toHaveValue('');
  });
});
