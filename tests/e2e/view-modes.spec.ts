import { test, expect } from '@playwright/test';

test.describe('View Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for view to be ready
    await page.waitForTimeout(1000);
  });

  test('should toggle between Graph Only, Split, and Wizard Only', async ({ page }) => {
    // Default should be Split mode (button is highlighted)
    const splitBtn = page.getByRole('button', { name: /^split$/i });
    await expect(splitBtn).toHaveClass(/bg-white text-gray-900 shadow-sm/);

    // Switch to Graph Only
    const graphBtn = page.getByRole('button', { name: /graph only/i });
    await graphBtn.click();
    await page.waitForTimeout(500);

    // Graph button should be active
    await expect(graphBtn).toHaveClass(/bg-white text-gray-900 shadow-sm/);

    // Wizard panel should not be visible or should be hidden
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    const isWizardHidden = await wizardPanel.isHidden({ timeout: 2000 }).catch(() => true);
    expect(isWizardHidden).toBeTruthy();

    // Switch to Wizard Only
    const wizardBtn = page.getByRole('button', { name: /wizard only/i });
    await wizardBtn.click();
    await page.waitForTimeout(500);

    // Wizard button should be active
    await expect(wizardBtn).toHaveClass(/bg-white text-gray-900 shadow-sm/);

    // Wizard panel should be visible
    await expect(wizardPanel).toBeVisible({ timeout: 2000 });

    // Back to Split
    await splitBtn.click();
    await page.waitForTimeout(500);

    // Split button should be active again
    await expect(splitBtn).toHaveClass(/bg-white text-gray-900 shadow-sm/);
  });

  test('should show graph in Graph Only mode', async ({ page }) => {
    // Switch to Graph Only
    const graphBtn = page.getByRole('button', { name: /graph only/i });
    await graphBtn.click();
    await page.waitForTimeout(500);

    // Graph should take full width (check that it's visible)
    const graphContainer = page.locator('.react-flow');
    await expect(graphContainer).toBeVisible({ timeout: 5000 });
  });

  test('should show wizard in Wizard Only mode', async ({ page }) => {
    // Switch to Wizard Only
    const wizardBtn = page.getByRole('button', { name: /wizard only/i });
    await wizardBtn.click();
    await page.waitForTimeout(500);

    // Wizard should be visible
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 2000 });

    // Should show question card content
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4');
    await expect(questionCard).toBeVisible({ timeout: 2000 });
  });

  test('should show both graph and wizard in Split mode', async ({ page }) => {
    // Ensure we're in Split mode
    const splitBtn = page.getByRole('button', { name: /^split$/i });
    await splitBtn.click();
    await page.waitForTimeout(500);

    // Both should be visible
    const graphContainer = page.locator('.react-flow');
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');

    await expect(graphContainer).toBeVisible({ timeout: 5000 });
    await expect(wizardPanel).toBeVisible({ timeout: 5000 });
  });

  test('should persist navigation state when switching view modes', async ({ page }) => {
    // Make a navigation move
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    // Get current node ID
    const nodeIdInSplit = await page.locator('.text-xs.text-gray-500.text-center').textContent();

    // Switch to Wizard Only
    await page.getByRole('button', { name: /wizard only/i }).click();
    await page.waitForTimeout(500);

    // Node should be the same
    const nodeIdInWizard = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    expect(nodeIdInWizard).toBe(nodeIdInSplit);

    // Switch to Graph Only
    await page.getByRole('button', { name: /graph only/i }).click();
    await page.waitForTimeout(500);

    // Switch back to Split
    await page.getByRole('button', { name: /^split$/i }).click();
    await page.waitForTimeout(500);

    // Node should still be the same
    const nodeIdBackInSplit = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    expect(nodeIdBackInSplit).toBe(nodeIdInSplit);
  });

  test('should show divider in Split mode', async ({ page }) => {
    // Ensure we're in Split mode
    const splitBtn = page.getByRole('button', { name: /^split$/i });
    await splitBtn.click();
    await page.waitForTimeout(500);

    // Divider should be visible (the draggable divider)
    const divider = page.locator('.w-1.bg-gray-300.hover\\:bg-blue-500.cursor-col-resize');
    await expect(divider).toBeVisible({ timeout: 2000 });
  });
});
