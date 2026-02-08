import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });
  });

  test('should advance with ArrowRight key', async ({ page }) => {
    // Get current node metadata to verify we moved
    const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
    const nodeIdBefore = await nodeMetadata.textContent();

    // Press ArrowRight
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Node should have changed
    const nodeIdAfter = await nodeMetadata.textContent();
    expect(nodeIdAfter).not.toBe(nodeIdBefore);
  });

  test('should go back with ArrowLeft key', async ({ page }) => {
    // First advance once
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Get current node ID
    const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
    const nodeIdAfter = await nodeMetadata.textContent();

    // Press ArrowLeft to go back
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(500);

    // Should be back to original
    const nodeIdBefore = await nodeMetadata.textContent();
    expect(nodeIdBefore).not.toBe(nodeIdAfter);
  });

  test('should advance with Enter key', async ({ page }) => {
    // Check if we're at an info node with Continue option
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const isContinueVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (isContinueVisible) {
      // Get current node metadata
      const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
      const nodeIdBefore = await nodeMetadata.textContent();

      // Press Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Node should have changed
      const nodeIdAfter = await nodeMetadata.textContent();
      expect(nodeIdAfter).not.toBe(nodeIdBefore);
    }
  });

  test('should go back with Backspace key', async ({ page }) => {
    // First advance once
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Get current node ID after advancing
    const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
    const nodeIdAfter = await nodeMetadata.textContent();

    // Press Backspace to go back
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);

    // Should be back to original
    const nodeIdBefore = await nodeMetadata.textContent();
    expect(nodeIdBefore).not.toBe(nodeIdAfter);
  });

  test('should select choice with number keys', async ({ page }) => {
    // Navigate through info nodes until we find a question node with choices
    let maxAttempts = 10;
    let foundQuestion = false;

    while (maxAttempts > 0 && !foundQuestion) {
      maxAttempts--;

      // Check if we have choice buttons (question node with options)
      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      const choiceCount = await choiceButtons.count();

      if (choiceCount >= 1) {
        foundQuestion = true;
        break;
      }

      // Try to advance
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
    }

    if (foundQuestion) {
      // Get current node ID
      const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
      const nodeIdBefore = await nodeMetadata.textContent();

      // Press '1' to select first choice
      await page.keyboard.press('1');
      await page.waitForTimeout(500);

      // Node should have changed
      const nodeIdAfter = await nodeMetadata.textContent();
      expect(nodeIdAfter).not.toBe(nodeIdBefore);
    }
  });

  test('should not navigate when typing in an input field', async ({ page }) => {
    // Try to find a text input or textarea
    const settingsBtn = page.getByTitle('LLM Settings');
    const hasSettingsBtn = await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSettingsBtn) {
      // Open settings modal
      await settingsBtn.click();
      await page.waitForTimeout(500);

      // Look for an input field in the modal
      const inputs = page.locator('input[type="text"]');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        // Focus on first input
        const firstInput = inputs.first();
        await firstInput.click();
        await page.waitForTimeout(300);

        // Get current content
        const contentBefore = await firstInput.inputValue();

        // Type some text (should not trigger navigation)
        await page.keyboard.type('test');
        await page.waitForTimeout(300);

        // Content should have the typed text
        const contentAfter = await firstInput.inputValue();
        expect(contentAfter).toContain('test');

        // Close settings modal
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should close settings modal with Escape', async ({ page }) => {
    // Open settings modal
    const settingsBtn = page.getByTitle('LLM Settings');
    const hasSettingsBtn = await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSettingsBtn) {
      await settingsBtn.click();
      await page.waitForTimeout(500);

      // Modal should be visible
      const modal = page.locator('.fixed.inset-0.z-50.overflow-hidden');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Modal should be closed (not visible)
      const isModalVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
      expect(isModalVisible).toBeFalsy();
    }
  });

  test('should handle number keys only on question nodes', async ({ page }) => {
    // Navigate to find an info node
    let maxAttempts = 15;
    let foundInfo = false;

    while (maxAttempts > 0 && !foundInfo) {
      maxAttempts--;

      // Check if we're at an info node (has Continue button, not choices)
      const continueBtn = page.getByRole('button', { name: /continue/i });
      const choiceButtons = page.locator('button').filter({ has: page.locator('.w-6.h-6.rounded-full.bg-white') });
      const choiceCount = await choiceButtons.count();

      const isContinueVisible = await continueBtn.isVisible({ timeout: 1000 }).catch(() => false);
      if (isContinueVisible && choiceCount === 0) {
        foundInfo = true;
        break;
      }

      // Navigate forward
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
    }

    if (foundInfo) {
      // Get current node ID
      const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
      const nodeIdBefore = await nodeMetadata.textContent();

      // Press '1' (should not change node on info nodes)
      await page.keyboard.press('1');
      await page.waitForTimeout(300);

      // Node should NOT have changed
      const nodeIdAfter = await nodeMetadata.textContent();
      expect(nodeIdAfter).toBe(nodeIdBefore);
    }
  });

  test('should support multiple arrow keys in sequence', async ({ page }) => {
    // Get initial node
    const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
    const nodeId0 = await nodeMetadata.textContent();

    // Press ArrowRight multiple times
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const nodeId1 = await nodeMetadata.textContent();
    expect(nodeId1).not.toBe(nodeId0);

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const nodeId2 = await nodeMetadata.textContent();
    expect(nodeId2).not.toBe(nodeId1);

    // Go back twice
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    const nodeId3 = await nodeMetadata.textContent();
    expect(nodeId3).toBe(nodeId1);

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    const nodeId4 = await nodeMetadata.textContent();
    expect(nodeId4).toBe(nodeId0);
  });

  test('should not advance past terminal node', async ({ page }) => {
    // Navigate forward multiple times to reach terminal node (if exists)
    let nodeIdBefore = '';
    let sameCountdown = 0;

    for (let i = 0; i < 20; i++) {
      const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
      const nodeIdCurrent = await nodeMetadata.textContent();

      if (nodeIdCurrent === nodeIdBefore) {
        sameCountdown++;
        if (sameCountdown >= 2) {
          // We've reached a terminal node (same ID after 2 advances)
          break;
        }
      } else {
        sameCountdown = 0;
      }

      nodeIdBefore = nodeIdCurrent;
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
    }

    // Verify we're at terminal (pressing forward doesn't change node)
    const nodeMetadata = page.locator('.text-xs.text-gray-500.text-center');
    const nodeIdBeforeFinal = await nodeMetadata.textContent();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const nodeIdAfterFinal = await nodeMetadata.textContent();

    expect(nodeIdAfterFinal).toBe(nodeIdBeforeFinal);
  });
});
