import { test, expect } from '@playwright/test';

test.describe('Multi-Select Node', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for wizard panel
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });
  });

  test('should render multi-select card when navigating to multi_select node', async ({ page }) => {
    // Flight Delay problem starts with info node, then multi_select
    // Click Continue to advance past the first info node
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    // Should see the multi-select card with dimension groups
    // Look for the "Select one option for each dimension" text
    const dimensionHint = page.getByText(/select one option for each dimension/i);
    await expect(dimensionHint).toBeVisible({ timeout: 5000 });
  });

  test('should show dimension groups with selectable options', async ({ page }) => {
    // Navigate to multi-select node
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    // Wait for multi-select to appear
    await expect(page.getByText(/select one option for each dimension/i)).toBeVisible({ timeout: 5000 });

    // Should see dimension group headers
    await expect(page.getByText('System Requirements')).toBeVisible();
    await expect(page.getByText('Business Constraints')).toBeVisible();

    // Should see dimension labels
    await expect(page.getByText('Prediction Horizon')).toBeVisible();
    await expect(page.getByText('Latency Requirement')).toBeVisible();
    await expect(page.getByText('Primary User')).toBeVisible();
  });

  test('should disable Continue button until all dimensions are selected', async ({ page }) => {
    // Navigate to multi-select node
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/select one option for each dimension/i)).toBeVisible({ timeout: 5000 });

    // Continue button should be disabled initially
    const multiContinueBtn = page.getByRole('button', { name: /continue/i });
    await expect(multiContinueBtn).toBeDisabled();
  });

  test('should enable Continue button after all dimensions are selected', async ({ page }) => {
    // Navigate to multi-select node
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/select one option for each dimension/i)).toBeVisible({ timeout: 5000 });

    // Select one option for each dimension by clicking option buttons
    // Flight-delay has 4 dimensions: prediction_horizon, latency, primary_user, delay_definition
    const shortTerm = page.getByRole('button', { name: 'Short-term (2h before)' });
    const realTime = page.getByRole('button', { name: 'Real-time (<100ms)' });
    const passengers = page.getByRole('button', { name: 'Passengers' });
    const binary = page.getByRole('button', { name: /binary/i });

    if (await shortTerm.isVisible({ timeout: 2000 }).catch(() => false)) {
      await shortTerm.click();
    }
    if (await realTime.isVisible({ timeout: 2000 }).catch(() => false)) {
      await realTime.click();
    }
    if (await passengers.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passengers.click();
    }
    if (await binary.isVisible({ timeout: 2000 }).catch(() => false)) {
      await binary.click();
    }

    await page.waitForTimeout(300);

    // Continue button should now be enabled
    const multiContinueBtn = page.getByRole('button', { name: /continue/i });
    await expect(multiContinueBtn).toBeEnabled({ timeout: 3000 });
  });

  test('should advance to next node after submitting multi-select', async ({ page }) => {
    // Navigate to multi-select node
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/select one option for each dimension/i)).toBeVisible({ timeout: 5000 });

    // Get node ID before
    const nodeIdBefore = await page.locator('.text-xs.text-gray-500.text-center').textContent();

    // Select all dimensions
    const shortTerm = page.getByRole('button', { name: 'Short-term (2h before)' });
    const realTime = page.getByRole('button', { name: 'Real-time (<100ms)' });
    const passengers = page.getByRole('button', { name: 'Passengers' });
    const binary = page.getByRole('button', { name: /binary/i });

    if (await shortTerm.isVisible({ timeout: 2000 }).catch(() => false)) await shortTerm.click();
    if (await realTime.isVisible({ timeout: 2000 }).catch(() => false)) await realTime.click();
    if (await passengers.isVisible({ timeout: 2000 }).catch(() => false)) await passengers.click();
    if (await binary.isVisible({ timeout: 2000 }).catch(() => false)) await binary.click();

    await page.waitForTimeout(300);

    // Click Continue
    const multiContinueBtn = page.getByRole('button', { name: /continue/i });
    await multiContinueBtn.click();
    await page.waitForTimeout(500);

    // Node should have changed
    const nodeIdAfter = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    expect(nodeIdAfter).not.toBe(nodeIdBefore);
  });

  test('should show Suggest More Questions button', async ({ page }) => {
    // Navigate to multi-select node
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page.getByText(/select one option for each dimension/i)).toBeVisible({ timeout: 5000 });

    // Should see the "Suggest More Questions" button
    await expect(page.getByText('Suggest More Questions')).toBeVisible();
  });

  test('should complete full path through tree with multi-select node', async ({ page }) => {
    // Navigate through all nodes including multi-select
    let maxSteps = 50;
    let reachedTerminal = false;

    while (maxSteps > 0) {
      maxSteps--;

      // Check for terminal
      const startOverBtn = page.getByRole('button', { name: /start over/i });
      if (await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        reachedTerminal = true;
        break;
      }

      // Check for multi-select card
      const dimensionHint = page.getByText(/select one option for each dimension/i);
      if (await dimensionHint.isVisible({ timeout: 500 }).catch(() => false)) {
        // Select all dimensions by clicking the first option in each dimension selector
        const dimensionBlocks = page.locator('.rounded-lg.border.p-4:not(.border-dashed)');
        const count = await dimensionBlocks.count();

        for (let i = 0; i < count; i++) {
          const firstOption = dimensionBlocks.nth(i).locator('button').first();
          if (await firstOption.isVisible({ timeout: 500 }).catch(() => false)) {
            await firstOption.click();
            await page.waitForTimeout(100);
          }
        }

        await page.waitForTimeout(300);

        const multiContinueBtn = page.getByRole('button', { name: /continue/i });
        if (await multiContinueBtn.isEnabled({ timeout: 1000 })) {
          await multiContinueBtn.click();
          await page.waitForTimeout(500);
        }
        continue;
      }

      // Check for Continue button (info node)
      const continueBtn = page.getByRole('button', { name: /continue/i });
      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
        continue;
      }

      // Check for choice buttons (question node)
      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      const choiceCount = await choiceButtons.count();
      if (choiceCount > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        continue;
      }

      break;
    }

    expect(reachedTerminal).toBeTruthy();
  });
});
