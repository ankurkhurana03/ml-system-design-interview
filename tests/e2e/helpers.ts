import { Page, expect } from '@playwright/test';

/**
 * Navigation Helpers
 */

/**
 * Navigate through the wizard to reach a terminal node.
 * Takes the first available option at each step.
 *
 * @param page - Playwright page object
 * @param maxSteps - Maximum number of steps to take (default: 50)
 * @returns true if terminal node was reached, false otherwise
 */
export async function navigateToTerminal(page: Page, maxSteps = 50): Promise<boolean> {
  let steps = maxSteps;

  while (steps > 0) {
    steps--;

    // Check if we're at a terminal node
    const startOverBtn = page.getByRole('button', { name: /start over/i });
    if (await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }

    // Try to click Continue button (info nodes)
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    // Try to click first choice (question nodes)
    const choiceButtons = page.locator('button').filter({
      has: page.locator('.w-6.h-6.rounded-full.bg-white'),
    });
    const count = await choiceButtons.count();
    if (count > 0) {
      await choiceButtons.first().click();
      await page.waitForTimeout(500);
      continue;
    }

    // If we can't continue, we're stuck
    break;
  }

  return false;
}

/**
 * Navigate N steps forward in the wizard.
 * Takes the first available option at each step.
 *
 * @param page - Playwright page object
 * @param steps - Number of steps to take
 * @returns Number of successful steps taken
 */
export async function navigateSteps(page: Page, steps: number): Promise<number> {
  let stepsTaken = 0;

  for (let i = 0; i < steps; i++) {
    // Check for terminal node
    const startOverBtn = page.getByRole('button', { name: /start over/i });
    if (await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      break;
    }

    // Try Continue button
    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
      stepsTaken++;
      continue;
    }

    // Try first choice
    const choiceButtons = page.locator('button').filter({
      has: page.locator('.w-6.h-6.rounded-full.bg-white'),
    });
    if ((await choiceButtons.count()) > 0) {
      await choiceButtons.first().click();
      await page.waitForTimeout(500);
      stepsTaken++;
      continue;
    }

    // Can't continue
    break;
  }

  return stepsTaken;
}

/**
 * Navigate backward N steps in the wizard.
 *
 * @param page - Playwright page object
 * @param steps - Number of steps to go back
 * @returns Number of successful back steps taken
 */
export async function navigateBack(page: Page, steps: number): Promise<number> {
  let stepsTaken = 0;

  for (let i = 0; i < steps; i++) {
    const backBtn = page.getByRole('button', { name: /back/i });
    if (await backBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(500);
      stepsTaken++;
    } else {
      break;
    }
  }

  return stepsTaken;
}

/**
 * Selectors
 */

export const selectors = {
  // Sidebar
  sidebar: {
    container: '.w-70.h-screen.bg-slate-900',
    header: 'text=ML System Design',
    searchInput: 'input[placeholder*="Search"]',
    collapseButton: '[title*="Collapse sidebar"]',
    expandButton: '[title*="Expand sidebar"]',
    generateButton: 'button:has-text("Generate New Problem")',
    problemItem: '.w-full.text-left.p-3.rounded-lg',
  },

  // Wizard
  wizard: {
    panel: '.flex.flex-col.h-full.bg-gray-100',
    questionCard: '.bg-white.rounded-lg.shadow-lg.border-l-4',
    continueButton: 'button:has-text("Continue")',
    backButton: 'button:has-text("Back")',
    startOverButton: 'button:has-text("Start Over")',
    choiceButton: 'button:has(.w-6.h-6.rounded-full.bg-white)',
    nodeMetadata: '.text-xs.text-gray-500.text-center',
  },

  // View modes
  viewModes: {
    graphOnlyButton: 'button:has-text("Graph Only")',
    splitButton: 'button:has-text("Split")',
    wizardOnlyButton: 'button:has-text("Wizard Only")',
  },

  // Top bar
  topBar: {
    container: '.h-10.bg-white.border-b',
    problemTitle: '.text-sm.font-semibold.text-gray-700',
    settingsButton: '[title="LLM Settings"]',
    signInButton: 'button:has-text("Sign In")',
  },

  // Graph
  graph: {
    container: '.react-flow',
  },

  // Transcript
  transcript: {
    downloadButton: 'button:has-text("Download Transcript")',
    toast: 'text=/downloaded/i',
  },
};

/**
 * Wait Helpers
 */

/**
 * Wait for the app to be fully loaded.
 */
export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Allow for any animations
}

/**
 * Wait for a problem to load in the wizard.
 */
export async function waitForProblemLoaded(page: Page) {
  const wizardPanel = page.locator(selectors.wizard.panel);
  await expect(wizardPanel).toBeVisible({ timeout: 10000 });
}

/**
 * Assertion Helpers
 */

/**
 * Check if currently at a terminal node.
 */
