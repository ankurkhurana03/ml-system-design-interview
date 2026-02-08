import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  waitForProblemLoaded,
  navigateToTerminal,
  navigateSteps,
  navigateBack,
  setViewMode,
  searchProblems,
  selectProblem,
  toggleSidebar,
  downloadTranscript,
  openSettings,
  closeSettings,
  getCurrentNodeId,
  isAtTerminalNode,
  isAtInfoNode,
  isAtQuestionNode,
  validateWizardContent,
  getVisibleProblems,
  selectors,
} from './helpers';

/**
 * Example test suite demonstrating the use of helper functions.
 * These tests show best practices for writing maintainable e2e tests.
 */

test.describe('Example Tests with Helpers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForProblemLoaded(page);
  });

  test('should navigate using helper functions', async ({ page }) => {
    // Take 3 steps forward
    const stepsTaken = await navigateSteps(page, 3);
    expect(stepsTaken).toBeGreaterThan(0);

    // Get current node
    const nodeId = await getCurrentNodeId(page);
    expect(nodeId).toBeTruthy();

    // Go back 2 steps
    const backSteps = await navigateBack(page, 2);
    expect(backSteps).toBeGreaterThan(0);

    // New node should be different
    const newNodeId = await getCurrentNodeId(page);
    expect(newNodeId).not.toBe(nodeId);
  });

  test('should navigate to terminal and download transcript', async ({ page }) => {
    // Navigate to terminal using helper
    const reachedTerminal = await navigateToTerminal(page);
    expect(reachedTerminal).toBeTruthy();

    // Verify we're at terminal
    const isTerminal = await isAtTerminalNode(page);
    expect(isTerminal).toBeTruthy();

    // Download transcript
    const download = await downloadTranscript(page);
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('should switch view modes using helper', async ({ page }) => {
    // Switch to graph only
    await setViewMode(page, 'graph');
    await expect(
      page.getByRole('button', { name: /graph only/i })
    ).toHaveClass(/bg-white text-gray-900 shadow-sm/);

    // Switch to wizard only
    await setViewMode(page, 'wizard');
    await expect(
      page.getByRole('button', { name: /wizard only/i })
    ).toHaveClass(/bg-white text-gray-900 shadow-sm/);

    // Back to split
    await setViewMode(page, 'split');
    await expect(
      page.getByRole('button', { name: /^split$/i })
    ).toHaveClass(/bg-white text-gray-900 shadow-sm/);
  });

  test('should search problems using helper', async ({ page }) => {
    // Get initial problems
    const allProblems = await getVisibleProblems(page);
    expect(allProblems.length).toBeGreaterThan(0);

    // Search for specific problem
    await searchProblems(page, 'flight');
    const filteredProblems = await getVisibleProblems(page);
    expect(filteredProblems.length).toBeLessThanOrEqual(allProblems.length);

    // Should show Flight Delay Prediction
    expect(filteredProblems.some(p => p.includes('Flight Delay'))).toBeTruthy();

    // Search for non-existent
    await searchProblems(page, 'nonexistent xyz');
    await expect(page.getByText('No problems found')).toBeVisible();
  });

  test('should toggle sidebar using helper', async ({ page }) => {
    // Collapse sidebar
    await toggleSidebar(page);
    await expect(page.getByText('ML System Design')).not.toBeVisible();

    // Expand sidebar
    await toggleSidebar(page);
    await expect(page.getByText('ML System Design')).toBeVisible();
  });

  test('should open and close settings using helper', async ({ page }) => {
    // Open settings
    await openSettings(page);

    // Settings panel should be visible
    const settingsPanel = page.locator('.fixed.inset-0').filter({
      hasText: /settings|API|LLM|configuration/i,
    });
    const isVisible = await settingsPanel.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isVisible).toBeTruthy();

    // Close settings
    await closeSettings(page);
    await page.waitForTimeout(500);
  });

  test('should check node types using helpers', async ({ page }) => {
    // Check current node type
    const isInfo = await isAtInfoNode(page);
    const isQuestion = await isAtQuestionNode(page);
    const isTerminal = await isAtTerminalNode(page);

    // Should be at one type of node
    const nodeTypeCount = [isInfo, isQuestion, isTerminal].filter(Boolean).length;
    expect(nodeTypeCount).toBeGreaterThanOrEqual(1);

    // Navigate to next node
    if (isInfo) {
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForTimeout(500);
    } else if (isQuestion) {
      const firstChoice = page.locator(selectors.wizard.choiceButton).first();
      await firstChoice.click();
      await page.waitForTimeout(500);
    }

    // Node should have changed
    const newIsInfo = await isAtInfoNode(page);
    const newIsQuestion = await isAtQuestionNode(page);
    const newIsTerminal = await isAtTerminalNode(page);

    // At least one condition should be different (we moved)
    const changed =
      newIsInfo !== isInfo ||
      newIsQuestion !== isQuestion ||
      newIsTerminal !== isTerminal;
    expect(changed).toBeTruthy();
  });

  test('should validate wizard content', async ({ page }) => {
    // Use validation helper
    await validateWizardContent(page);

    // Navigate forward
    await navigateSteps(page, 1);

    // Content should still be valid
    await validateWizardContent(page);
  });

  test('should select different problem using helper', async ({ page }) => {
    // Get available problems
    const problems = await getVisibleProblems(page);

    if (problems.length > 1) {
      // Select second problem
      await selectProblem(page, problems[1]);

      // Problem should be loaded in top bar
      const topBarTitle = page.locator(selectors.topBar.problemTitle);
      await expect(topBarTitle).toContainText(problems[1]);
    }
  });

  test('should use selectors from helpers', async ({ page }) => {
    // Access wizard panel using selector constant
    const wizardPanel = page.locator(selectors.wizard.panel);
    await expect(wizardPanel).toBeVisible();

    // Access sidebar using selector constant
    const sidebar = page.locator(selectors.sidebar.container);
    await expect(sidebar).toBeVisible();

    // Access graph using selector constant
    const graph = page.locator(selectors.graph.container);
    await expect(graph).toBeVisible();
  });

  test('should handle complete workflow with helpers', async ({ page }) => {
    // 1. Validate initial state
    await validateWizardContent(page);
    const initialNode = await getCurrentNodeId(page);

    // 2. Navigate forward
    const steps = await navigateSteps(page, 5);
    expect(steps).toBeGreaterThan(0);

    // 3. Switch to graph only view
    await setViewMode(page, 'graph');

    // 4. Switch back to split
    await setViewMode(page, 'split');

    // 5. Navigate to terminal
    const reachedTerminal = await navigateToTerminal(page);
    expect(reachedTerminal).toBeTruthy();

    // 6. Download transcript
    const download = await downloadTranscript(page);
    expect(download.suggestedFilename()).toMatch(/\.md$/);

    // 7. Start over
    await page.getByRole('button', { name: /start over/i }).click();
    await page.waitForTimeout(1000);

    // 8. Should be back at beginning
    const finalNode = await getCurrentNodeId(page);
    expect(finalNode).toBe(initialNode);
  });
});
