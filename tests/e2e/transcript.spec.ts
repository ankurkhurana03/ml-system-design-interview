import { test, expect } from '@playwright/test';

test.describe('Transcript Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should download transcript after completing a path', async ({ page }) => {
    // Navigate to a terminal node (fast path - click first choice every time)
    let maxSteps = 50;
    let reachedTerminal = false;

    while (maxSteps > 0) {
      maxSteps--;

      // Check for Download Transcript button (only at terminal)
      const downloadBtn = page.getByRole('button', { name: /download transcript/i });
      if (await downloadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
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

    // Should have reached terminal node
    expect(reachedTerminal).toBeTruthy();

    // Wait for download button to be visible
    const downloadBtn = page.getByRole('button', { name: /download transcript/i });
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    await downloadBtn.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify it's a .md file
    expect(download.suggestedFilename()).toMatch(/\.md$/);
    expect(download.suggestedFilename()).toContain('transcript');
  });

  test('should show download button only at terminal node', async ({ page }) => {
    // At the start, download button should not be visible in the wizard
    const wizardDownloadBtn = page.locator('.bg-white.rounded-lg.shadow-lg').getByRole('button', { name: /download transcript/i });
    await expect(wizardDownloadBtn).not.toBeVisible();

    // Navigate to terminal
    let maxSteps = 50;

    while (maxSteps > 0) {
      maxSteps--;

      if (await wizardDownloadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      if (await choiceButtons.count() > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        continue;
      }

      break;
    }

    // Now download button should be visible
    await expect(wizardDownloadBtn).toBeVisible({ timeout: 5000 });
  });

  test('should include problem title in filename', async ({ page }) => {
    // Navigate to terminal
    let maxSteps = 50;

    while (maxSteps > 0) {
      maxSteps--;

      const downloadBtn = page.getByRole('button', { name: /download transcript/i });
      if (await downloadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      if (await choiceButtons.count() > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        continue;
      }

      break;
    }

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download transcript/i }).click();
    const download = await downloadPromise;

    // Filename should contain problem ID or reference
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/flight.*delay/i);
  });

  test('should show success toast after download', async ({ page }) => {
    // Navigate to terminal
    let maxSteps = 50;

    while (maxSteps > 0) {
      maxSteps--;

      const downloadBtn = page.getByRole('button', { name: /download transcript/i });
      if (await downloadBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      if (await choiceButtons.count() > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        continue;
      }

      break;
    }

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download transcript/i }).click();
    await downloadPromise;

    // Should show "Downloaded!" toast
    await expect(page.getByText(/downloaded/i)).toBeVisible({ timeout: 2000 });
  });

  test('should have Start Over button at terminal node', async ({ page }) => {
    // Navigate to terminal
    let maxSteps = 50;

    while (maxSteps > 0) {
      maxSteps--;

      const startOverBtn = page.getByRole('button', { name: /start over/i });
      if (await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      if (await choiceButtons.count() > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        continue;
      }

      break;
    }

    // Start Over button should be visible
    await expect(page.getByRole('button', { name: /start over/i })).toBeVisible({ timeout: 5000 });
  });

  test('should reset navigation when clicking Start Over', async ({ page }) => {
    // Navigate to terminal
    let maxSteps = 50;

    while (maxSteps > 0) {
      maxSteps--;

      const startOverBtn = page.getByRole('button', { name: /start over/i });
      if (await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }

      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      if (await choiceButtons.count() > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        continue;
      }

      break;
    }

    // Click Start Over
    await page.getByRole('button', { name: /start over/i }).click();
    await page.waitForTimeout(1000);

    // Should be back at the beginning
    // Back button should not be visible (or should be disabled)
    const backBtn = page.getByRole('button', { name: /back/i });
    const hasBackBtn = await backBtn.isVisible({ timeout: 1000 }).catch(() => false);

    // If there's no back button, we're at the start
    // Or check that we have a Continue button
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const hasContinue = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

    expect(!hasBackBtn || hasContinue).toBeTruthy();
  });
});
