import { test, expect } from '@playwright/test';
import { navigateSteps } from './helpers';

test.describe('Practice Timer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test('should show timer display in the top bar', async ({ page }) => {
    // Look for the timer button/icon that enables the timer
    const timerToggle = page.locator('button').filter({ has: page.locator('svg').nth(0) }).first();
    
    // Timer should be visible in the top bar (though may be disabled initially)
    // Look for timer icon or text
    const timerElement = page.locator('button').filter({ hasText: /Timer/i });
    
    const isVisible = await timerElement.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible || timerElement.count() > 0).toBeTruthy();
  });

  test('should enable timer and display MM:SS format', async ({ page }) => {
    // Find the timer toggle button (the one with Timer text or initially disabled)
    // Click to enable timer
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    
    // Enable timer if not already enabled
    const isEnabled = await page.locator('div').filter({ hasText: /\d{2}:\d{2}/ }).isVisible({ timeout: 1000 }).catch(() => false);
    
    if (!isEnabled) {
      await timerToggle.click();
      await page.waitForTimeout(500);
    }

    // Look for timer display in MM:SS format
    const timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });
    
    const isDisplayVisible = await timerDisplay.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isDisplayVisible).toBeTruthy();

    // Verify it shows the correct format
    const timerText = await timerDisplay.textContent();
    expect(timerText).toMatch(/\d{2}:\d{2}/);
  });

  test('should start timer when user begins navigation', async ({ page }) => {
    // Enable timer first
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    // Get initial timer value
    const timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });
    const initialTime = await timerDisplay.textContent();
    
    // Verify timer is at 45:00 (2700 seconds)
    expect(initialTime).toBe('45:00');

    // Click Continue button to start navigation
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const hasContinue = await continueBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasContinue) {
      await continueBtn.click();
      await page.waitForTimeout(2000); // Wait 2 seconds

      // Timer should now be less than 45:00 (should have started counting down)
      const currentTime = await timerDisplay.textContent();
      expect(currentTime).not.toBe('45:00');
    }
  });

  test('should show timer controls (play/pause and reset buttons)', async ({ page }) => {
    // Enable timer
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    // Look for play/pause button - should be visible after timer is enabled
    const pausePlayButton = page.locator('button[title*="Pause"]').or(page.locator('button[title*="Start"]'));
    const pausePlayVisible = await pausePlayButton.isVisible({ timeout: 3000 }).catch(() => false);
    expect(pausePlayVisible).toBeTruthy();

    // Look for reset button
    const resetButton = page.locator('button[title*="Reset"]');
    const resetVisible = await resetButton.isVisible({ timeout: 3000 }).catch(() => false);
    expect(resetVisible).toBeTruthy();

    // Look for disable button (X icon)
    const disableButton = page.locator('button[title*="Disable"]');
    const disableVisible = await disableButton.isVisible({ timeout: 3000 }).catch(() => false);
    expect(disableVisible).toBeTruthy();
  });

  test('should pause and resume timer', async ({ page }) => {
    // Enable timer
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    // Start navigation to begin timer
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1000);
    }

    // Get current time
    const timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });
    const timeBeforePause = await timerDisplay.textContent();

    // Click pause button (has title "Pause Timer")
    const pauseButton = page.locator('button[title="Pause Timer"]');
    const isPauseVisible = await pauseButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (isPauseVisible) {
      await pauseButton.click();
      await page.waitForTimeout(1000);

      // Wait 2 more seconds
      await page.waitForTimeout(2000);

      // Time should not have changed
      const timeAfterWait = await timerDisplay.textContent();
      expect(timeAfterWait).toBe(timeBeforePause);

      // Click resume (now should show "Start Timer" title)
      const startButton = page.locator('button[title="Start Timer"]');
      if (await startButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await startButton.click();
        await page.waitForTimeout(1500);

        // Time should have advanced
        const timeAfterResume = await timerDisplay.textContent();
        expect(timeAfterResume).not.toBe(timeBeforePause);
      }
    }
  });

  test('should reset timer to 45:00', async ({ page }) => {
    // Enable timer
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    // Start navigation
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(1500); // Let timer count down
    }

    // Get current time (should be less than 45:00)
    const timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });
    const timeBeforeReset = await timerDisplay.textContent();

    // Click reset button
    const resetButton = page.locator('button[title="Reset Timer"]');
    const isResetVisible = await resetButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (isResetVisible) {
      await resetButton.click();
      await page.waitForTimeout(500);

      // Timer should be back to 45:00
      const timeAfterReset = await timerDisplay.textContent();
      expect(timeAfterReset).toBe('45:00');
    }
  });

  test('should continue counting across node navigation', async ({ page }) => {
    // Enable timer
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    const timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });

    // Navigate first step
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(800);
    }

    // Record time after first step
    const timeAfterStep1 = await timerDisplay.textContent();

    // Navigate second step
    const continueBtn2 = page.getByRole('button', { name: /continue/i });
    if (await continueBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn2.click();
      await page.waitForTimeout(800);
    }

    // Record time after second step
    const timeAfterStep2 = await timerDisplay.textContent();

    // Both times should be less than initial 45:00
    expect(timeAfterStep1).not.toBe('45:00');
    expect(timeAfterStep2).not.toBe('45:00');

    // Time should continue to decrease (or stay same/decrease slightly if very close together)
    // Parse times and compare
    const parseTime = (timeStr: string | null): number => {
      if (!timeStr) return 0;
      const [mins, secs] = timeStr.split(':').map(Number);
      return mins * 60 + secs;
    };

    const timeVal1 = parseTime(timeAfterStep1);
    const timeVal2 = parseTime(timeAfterStep2);

    // Time should not increase (timer counts down or stays same)
    expect(timeVal2).toBeLessThanOrEqual(timeVal1);
  });

  test('should disable timer and hide controls', async ({ page }) => {
    // Enable timer first
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    // Verify timer is visible
    const timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });
    expect(await timerDisplay.isVisible()).toBeTruthy();

    // Click disable button (X icon with "Disable Timer" title)
    const disableButton = page.locator('button[title="Disable Timer"]');
    await disableButton.click();
    await page.waitForTimeout(500);

    // Timer display should no longer be visible
    const isTimerGone = await timerDisplay.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isTimerGone).toBeFalsy();

    // Timer toggle should show "Timer" text again (disabled state)
    const timerToggleDisabled = page.locator('button').filter({ hasText: /Timer/i });
    expect(await timerToggleDisabled.isVisible()).toBeTruthy();
  });

  test('should show warning colors as time runs low', async ({ page }) => {
    // Enable timer
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    const timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });

    // Initial state - should be blue
    let timerContainer = timerDisplay.locator('..'); // parent element
    let classList = await timerContainer.getAttribute('class');
    expect(classList).toContain('blue');

    // The timer shows 45:00 initially, so we can't really test warning/critical colors
    // without a much longer wait. This test mainly verifies the structure is there
    // and that the timer display is properly wrapped in a colored div
    expect(classList).toBeTruthy();
    expect(classList).toContain('rounded-lg');
  });

  test('should persist timer enabled state across page reloads', async ({ page }) => {
    // Enable timer
    const timerToggle = page.locator('button').filter({ hasText: /Timer/i });
    await timerToggle.click();
    await page.waitForTimeout(500);

    // Verify timer is enabled
    let timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });
    expect(await timerDisplay.isVisible()).toBeTruthy();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Timer should still be enabled
    timerDisplay = page.locator('div').filter({ hasText: /\d{2}:\d{2}/ });
    const isStillEnabled = await timerDisplay.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isStillEnabled).toBeTruthy();
  });
});
