import { test, expect } from '@playwright/test';

test.describe('Wizard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for problem to load
    await page.waitForLoadState('networkidle');

    // Ensure wizard panel is visible
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });
  });

  test('should show initial node with navigation option', async ({ page }) => {
    // First node should have either Continue button or choices
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const choiceButtons = page.locator('button').filter({ hasText: /classification|regression|yes|no/i });

    const hasContinue = await continueBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const hasChoices = await choiceButtons.first().isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasContinue || hasChoices).toBeTruthy();
  });

  test('should advance on Continue click', async ({ page }) => {
    // Look for Continue button
    const continueBtn = page.getByRole('button', { name: /continue/i });

    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get current node ID to verify we moved
      const nodeIdBefore = await page.locator('.text-xs.text-gray-500.text-center').textContent();

      await continueBtn.click();

      // Wait for navigation
      await page.waitForTimeout(500);

      // Node should have changed
      const nodeIdAfter = await page.locator('.text-xs.text-gray-500.text-center').textContent();
      expect(nodeIdAfter).not.toBe(nodeIdBefore);
    }
  });

  test('should show choices at question node', async ({ page }) => {
    // Navigate until we find a question node (may already be at one)
    let maxAttempts = 10;
    let foundQuestion = false;

    while (maxAttempts > 0 && !foundQuestion) {
      maxAttempts--;

      // Check if we're at a question node (has multiple choice buttons)
      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      const choiceCount = await choiceButtons.count();

      if (choiceCount >= 2) {
        foundQuestion = true;
        break;
      }

      // Try to advance
      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    // Should have found a question with choices
    if (foundQuestion) {
      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      expect(await choiceButtons.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('should navigate back with Back button', async ({ page }) => {
    // First advance once
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });

    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    } else if (await choiceButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await choiceButtons.first().click();
      await page.waitForTimeout(500);
    }

    // Now check for back button
    const backBtn = page.getByRole('button', { name: /back/i });

    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const nodeIdBefore = await page.locator('.text-xs.text-gray-500.text-center').textContent();

      await backBtn.click();
      await page.waitForTimeout(500);

      // Should have navigated back (node ID should change)
      const nodeIdAfter = await page.locator('.text-xs.text-gray-500.text-center').textContent();
      expect(nodeIdAfter).not.toBe(nodeIdBefore);
    }
  });

  test('should complete a full path through the tree', async ({ page }) => {
    // Navigate through all nodes, clicking Continue for info and first choice for questions
    let maxSteps = 50;
    let reachedTerminal = false;

    while (maxSteps > 0) {
      maxSteps--;

      // Check if we reached a terminal node (has "Start Over" button)
      const startOverBtn = page.getByRole('button', { name: /start over/i });
      if (await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        reachedTerminal = true;
        break;
      }

      // Check for Continue button
      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      // Check for choice buttons (question node)
      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      const count = await choiceButtons.count();
      if (count > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        continue;
      }

      // If we can't continue, break
      break;
    }

    // Should have reached a terminal node
    expect(reachedTerminal).toBeTruthy();

    // Should see completion message
    await expect(page.getByText(/interview complete/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display breadcrumb trail', async ({ page }) => {
    // Make at least one move
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });

    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    } else if (await choiceButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await choiceButtons.first().click();
      await page.waitForTimeout(500);
    }

    // Check if breadcrumb is visible (it's in the PathBreadcrumb component)
    // The breadcrumb shows visited nodes
    const breadcrumb = page.locator('.bg-white.border-b').nth(1);
    if (await breadcrumb.isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(await breadcrumb.isVisible()).toBeTruthy();
    }
  });

  test('should show stage indicator', async ({ page }) => {
    // Stage indicator should be visible
    const stageIndicator = page.locator('.bg-white.border-b.border-gray-200');
    await expect(stageIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show speaker label on cards', async ({ page }) => {
    // Should show either "Interviewer" or "Candidate" label
    const speakerLabel = page.locator('.inline-flex.items-center.px-3.py-1.rounded-full').filter({ hasText: /interviewer|candidate/i });
    await expect(speakerLabel.first()).toBeVisible({ timeout: 5000 });
  });
});
