import { test, expect } from '@playwright/test';

test.describe('Interview Modes', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('interviewMode'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Wait for wizard panel
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });
  });

  test('should show mode badge in top bar', async ({ page }) => {
    // Mode badge should be visible with "Designer" (default)
    const modeBadge = page.getByTitle('Change Interview Mode');
    await expect(modeBadge).toBeVisible({ timeout: 5000 });
    await expect(modeBadge).toHaveText(/designer/i);
  });

  test('should open mode selector when clicking badge', async ({ page }) => {
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();

    // Mode selector modal should appear
    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    // Should show all three mode options (use role to avoid strict mode violations)
    await expect(page.getByRole('button', { name: /Mock Interview/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tutor Guided learning/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Designer Full access/ })).toBeVisible();
  });

  test('should show current mode indicator in selector', async ({ page }) => {
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();

    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    // Default mode is "Designer", should show "Current mode" label
    await expect(page.getByText('Current mode')).toBeVisible();
  });

  test('should switch to Mock Interview mode', async ({ page }) => {
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();

    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    // Click Mock Interview option
    const mockBtn = page.locator('button').filter({ hasText: 'Mock Interview' });
    await mockBtn.click();

    await page.waitForTimeout(500);

    // Badge should now show "Mock"
    await expect(modeBadge).toHaveText(/mock/i);
  });

  test('should hide graph in Mock Interview mode', async ({ page }) => {
    // Switch to Mock Interview mode
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();
    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    const mockBtn = page.locator('button').filter({ hasText: 'Mock Interview' });
    await mockBtn.click();
    await page.waitForTimeout(500);

    // Graph panel (ReactFlow) should not be visible in mock mode
    const reactFlowPane = page.locator('.react-flow');
    const graphVisible = await reactFlowPane.isVisible({ timeout: 2000 }).catch(() => false);
    expect(graphVisible).toBeFalsy();

    // Wizard panel should still be visible
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible();
  });

  test('should show graph in Designer mode', async ({ page }) => {
    // Default mode is Designer, graph should be visible
    const reactFlowPane = page.locator('.react-flow');
    await expect(reactFlowPane).toBeVisible({ timeout: 10000 });
  });

  test('should switch to Tutor mode', async ({ page }) => {
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();
    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    const tutorBtn = page.locator('button').filter({ hasText: /^Tutor/ });
    await tutorBtn.click();
    await page.waitForTimeout(500);

    // Badge should show "Tutor"
    await expect(modeBadge).toHaveText(/tutor/i);

    // Graph should still be visible in Tutor mode
    const reactFlowPane = page.locator('.react-flow');
    await expect(reactFlowPane).toBeVisible({ timeout: 5000 });
  });

  test('should persist mode across page reload', async ({ page }) => {
    // Switch to Mock Interview
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();
    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    const mockBtn = page.locator('button').filter({ hasText: 'Mock Interview' });
    await mockBtn.click();
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Badge should still show "Mock"
    const reloadedBadge = page.getByTitle('Change Interview Mode');
    await expect(reloadedBadge).toHaveText(/mock/i, { timeout: 5000 });
  });

  test('should close mode selector on backdrop click', async ({ page }) => {
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();

    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    // Click backdrop (the overlay behind the modal)
    const backdrop = page.locator('.fixed.inset-0.z-50');
    await backdrop.click({ position: { x: 10, y: 10 } });

    await page.waitForTimeout(500);

    // Modal should be closed
    await expect(page.getByText('Choose Interview Mode')).not.toBeVisible();
  });

  test('should show mode descriptions in selector', async ({ page }) => {
    const modeBadge = page.getByTitle('Change Interview Mode');
    await modeBadge.click();

    await expect(page.getByText('Choose Interview Mode')).toBeVisible({ timeout: 5000 });

    // Each mode should have a description
    await expect(page.getByText(/realistic interview simulation/i)).toBeVisible();
    await expect(page.getByText(/guided learning/i)).toBeVisible();
    await expect(page.getByText(/full access to all tools/i)).toBeVisible();
  });
});
