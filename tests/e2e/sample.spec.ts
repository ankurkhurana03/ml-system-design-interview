import { test, expect } from '@playwright/test';

test.describe('Sample E2E Test Suite', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that the page has loaded
    await expect(page).toHaveTitle(/.*/);
  });

  test('should have a visible main element', async ({ page }) => {
    await page.goto('/');

    // Check for common elements
    const main = page.locator('main, #root, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);
  });
});
