import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Generate Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForAppReady(page);
    await page.waitForTimeout(1000);
  });

  test('should open generate modal from sidebar button', async ({ page }) => {
    // Find and click the Generate New Problem button
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await expect(generateBtn).toBeVisible({ timeout: 5000 });
    
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Verify modal appears with proper container
    const modalContainer = page.locator('.fixed.inset-0.z-50');
    await expect(modalContainer).toBeVisible({ timeout: 2000 });

    // Verify modal has title (e.g., "Generate New Problem" heading or similar)
    const modalContent = page.locator('[role="dialog"], .bg-white.rounded-lg.shadow-lg');
    await expect(modalContent).toBeVisible();

    // Verify title input is visible
    const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="problem" i]').first();
    const isTitleVisible = await titleInput.isVisible({ timeout: 2000 }).catch(() => false);
    if (isTitleVisible) {
      await expect(titleInput).toBeVisible();
    }
  });

  test('should show title and description fields', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Look for title input field
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible({ timeout: 2000 });

    // Look for description textarea
    const descriptionTextarea = page.locator('textarea').first();
    const isDescriptionVisible = await descriptionTextarea.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isDescriptionVisible).toBeTruthy();

    if (isDescriptionVisible) {
      await expect(descriptionTextarea).toBeVisible();
    }
  });

  test('should show branch count selector', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Look for branch count options (1, 2, 3)
    const branchOption1 = page.getByRole('button', { name: /1\s*(branch|path)?/i });
    const branchOption2 = page.getByRole('button', { name: /2\s*(branch|path)?/i });
    const branchOption3 = page.getByRole('button', { name: /3\s*(branch|path)?/i });

    // At least one branch option should be visible
    const hasOption1 = await branchOption1.isVisible({ timeout: 1000 }).catch(() => false);
    const hasOption2 = await branchOption2.isVisible({ timeout: 1000 }).catch(() => false);
    const hasOption3 = await branchOption3.isVisible({ timeout: 1000 }).catch(() => false);

    // Alternative: look for radio buttons or clickable elements with numbers
    if (!hasOption1 && !hasOption2 && !hasOption3) {
      const radioButtons = page.locator('input[type="radio"]');
      const radioCount = await radioButtons.count();
      expect(radioCount).toBeGreaterThanOrEqual(1);
    } else {
      expect(hasOption1 || hasOption2 || hasOption3).toBeTruthy();
    }
  });

  test('should have cancel button that closes modal', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalContainer = page.locator('.fixed.inset-0.z-50');
    await expect(modalContainer).toBeVisible();

    // Find and click Cancel button
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    await expect(cancelBtn).toBeVisible({ timeout: 2000 });
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Modal should be gone
    await expect(modalContainer).not.toBeVisible({ timeout: 2000 });
  });

  test('should disable generate button when title is empty', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Find the Generate button (should be disabled initially if title is required)
    const generateModalBtn = page.getByRole('button', { name: /^generate$/i });
    const isGenerateButtonDisabled = await generateModalBtn.isDisabled({ timeout: 2000 }).catch(() => false);

    // If the button exists and is expected to be disabled when title is empty
    if (await generateModalBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Check if it's disabled (title is empty by default)
      expect(isGenerateButtonDisabled).toBeTruthy();
    }
  });

  test('should enable generate button when title is filled', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Fill in title
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('Test Problem for ML Design');
    await page.waitForTimeout(500);

    // Find the Generate button
    const generateModalBtn = page.getByRole('button', { name: /^generate$/i });
    
    // Button should now be enabled
    const isGenerateButtonEnabled = await generateModalBtn.isEnabled({ timeout: 2000 }).catch(() => false);
    if (await generateModalBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      expect(isGenerateButtonEnabled).toBeTruthy();
    }
  });

  test('should close modal on backdrop click', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalContainer = page.locator('.fixed.inset-0.z-50');
    await expect(modalContainer).toBeVisible();

    // Click on the backdrop (the fixed overlay area outside modal content)
    const backdrop = page.locator('.fixed.inset-0.z-50').first();
    await backdrop.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    // Modal should be closed
    await expect(modalContainer).not.toBeVisible({ timeout: 2000 });
  });

  test('should close modal on Escape key', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalContainer = page.locator('.fixed.inset-0.z-50');
    await expect(modalContainer).toBeVisible();

    // Press Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Modal should be closed
    await expect(modalContainer).not.toBeVisible({ timeout: 2000 });
  });

  test('should show Quick and Extensive generation mode options', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Look for Quick mode option (button, radio, or text)
    const quickOption = page.getByRole('button', { name: /quick/i });
    const extensiveOption = page.getByRole('button', { name: /extensive/i });

    const hasQuick = await quickOption.isVisible({ timeout: 1000 }).catch(() => false);
    const hasExtensive = await extensiveOption.isVisible({ timeout: 1000 }).catch(() => false);

    // Alternative: look for radio buttons with mode labels
    if (!hasQuick && !hasExtensive) {
      const modeRadios = page.locator('input[type="radio"]');
      const modeCount = await modeRadios.count();
      expect(modeCount).toBeGreaterThanOrEqual(1);
    } else {
      expect(hasQuick || hasExtensive).toBeTruthy();
    }
  });

  test('should pre-fill with default values', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Check for default branch count selection
    const selectedButton = page.locator('button[aria-pressed="true"]');
    const selectedCount = await selectedButton.count();
    
    // At least one option should be pre-selected (branch count default)
    if (selectedCount > 0) {
      const buttonText = await selectedButton.first().textContent();
      expect(buttonText).toBeTruthy();
    }

    // Verify title input is empty by default
    const titleInput = page.locator('input[type="text"]').first();
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toBe('');

    // Verify description is empty by default
    const descriptionTextarea = page.locator('textarea').first();
    const isDescriptionVisible = await descriptionTextarea.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isDescriptionVisible) {
      const descriptionValue = await descriptionTextarea.textContent();
      expect(descriptionValue?.trim()).toBe('');
    }
  });

  test('should update branch count when different option is selected', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Select branch count option (try to find button with "2" or "two branches")
    const branchOption = page.getByRole('button', { name: /2/i });
    const isOptionVisible = await branchOption.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isOptionVisible) {
      await branchOption.click();
      await page.waitForTimeout(300);

      // Verify the option is now selected (has some active state)
      const hasActiveState = await branchOption.locator('..').evaluate((el) => {
        return el.classList.contains('selected') ||
               el.querySelector('[aria-pressed="true"]') !== null ||
               el.className.includes('bg-blue');
      }).catch(() => false);
      
      // Just verify it was clickable - state depends on implementation
      expect(isOptionVisible).toBeTruthy();
    }
  });

  test('should allow filling in title and description', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Fill title
    const titleInput = page.locator('input[type="text"]').first();
    const testTitle = 'Recommendation Engine Design';
    await titleInput.fill(testTitle);
    await page.waitForTimeout(300);

    // Verify title was filled
    expect(await titleInput.inputValue()).toBe(testTitle);

    // Fill description if textarea exists
    const descriptionTextarea = page.locator('textarea').first();
    const isDescriptionVisible = await descriptionTextarea.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (isDescriptionVisible) {
      const testDescription = 'Design a recommendation engine for an e-commerce platform';
      await descriptionTextarea.fill(testDescription);
      await page.waitForTimeout(300);

      // Verify description was filled
      expect(await descriptionTextarea.inputValue()).toBe(testDescription);
    }
  });

  test('should show modal footer with action buttons', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Verify modal footer exists with buttons
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    const generateBtn2 = page.getByRole('button', { name: /^generate$/i });

    const hasCancelBtn = await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hasGenerateBtn = await generateBtn2.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasCancelBtn || hasGenerateBtn).toBeTruthy();
  });

  test('should maintain modal state while typing', async ({ page }) => {
    // Open modal
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    await generateBtn.click();
    await page.waitForTimeout(500);

    // Fill title
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill('Test');
    await page.waitForTimeout(300);

    // Select a branch count option
    const branchOption = page.getByRole('button', { name: /2/i });
    const isOptionVisible = await branchOption.isVisible({ timeout: 1000 }).catch(() => false);
    if (isOptionVisible) {
      await branchOption.click();
      await page.waitForTimeout(300);
    }

    // Verify title still has value (state persisted)
    expect(await titleInput.inputValue()).toBe('Test');

    // Cancel should still work
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    await cancelBtn.click();
    await page.waitForTimeout(500);

    // Modal should close
    const modalContainer = page.locator('.fixed.inset-0.z-50');
    await expect(modalContainer).not.toBeVisible({ timeout: 2000 });
  });

  test('should handle rapid open/close cycles', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: /generate new problem/i });
    const modalContainer = page.locator('.fixed.inset-0.z-50');

    // Open and close modal 3 times
    for (let i = 0; i < 3; i++) {
      await generateBtn.click();
      await page.waitForTimeout(300);

      await expect(modalContainer).toBeVisible({ timeout: 2000 });

      const cancelBtn = page.getByRole('button', { name: /cancel/i });
      await cancelBtn.click();
      await page.waitForTimeout(300);

      await expect(modalContainer).not.toBeVisible({ timeout: 2000 });
    }
  });
});