export async function isAtTerminalNode(page: Page): Promise<boolean> {
  const startOverBtn = page.getByRole('button', { name: /start over/i });
  return await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Check if currently at an info node (has Continue button).
 */
export async function isAtInfoNode(page: Page): Promise<boolean> {
  const continueBtn = page.getByRole('button', { name: /continue/i });
  return await continueBtn.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Check if currently at a question node (has choices).
 */
export async function isAtQuestionNode(page: Page): Promise<boolean> {
  const choiceButtons = page.locator(selectors.wizard.choiceButton);
  const count = await choiceButtons.count();
  return count >= 2;
}

/**
 * Get the current node ID from the metadata display.
 */
export async function getCurrentNodeId(page: Page): Promise<string | null> {
  const metadata = page.locator(selectors.wizard.nodeMetadata);
  const text = await metadata.textContent();
  if (!text) return null;

  // Extract node ID from "Node: xyz | Stage: ... | Type: ..."
  const match = text.match(/Node:\s*([^\s|]+)/);
  return match ? match[1] : null;
}

/**
 * View Mode Helpers
 */

/**
 * Switch to a specific view mode.
 */
export async function setViewMode(
  page: Page,
  mode: 'graph' | 'split' | 'wizard'
) {
  const buttonMap = {
    graph: selectors.viewModes.graphOnlyButton,
    split: selectors.viewModes.splitButton,
    wizard: selectors.viewModes.wizardOnlyButton,
  };

  const button = page.locator(buttonMap[mode]);
  await button.click();
  await page.waitForTimeout(500);
}

/**
 * Sidebar Helpers
 */

/**
 * Search for a problem in the sidebar.
 */
export async function searchProblems(page: Page, query: string) {
  const searchInput = page.getByPlaceholder(/search problems/i);
  await searchInput.clear();
  await searchInput.fill(query);
  await page.waitForTimeout(500);
}

/**
 * Select a problem by title.
 */
export async function selectProblem(page: Page, title: string) {
  const problemButton = page
    .locator(selectors.sidebar.problemItem)
    .filter({ hasText: title });
  await problemButton.click();
  await page.waitForTimeout(1000);
}

/**
 * Toggle sidebar collapsed state.
 */
export async function toggleSidebar(page: Page) {
  const collapseBtn = page.locator(selectors.sidebar.collapseButton);
  const expandBtn = page.locator(selectors.sidebar.expandButton);

  const isCollapsed = await expandBtn.isVisible({ timeout: 1000 }).catch(() => false);

  if (isCollapsed) {
    await expandBtn.click();
  } else {
    await collapseBtn.click();
  }

  await page.waitForTimeout(500);
}

/**
 * Download Helpers
 */

/**
 * Download transcript and return the download object.
 */
export async function downloadTranscript(page: Page) {
  const downloadPromise = page.waitForEvent('download');
  const downloadBtn = page.getByRole('button', { name: /download transcript/i });
  await downloadBtn.click();
  return await downloadPromise;
}

/**
 * Settings Helpers
 */

/**
 * Open the settings panel.
 */
export async function openSettings(page: Page) {
  const settingsBtn = page.getByTitle('LLM Settings');
  await settingsBtn.click();
  await page.waitForTimeout(500);
}

/**
 * Close the settings panel.
 */
export async function closeSettings(page: Page) {
  // Try pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

/**
 * Problem Data Helpers
 */

/**
 * Get all visible problem titles in the sidebar.
 */
export async function getVisibleProblems(page: Page): Promise<string[]> {
  const problemItems = page.locator(`${selectors.sidebar.problemItem} .font-semibold.text-sm`);
  const count = await problemItems.count();
  const titles: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await problemItems.nth(i).textContent();
    if (text) titles.push(text.trim());
  }

  return titles;
}

/**
 * Validation Helpers
 */

/**
 * Validate that the wizard is showing valid content.
 */
export async function validateWizardContent(page: Page) {
  // Should have a question card
  const card = page.locator(selectors.wizard.questionCard);
  await expect(card).toBeVisible();

  // Should have speaker label
  const speaker = page.locator('.inline-flex.items-center.px-3.py-1.rounded-full').filter({
    hasText: /interviewer|candidate/i,
  });
  await expect(speaker).toBeVisible();

  // Should have node metadata
  const metadata = page.locator(selectors.wizard.nodeMetadata);
  await expect(metadata).toBeVisible();
}

/**
 * Debug Helpers
 */

/**
 * Log current wizard state for debugging.
 */
export async function logWizardState(page: Page) {
  const nodeId = await getCurrentNodeId(page);
  const isTerminal = await isAtTerminalNode(page);
  const isInfo = await isAtInfoNode(page);
  const isQuestion = await isAtQuestionNode(page);

  console.log('Wizard State:', {
    nodeId,
    isTerminal,
    isInfo,
    isQuestion,
  });
}
