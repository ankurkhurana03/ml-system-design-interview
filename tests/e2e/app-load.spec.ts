import { test, expect } from '@playwright/test';

test.describe('App Loading', () => {
  test('should load the app and show sidebar', async ({ page }) => {
    await page.goto('/');

    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Sidebar should be visible with "ML System Design" header
    await expect(page.getByText('ML System Design')).toBeVisible({ timeout: 10000 });
  });

  test('should show built-in problem in sidebar', async ({ page }) => {
    await page.goto('/');

    // Wait for problems to load
    await page.waitForLoadState('networkidle');

    // Should show the Flight Delay Prediction problem
    await expect(page.getByText('Flight Delay Prediction')).toBeVisible({ timeout: 10000 });
  });

  test('should auto-load first problem', async ({ page }) => {
    await page.goto('/');

    // Wait for the problem to load
    await page.waitForLoadState('networkidle');

    // Problem title should appear in the top bar
    const topBarTitle = page.locator('.bg-white.border-b').getByText('Flight Delay Prediction');
    await expect(topBarTitle).toBeVisible({ timeout: 10000 });

    // Wizard should show content (wait for wizard panel to be ready)
    // The wizard shows "Problem Statement" or similar content from the first node
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });

    // Should see either Continue button or a question
    const hasContinue = await page.getByRole('button', { name: /continue/i }).isVisible().catch(() => false);
    const hasChoices = await page.locator('button').filter({ hasText: /classification|regression/i }).first().isVisible().catch(() => false);

    expect(hasContinue || hasChoices).toBeTruthy();
  });

  test('should show problem description in sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show problem description
    await expect(page.getByText(/predict flight delays/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show view mode toggle buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // View mode buttons should be visible
    await expect(page.getByRole('button', { name: /graph only/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /^split$/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /wizard only/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show settings button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Settings button should be visible
    const settingsBtn = page.getByTitle('LLM Settings');
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });
  });
});
