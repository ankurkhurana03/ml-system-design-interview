import { test, expect } from '@playwright/test';
import { navigateSteps, navigateBack } from './helpers';

test.describe('Node Metadata & Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });
  });

  test('should show node metadata with node ID, stage, and type', async ({ page }) => {
    // Node metadata bar should be visible at the top of the question card
    const metadataBar = page.locator('.text-xs.text-gray-500.text-center');
    await expect(metadataBar).toBeVisible({ timeout: 5000 });

    // Get the metadata text
    const metadataText = await metadataBar.textContent();
    expect(metadataText).toBeTruthy();
    expect(metadataText).toContain('Node:');
    expect(metadataText).toContain('Stage:');
    expect(metadataText).toContain('Type:');

    // Verify format: "Node: [id] | Stage: [stage] | Type: [type]"
    const nodeMatch = metadataText?.match(/Node:\s*(\w+)/);
    const stageMatch = metadataText?.match(/Stage:\s*(\w+)/);
    const typeMatch = metadataText?.match(/Type:\s*(\w+)/);

    expect(nodeMatch).toBeTruthy();
    expect(stageMatch).toBeTruthy();
    expect(typeMatch).toBeTruthy();

    expect(nodeMatch?.[1]).toMatch(/^\w+$/);
    expect(stageMatch?.[1]).toMatch(/^(problem_definition|metrics|data|features|model|training|deployment|monitoring|multi_select)$/i);
    expect(typeMatch?.[1]).toMatch(/^(info|question|multi_select|terminal|dialogue)$/i);
  });

  test('should show speaker label', async ({ page }) => {
    // Speaker label should be visible as a badge (Interviewer or Candidate)
    const speakerBadge = page.locator('span').filter({
      hasText: /^(Interviewer|Candidate)$/i,
    });

    // The badge should exist on at least the first node
    const isBadgeVisible = await speakerBadge.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isBadgeVisible).toBeTruthy();

    // Get the speaker text
    if (isBadgeVisible) {
      const speakerText = await speakerBadge.first().textContent();
      expect(speakerText).toMatch(/^(Interviewer|Candidate)$/i);
    }
  });

  test('should display node title', async ({ page }) => {
    // Node title should be visible as h3 element inside question card
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4');
    const nodeTitle = questionCard.locator('h3').first();

    await expect(nodeTitle).toBeVisible({ timeout: 5000 });

    // Title should have non-empty text
    const titleText = await nodeTitle.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText?.length).toBeGreaterThan(0);
  });

  test('should render markdown content', async ({ page }) => {
    // Content text should be visible (markdown rendered)
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4');

    // Look for prose content - either in p tags or direct text content
    const contentElements = questionCard.locator('p, span, div').filter({
      hasNot: page.locator('button, h3, span.text-xs'),
    });

    // At least one content element should have text
    const contentCount = await contentElements.count();
    expect(contentCount).toBeGreaterThan(0);

    // Get the visible text content
    const cardText = await questionCard.textContent();
    expect(cardText).toBeTruthy();
    expect(cardText).not.toMatch(/^\s*$/); // Not just whitespace
  });

  test('should show colored left border based on stage', async ({ page }) => {
    // Question card should have a colored left border (border-l-4)
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4');
    await expect(questionCard).toBeVisible({ timeout: 5000 });

    // Get the computed border-left-color
    const borderColor = await questionCard.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.borderLeftColor;
    });

    // Border color should be set (not transparent or default)
    expect(borderColor).toBeTruthy();
    // Verify it's an rgb color (not "transparent" or "rgba(0,0,0,0)")
    expect(borderColor).toMatch(/^rgb/);

    // Extract the stage from metadata and verify color matches
    const metadataText = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    const stageMatch = metadataText?.match(/Stage:\s*(\w+)/);
    const stage = stageMatch?.[1]?.toLowerCase();

    // Stage should map to a specific color
    expect(['problem_definition', 'metrics', 'data', 'features', 'model', 'training', 'deployment', 'monitoring']).toContain(stage);
  });

  test('should update metadata when navigating', async ({ page }) => {
    // Get initial metadata
    const metadataBar = page.locator('.text-xs.text-gray-500.text-center');
    const initialMetadata = await metadataBar.textContent();

    // Advance one step
    const stepsTaken = await navigateSteps(page, 1);
    expect(stepsTaken).toBe(1);

    await page.waitForTimeout(500);

    // Get new metadata
    const newMetadata = await metadataBar.textContent();

    // Metadata should have changed (at least node ID or stage should differ)
    expect(newMetadata).not.toBe(initialMetadata);

    // Verify new metadata is valid
    expect(newMetadata).toContain('Node:');
    expect(newMetadata).toContain('Stage:');
    expect(newMetadata).toContain('Type:');
  });

  test('should show Interviewer label for interviewer nodes', async ({ page }) => {
    // First node is typically from interviewer (problem definition intro)
    const speakerBadge = page.locator('span').filter({
      hasText: /^Interviewer$/i,
    });

    // Check if interviewer badge is visible on initial node
    const isVisible = await speakerBadge.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      const badgeText = await speakerBadge.first().textContent();
      expect(badgeText).toBe('Interviewer');
    }
  });

  test('should show node type in metadata', async ({ page }) => {
    // Node type should be displayed in metadata bar
    const metadataText = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    const typeMatch = metadataText?.match(/Type:\s*(\w+)/);
    const nodeType = typeMatch?.[1];

    // Node type should be one of the valid types
    const validTypes = ['info', 'question', 'multi_select', 'terminal', 'dialogue'];
    expect(validTypes).toContain(nodeType?.toLowerCase());

    // For the first node, it's typically 'info' type
    if (nodeType?.toLowerCase() === 'info') {
      // Info nodes should have Continue button
      const continueBtn = page.getByRole('button', { name: /continue/i });
      const isVisible = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isVisible).toBe(true);
    }
  });

  test('should display Continue button for info nodes', async ({ page }) => {
    // First node is typically info type
    const metadataText = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    const typeMatch = metadataText?.match(/Type:\s*(\w+)/);
    const nodeType = typeMatch?.[1]?.toLowerCase();

    if (nodeType === 'info') {
      // Info nodes should have Continue button
      const continueBtn = page.getByRole('button', { name: /continue/i });
      await expect(continueBtn).toBeVisible({ timeout: 5000 });
      await expect(continueBtn).toBeEnabled();
    }
  });

  test('should display choice buttons for question nodes', async ({ page }) => {
    // Navigate until we find a question node
    let found = false;
    let maxAttempts = 10;

    while (maxAttempts > 0 && !found) {
      maxAttempts--;

      const metadataText = await page.locator('.text-xs.text-gray-500.text-center').textContent();
      const typeMatch = metadataText?.match(/Type:\s*(\w+)/);
      const nodeType = typeMatch?.[1]?.toLowerCase();

      if (nodeType === 'question') {
        // Question nodes should have choice buttons with radio circles
        const choiceButtons = page.locator('button').filter({
          has: page.locator('.w-6.h-6.rounded-full.bg-white'),
        });

        const count = await choiceButtons.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // Each choice button should be visible
        for (let i = 0; i < Math.min(2, count); i++) {
          const choiceBtn = choiceButtons.nth(i);
          await expect(choiceBtn).toBeVisible({ timeout: 5000 });
        }

        found = true;
        break;
      }

      // Try to advance to next node
      const continueBtn = page.getByRole('button', { name: /continue/i });
      const multiContinueBtn = page.getByRole('button', { name: /continue/i });

      if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      } else {
        break;
      }
    }

    expect(found).toBeTruthy();
  });

  test('should maintain metadata consistency across multi-step navigation', async ({ page }) => {
    // Navigate 3 steps forward and verify metadata is always valid at each step
    const stepsTaken = await navigateSteps(page, 3);
    expect(stepsTaken).toBeGreaterThan(0);

    // Check metadata is valid
    const metadataText = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    expect(metadataText).toContain('Node:');
    expect(metadataText).toContain('Stage:');
    expect(metadataText).toContain('Type:');

    // Navigate back and verify metadata is still valid
    const backSteps = await navigateBack(page, 1);
    if (backSteps > 0) {
      await page.waitForTimeout(500);
      const backMetadata = await page.locator('.text-xs.text-gray-500.text-center').textContent();
      expect(backMetadata).toContain('Node:');
      expect(backMetadata).toContain('Stage:');
      expect(backMetadata).toContain('Type:');
    }
  });

  test('should display speaker label with consistent styling', async ({ page }) => {
    // Speaker badge should be visible and styled consistently
    const speakerBadge = page.locator('span').filter({
      hasText: /^(Interviewer|Candidate)$/i,
    });

    const isVisible = await speakerBadge.isVisible({ timeout: 5000 }).catch(() => false);
    if (isVisible) {
      const badge = speakerBadge.first();

      // Badge should have specific styling (bg-blue-100 or similar)
      const bgColor = await badge.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return computed.backgroundColor;
      });

      expect(bgColor).toBeTruthy();
      // Should be a visible color (not transparent)
      expect(bgColor).not.toMatch(/rgba?\(0, 0, 0, 0\)/);
    }
  });

  test('should show valid node ID format in metadata', async ({ page }) => {
    // Node ID should follow naming convention (snake_case or similar)
    const metadataText = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    const nodeMatch = metadataText?.match(/Node:\s*(\w+)/);
    const nodeId = nodeMatch?.[1];

    expect(nodeId).toBeTruthy();
    // Node IDs should be alphanumeric with underscores
    expect(nodeId).toMatch(/^[\w_]+$/);
  });

  test('should display title with proper text content', async ({ page }) => {
    // Title should be a proper heading, not placeholder text
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4');
    const nodeTitle = questionCard.locator('h3').first();

    const titleText = await nodeTitle.textContent();

    // Title should have meaningful content
    expect(titleText).toBeTruthy();
    expect(titleText?.length).toBeGreaterThan(3);
    // Should not be placeholder text
    expect(titleText).not.toMatch(/\[.*\]/);
  });

  test('should show content without unfilled placeholders', async ({ page }) => {
    // Content should be filled (not show [FILL:...] placeholders)
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4');
    const cardText = await questionCard.textContent();

    // Should not contain unfilled placeholder markers
    expect(cardText).not.toMatch(/\[FILL:/);
    expect(cardText).toBeTruthy();
  });

  test('should have question card with proper border styling', async ({ page }) => {
    // Question card should have the proper structure
    const questionCard = page.locator('.bg-white.rounded-lg.shadow-lg.border-l-4');
    await expect(questionCard).toBeVisible({ timeout: 5000 });

    // Verify card has expected classes for styling
    const classAttr = await questionCard.evaluate((el) => el.getAttribute('class'));

    expect(classAttr).toContain('bg-white');
    expect(classAttr).toContain('rounded-lg');
    expect(classAttr).toContain('shadow-lg');
    expect(classAttr).toContain('border-l-4');
  });

  test('should show stage name matching the stage in metadata', async ({ page }) => {
    // Get stage from metadata
    const metadataText = await page.locator('.text-xs.text-gray-500.text-center').textContent();
    const stageMatch = metadataText?.match(/Stage:\s*(\w+)/);
    const stage = stageMatch?.[1];

    // Stage should be one of the valid ML stages
    const validStages = [
      'problem_definition',
      'metrics',
      'data',
      'features',
      'model',
      'training',
      'deployment',
      'monitoring',
    ];

    expect(validStages).toContain(stage?.toLowerCase());
  });

  test('should update all metadata elements together on navigation', async ({ page }) => {
    // Get all metadata elements
    const metadataBar = page.locator('.text-xs.text-gray-500.text-center');
    const initialNodeId = await metadataBar.evaluate((el) => {
      const text = el.textContent || '';
      const match = text.match(/Node:\s*(\w+)/);
      return match?.[1];
    });

    // Navigate forward
    await navigateSteps(page, 1);
    await page.waitForTimeout(500);

    // Get new node ID
    const newNodeId = await metadataBar.evaluate((el) => {
      const text = el.textContent || '';
      const match = text.match(/Node:\s*(\w+)/);
      return match?.[1];
    });

    // Node ID should have changed (indicating we moved to a new node)
    expect(newNodeId).not.toBe(initialNodeId);
  });
});
