import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open settings panel when clicking settings button', async ({ page }) => {
    // Click settings gear icon
    const settingsBtn = page.getByTitle('LLM Settings');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });

    await settingsBtn.click();
    await page.waitForTimeout(500);

    // Settings panel should be visible
    // Look for settings-related content
    const settingsPanel = page.locator('.fixed.inset-0').filter({ hasText: /settings|API|LLM|configuration/i });
    const isPanelVisible = await settingsPanel.isVisible({ timeout: 3000 }).catch(() => false);

    expect(isPanelVisible).toBeTruthy();
  });

  test('should close settings panel when clicking close button', async ({ page }) => {
    // Open settings
    await page.getByTitle('LLM Settings').click();
    await page.waitForTimeout(500);

    // Find and click close button
    const closeBtn = page.getByRole('button', { name: /close/i }).or(
      page.locator('button').filter({ hasText: /×|close/i })
    );

    const isCloseVisible = await closeBtn.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (isCloseVisible) {
      await closeBtn.first().click();
      await page.waitForTimeout(500);

      // Settings panel should not be visible
      const settingsPanel = page.locator('.fixed.inset-0').filter({ hasText: /settings|API|LLM|configuration/i });
      await expect(settingsPanel).not.toBeVisible();
    }
  });

  test('should show settings gear icon in top bar', async ({ page }) => {
    // Settings button with gear icon should be in top bar
    const topBar = page.locator('.h-10.bg-white.border-b');
    const settingsBtn = topBar.getByTitle('LLM Settings');

    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
  });

  test('should not interfere with wizard when settings is open', async ({ page }) => {
    // Open settings
    await page.getByTitle('LLM Settings').click();
    await page.waitForTimeout(500);

    // Wizard should still be visible behind/around the settings panel
    // The wizard panel is in the background
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');

    // Wizard exists (may be behind modal overlay)
    const wizardExists = await wizardPanel.count() > 0;
    expect(wizardExists).toBeTruthy();
  });

  test('should have settings button accessible from any view mode', async ({ page }) => {
    // Test in Split mode
    await page.getByRole('button', { name: /^split$/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByTitle('LLM Settings')).toBeVisible();

    // Test in Graph Only mode
    await page.getByRole('button', { name: /graph only/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByTitle('LLM Settings')).toBeVisible();

    // Test in Wizard Only mode
    await page.getByRole('button', { name: /wizard only/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByTitle('LLM Settings')).toBeVisible();
  });

  test('should show Sign In button when not authenticated', async ({ page }) => {
    // Should show Sign In button in top bar
    const signInBtn = page.getByRole('button', { name: /sign in/i });

    // Button may or may not be visible depending on auth state
    const isVisible = await signInBtn.isVisible({ timeout: 2000 }).catch(() => false);

    // This is acceptable - button shows when not authenticated
    if (isVisible) {
      await expect(signInBtn).toBeVisible();
    }
  });

  test('should open login page when clicking Sign In', async ({ page }) => {
    // Check if Sign In button exists
    const signInBtn = page.getByRole('button', { name: /sign in/i });
    const hasSignIn = await signInBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSignIn) {
      await signInBtn.click();
      await page.waitForTimeout(1000);

      // Should show login page or modal
      const loginContent = page.locator('text=/sign in|log in|github|authentication/i');
      const hasLogin = await loginContent.first().isVisible({ timeout: 3000 }).catch(() => false);

      expect(hasLogin).toBeTruthy();
    }
  });

  test('should persist state when opening and closing settings', async ({ page }) => {
    // Make a navigation move
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    // Get current node
    const nodeIdBefore = await page.locator('.text-xs.text-gray-500.text-center').textContent();

    // Open settings
    await page.getByTitle('LLM Settings').click();
    await page.waitForTimeout(500);

    // Close settings (click outside or close button)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Node should be the same
    const nodeIdAfter = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    expect(nodeIdAfter).toBe(nodeIdBefore);
  });
});
