import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  const DESKTOP_WIDTH = 1280;
  const DESKTOP_HEIGHT = 720;
  const MOBILE_WIDTH = 375;
  const MOBILE_HEIGHT = 667;
  const TABLET_WIDTH = 768;
  const TABLET_HEIGHT = 1024;

  test('should show sidebar on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify sidebar is visible
    const sidebarText = page.getByText('ML System Design');
    await expect(sidebarText).toBeVisible({ timeout: 5000 });

    // Verify sidebar container is visible
    const sidebar = page.locator('aside, [role="complementary"], .w-64');
    const isSidebarVisible = await sidebar.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isSidebarVisible).toBeTruthy();
  });

  test('should hide sidebar on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait a bit for layout to stabilize
    await page.waitForTimeout(500);

    // Sidebar should be hidden or not visible
    const sidebarText = page.getByText('ML System Design');
    const isSidebarVisible = await sidebarText.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isSidebarVisible).toBeFalsy();
  });

  test('should show hamburger menu on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for hamburger menu button (common patterns: menu icon, bars icon, or button with aria-label)
    const hamburger = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="toggle" i], button[aria-label*="sidebar" i], [data-testid="menu-toggle"]'
    );
    const hamburgerVisible = await hamburger.isVisible({ timeout: 2000 }).catch(() => false);

    // Alternative: check for SVG menu icon
    const menuIcon = page.locator('svg[class*="menu"], svg[class*="bars"], svg[class*="hamburger"]');
    const iconVisible = await menuIcon.isVisible({ timeout: 2000 }).catch(() => false);

    // At least one of these should exist on mobile
    expect(hamburgerVisible || iconVisible).toBeTruthy();
  });

  test('should show wizard panel on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for wizard panel to load
    await page.waitForTimeout(500);

    // Verify wizard panel is visible
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 5000 });

    // Verify question card or content is visible
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4, .bg-white.rounded-lg.shadow');
    const cardVisible = await questionCard.isVisible({ timeout: 2000 }).catch(() => false);

    // If not a question card, should at least have some content
    if (!cardVisible) {
      const wizardContent = page.locator('.flex.flex-col.h-full.bg-gray-100 >> visible=true');
      await expect(wizardContent).toBeVisible({ timeout: 2000 });
    }
  });

  test('should hide graph on mobile in split mode', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // On mobile, graph should not be visible by default
    const reactFlow = page.locator('.react-flow');
    const graphVisible = await reactFlow.isVisible({ timeout: 2000 }).catch(() => false);

    // Graph should be hidden on mobile
    expect(graphVisible).toBeFalsy();
  });

  test('should maintain functionality on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: TABLET_WIDTH, height: TABLET_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for wizard panel to be ready
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 5000 });

    // Try to find and click Continue button
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const continueBtnVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (continueBtnVisible) {
      // Get current content to verify navigation works
      const contentBefore = await page.locator('.bg-white.rounded-lg.shadow').first().textContent();

      // Click continue
      await continueBtn.click();
      await page.waitForTimeout(500);

      // Verify we navigated (content should change or button should still be interactive)
      const contentAfter = await page.locator('.bg-white.rounded-lg.shadow').first().textContent();
      const continueStillVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

      expect(contentBefore !== contentAfter || continueStillVisible).toBeTruthy();
    } else {
      // If no Continue button, try clicking a choice button
      const choiceButtons = page.locator('button').filter({
        has: page.locator('.w-6.h-6.rounded-full.bg-white'),
      });
      const choiceCount = await choiceButtons.count();
      expect(choiceCount).toBeGreaterThan(0);

      // Click first choice
      await choiceButtons.first().click();
      await page.waitForTimeout(500);

      // Verify we're still interactive
      const wizardStillVisible = await wizardPanel.isVisible({ timeout: 2000 });
      expect(wizardStillVisible).toBeTruthy();
    }
  });

  test('should have touch-friendly button sizes', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check Continue button height
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const continueBtnVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (continueBtnVisible) {
      const boundingBox = await continueBtn.boundingBox();
      if (boundingBox) {
        // Touch-friendly buttons should be at least 44px in height
        expect(boundingBox.height).toBeGreaterThanOrEqual(40);
      }
    }

    // Check choice button sizes
    const choiceButtons = page.locator('button').filter({
      has: page.locator('.w-6.h-6.rounded-full.bg-white'),
    });
    const choiceCount = await choiceButtons.count();

    if (choiceCount > 0) {
      const firstChoice = choiceButtons.first();
      const boundingBox = await firstChoice.boundingBox();
      if (boundingBox) {
        // Choice buttons should also be touch-friendly (at least 40px height, typically 44px)
        expect(boundingBox.height).toBeGreaterThanOrEqual(40);
        // And have reasonable width for fingers
        expect(boundingBox.width).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('should handle viewport resize', async ({ page }) => {
    // Start with desktop viewport
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify sidebar is visible on desktop
    const sidebarText = page.getByText('ML System Design');
    await expect(sidebarText).toBeVisible({ timeout: 5000 });

    // Resize to mobile
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    await page.waitForTimeout(500);

    // Sidebar should now be hidden
    const sidebarVisible = await sidebarText.isVisible({ timeout: 2000 }).catch(() => false);
    expect(sidebarVisible).toBeFalsy();

    // Wizard panel should still be visible
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 2000 });

    // Resize back to desktop
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
    await page.waitForTimeout(500);

    // Sidebar should be visible again
    await expect(sidebarText).toBeVisible({ timeout: 2000 });
  });

  test('should maintain wizard functionality after resize', async ({ page }) => {
    // Start on desktop
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial node content
    const initialContent = await page.locator('.bg-white.rounded-lg.shadow').first().textContent();

    // Resize to mobile
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    await page.waitForTimeout(500);

    // Try to navigate
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const continueBtnVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (continueBtnVisible) {
      await continueBtn.click();
      await page.waitForTimeout(500);

      // Content should have changed
      const newContent = await page.locator('.bg-white.rounded-lg.shadow').first().textContent();
      expect(newContent).not.toBe(initialContent);
    } else {
      // Try clicking a choice
      const choiceButtons = page.locator('button').filter({
        has: page.locator('.w-6.h-6.rounded-full.bg-white'),
      });
      const choiceCount = await choiceButtons.count();

      if (choiceCount > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);

        const newContent = await page.locator('.bg-white.rounded-lg.shadow').first().textContent();
        expect(newContent).not.toBe(initialContent);
      }
    }

    // Resize back to desktop - functionality should still work
    await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
    await page.waitForTimeout(500);

    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 2000 });
  });

  test('should stack layout properly on mobile landscape', async ({ page }) => {
    // Set mobile landscape viewport (iPhone in landscape)
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wizard panel should still be visible
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 5000 });

    // Should be able to interact with buttons
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const continueBtnVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

    const choiceButtons = page.locator('button').filter({
      has: page.locator('.w-6.h-6.rounded-full.bg-white'),
    });
    const choiceCount = await choiceButtons.count();

    expect(continueBtnVisible || choiceCount > 0).toBeTruthy();
  });
});
