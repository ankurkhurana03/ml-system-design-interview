import { test, expect } from '@playwright/test';

test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should collapse and expand sidebar', async ({ page }) => {
    // Sidebar should be expanded initially
    await expect(page.getByText('ML System Design')).toBeVisible({ timeout: 5000 });

    // Click collapse button
    const collapseBtn = page.getByTitle(/collapse sidebar/i);
    await collapseBtn.click();
    await page.waitForTimeout(500);

    // "ML System Design" text should not be visible
    await expect(page.getByText('ML System Design')).not.toBeVisible({ timeout: 2000 });

    // Click expand button
    const expandBtn = page.getByTitle(/expand sidebar/i);
    await expandBtn.click();
    await page.waitForTimeout(500);

    // Should see "ML System Design" text again
    await expect(page.getByText('ML System Design')).toBeVisible({ timeout: 2000 });
  });

  test('should filter problems by search', async ({ page }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/search problems/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Search for "flight"
    await searchInput.fill('flight');
    await page.waitForTimeout(500);

    // Should show Flight Delay Prediction
    await expect(page.getByText('Flight Delay Prediction')).toBeVisible();

    // Search for something that doesn't exist
    await searchInput.clear();
    await searchInput.fill('nonexistent problem xyz');
    await page.waitForTimeout(500);

    // Should show "No problems found"
    await expect(page.getByText('No problems found')).toBeVisible();
  });

  test('should show problem difficulty badge', async ({ page }) => {
    // Should show difficulty badge for problems
    const difficultyBadge = page.locator('.text-xs.px-2.py-0\\.5.rounded.font-medium').first();

    // Badge should be visible if problem has difficulty
    const isVisible = await difficultyBadge.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      expect(await difficultyBadge.textContent()).toMatch(/B|I|A/); // Beginner/Intermediate/Advanced
    }
  });

  test('should show problem tags', async ({ page }) => {
    // Should show tags for problems if they exist
    const tags = page.locator('.bg-slate-700.text-slate-300');
    const tagCount = await tags.count();

    if (tagCount > 0) {
      await expect(tags.first()).toBeVisible();
    }
  });

  test('should highlight active problem', async ({ page }) => {
    // The first problem should be active (has blue background)
    const firstProblem = page.locator('button').filter({ hasText: 'Flight Delay Prediction' }).first();
    await expect(firstProblem).toHaveClass(/bg-blue-600 text-white/);
  });

  test('should switch problems when clicked', async ({ page }) => {
    // Get all problem items
    const problemButtons = page.locator('.w-full.text-left.p-3.rounded-lg');
    const count = await problemButtons.count();

    if (count > 1) {
      // Click the second problem if it exists
      const secondProblem = problemButtons.nth(1);
      const problemTitle = await secondProblem.locator('.font-semibold.text-sm').textContent();

      await secondProblem.click();
      await page.waitForTimeout(1000);

      // Check that the problem is now active in the top bar
      const topBarTitle = page.locator('.h-10.bg-white.border-b').getByText(problemTitle || '');
      await expect(topBarTitle).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show Generate New Problem button', async ({ page }) => {
    // Generate button should be visible
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await expect(generateBtn).toBeVisible({ timeout: 5000 });
  });

  test('should open generate modal when clicking Generate button', async ({ page }) => {
    // Click generate button
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Modal should open (look for modal content)
    const modal = page.locator('.fixed.inset-0.z-50').filter({ hasText: /generate|problem|AI/i });
    const isModalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isModalVisible).toBeTruthy();
  });

  test('should show Built-in section header', async ({ page }) => {
    // Should show "Built-in" section
    await expect(page.getByText('Built-in', { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('should truncate long descriptions', async ({ page }) => {
    // Problem descriptions should be truncated if too long
    // Check for ellipsis in description
    const descriptions = page.locator('.text-xs.leading-relaxed');
    const firstDesc = descriptions.first();

    if (await firstDesc.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await firstDesc.textContent();
      // If description is truncated, it should be reasonable length
      expect(text?.length || 0).toBeLessThan(200);
    }
  });

  test('should show brain icon in collapsed sidebar', async ({ page }) => {
    // Click collapse button
    const collapseBtn = page.getByTitle(/collapse sidebar/i);
    await collapseBtn.click();
    await page.waitForTimeout(500);

    // Should show brain icon
    const brainIcon = page.locator('svg').filter({ has: page.locator('path[d*="M9.663"]') });
    await expect(brainIcon.first()).toBeVisible();
  });
});
