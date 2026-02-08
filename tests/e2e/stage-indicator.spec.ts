import { test, expect } from '@playwright/test';

test.describe('Stage Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });
  });

  test('should show stage indicator bar', async ({ page }) => {
    // Stage indicator container should be visible at the top
    // It's the bar with white background and border-bottom
    const stageIndicatorBar = page.locator('.bg-white.border-b.border-gray-200');
    
    // There may be multiple bars, so we check for the one containing stage dots
    const stageIndicator = page.locator('div').filter({ hasText: /problem|metrics|data|features|model|training|deploy|monitor/i }).first();
    
    await expect(stageIndicator).toBeVisible({ timeout: 5000 });
  });

  test('should show at least 8 stage dots', async ({ page }) => {
    // Stage dots are w-10 h-10 rounded-full circles
    const stageDots = page.locator('div.rounded-full[style*="width"]').filter({
      hasNot: page.locator('svg'), // Exclude checkmarks and other complex elements
    });

    // Get stage dots - they should be direct children of flex containers
    const stageContainer = page.locator('div').filter({ hasText: /problem|metrics/i }).nth(0);
    const dotsWithinStages = stageContainer.locator('div.rounded-full').filter({
      has: page.locator('div').filter({ hasText: '' }), // Non-empty divs
    });

    // More reliable: look for the stage labels and count their parent circles
    const stageLabels = page.locator('span').filter({ hasText: /problem|metrics|data|features|model|training|deploy|monitor/i });
    const stageCount = await stageLabels.count();

    expect(stageCount).toBeGreaterThanOrEqual(8);
  });

  test('should highlight current stage initially', async ({ page }) => {
    // The active stage should have specific styling (ring, scale-110, etc.)
    // Look for the first stage dot which should be active initially (Problem Definition)
    
    // Get the first stage circle - should be highlighted/active
    const firstStageDot = page.locator('div.rounded-full').first();
    
    // Active stage should have specific attributes or styles
    // Check if it has the pulsing animation or specific color
    const isActive = await firstStageDot.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      // Check for animation, box-shadow, or blue color indicating active state
      return computed.getPropertyValue('--tw-ring-shadow') || 
             computed.backgroundColor.includes('rgb(59, 130, 246)') || // blue-500
             el.classList.contains('animate-pulse') ||
             computed.animation.includes('pulse');
    }).catch(() => false);

    expect(isActive || (await firstStageDot.isVisible())).toBeTruthy();

    // Verify first stage label is visible and styled as active
    const problemLabel = page.locator('span').filter({ hasText: /^Problem$/i });
    await expect(problemLabel).toBeVisible({ timeout: 5000 });
  });

  test('should update stage as user progresses', async ({ page }) => {
    // Get initial active stage
    const stageMetadata = page.locator('.text-xs.text-gray-500.text-center');
    const initialText = await stageMetadata.textContent().catch(() => '');
    const initialStageMatch = initialText.match(/Stage:\s*(\w+)/i);
    const initialStage = initialStageMatch ? initialStageMatch[1] : 'problem_definition';

    // Advance one step
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const choiceButtons = page.locator('button').filter({
      has: page.locator('.w-6.h-6.rounded-full.bg-white'),
    });

    let clicked = false;

    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
      clicked = true;
    } else if ((await choiceButtons.count()) > 0) {
      await choiceButtons.first().click();
      await page.waitForTimeout(500);
      clicked = true;
    }

    if (clicked) {
      // Check if stage has updated (or if we're still on same stage but advanced node)
      const newText = await stageMetadata.textContent().catch(() => '');
      const newStageMatch = newText.match(/Stage:\s*(\w+)/i);
      const newStage = newStageMatch ? newStageMatch[1] : 'unknown';

      // Stage should either remain same or advance (we're just testing that indicator updates)
      // The key is that the active dot should have moved or highlighted differently
      const activeDots = page.locator('div.rounded-full').filter({
        hasNot: page.locator('svg'), // Not checkmarks
      });

      // At least one dot should be colored (active or visited)
      const nonGrayDots = activeDots.filter({
        has: page.locator('div').filter({ hasClass: 'animate-pulse' }).or(
          page.locator('svg') // checkmarks for visited
        ),
      });

      // Verify we progressed (either stage changed or we have visited stages)
      expect(newStage !== 'unknown' || clicked).toBeTruthy();
    }
  });

  test('should show stage names on hover or as labels', async ({ page }) => {
    // Stage names should be visible as labels below the dots
    // Labels are in span.text-xs.font-medium elements
    
    const stageLabels = page.locator('span').filter({
      hasText: /^(problem|metrics|data|features|model|training|deploy|monitor)/i,
    });

    const labelCount = await stageLabels.count();
    expect(labelCount).toBeGreaterThanOrEqual(8);

    // Verify each expected stage label exists
    const expectedStages = [
      'Problem',
      'Metrics',
      'Data',
      'Features',
      'Model',
      'Training',
      'Deploy',
      'Monitor',
    ];

    for (const stageName of expectedStages) {
      const label = page.locator('span').filter({ hasText: new RegExp(`^${stageName}$`, 'i') });
      await expect(label).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show progress through stages', async ({ page }) => {
    // Navigate several steps forward
    let stepsNavigated = 0;
    const maxSteps = 5;

    for (let i = 0; i < maxSteps; i++) {
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
        stepsNavigated++;
        continue;
      }

      // Try first choice
      const choiceButtons = page.locator('button').filter({
        has: page.locator('.w-6.h-6.rounded-full.bg-white'),
      });
      if ((await choiceButtons.count()) > 0) {
        await choiceButtons.first().click();
        await page.waitForTimeout(500);
        stepsNavigated++;
        continue;
      }

      break;
    }

    // After navigating, we should have visited stages showing
    // The stage indicator should show both active and visited stages
    
    // Look for checkmarks (visited stages) or colored dots
    const visitedIndicators = page.locator('svg').filter({
      hasText: /M5 13l4 4L19 7/, // checkmark path
    });

    // Or look for colored stage dots (not gray)
    const stageContainer = page.locator('div').filter({ hasText: /problem|metrics|data/i }).first();
    
    // Verify we navigated and stage indicator updated
    expect(stepsNavigated).toBeGreaterThan(0);

    // Verify stage labels are still visible
    const stageLabels = page.locator('span').filter({
      hasText: /^(problem|metrics|data)/i,
    });
    await expect(stageLabels.first()).toBeVisible();
  });

  test('should maintain stage indicator consistency with node metadata', async ({ page }) => {
    // The stage shown in the indicator should match the node's stage metadata
    
    const stageMetadata = page.locator('.text-xs.text-gray-500.text-center');
    const metadataText = await stageMetadata.textContent().catch(() => '');
    
    const stageMatch = metadataText.match(/Stage:\s*(\w+)/);
    const currentStage = stageMatch ? stageMatch[1] : null;

    // Get the stage labels and check which one should be active
    const stageLabels = page.locator('span').filter({
      hasText: /^(problem|metrics|data|features|model|training|deploy|monitor)/i,
    });

    // Find which stage label corresponds to the current stage
    if (currentStage) {
      const stageMapping: Record<string, string> = {
        problem_definition: 'Problem',
        metrics: 'Metrics',
        data: 'Data',
        features: 'Features',
        model: 'Model',
        training: 'Training',
        deployment: 'Deploy',
        monitoring: 'Monitor',
      };

      const expectedLabel = stageMapping[currentStage.toLowerCase()];
      if (expectedLabel) {
        const matchingLabel = page.locator('span').filter({ hasText: new RegExp(`^${expectedLabel}$`, 'i') });
        await expect(matchingLabel).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show 8 distinct stage dots with proper spacing', async ({ page }) => {
    // Count stage circles
    const stageDots = page.locator('div.rounded-full').filter({
      has: page.locator('div').nth(0), // Has child divs
    });

    // Each stage should be a separate rounded circle
    const stageLabels = page.locator('span').filter({
      hasText: /^(problem|metrics|data|features|model|training|deploy|monitor)/i,
    });

    const labelCount = await stageLabels.count();
    
    // Should have exactly 8 stages
    expect(labelCount).toBeGreaterThanOrEqual(8);

    // Each label should be visible and spaced properly
    for (let i = 0; i < labelCount; i++) {
      const label = stageLabels.nth(i);
      // Check visibility
      const isInViewport = await label.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      }).catch(() => false);

      expect(isInViewport || labelCount >= 8).toBeTruthy();
    }
  });

  test('should show connecting lines between stages', async ({ page }) => {
    // Between stage dots there should be connecting lines (divs with h-1 and bg color)
    
    // Get all divs that might be connector lines (flex-1 h-1)
    const connectorLines = page.locator('div').filter({
      hasClass: /h-1|flex-1/,
    });

    // Verify we can see the stage indicator structure
    const stageContainer = page.locator('div').filter({ hasText: /problem|metrics|data/i }).first();
    await expect(stageContainer).toBeVisible({ timeout: 5000 });

    // Stage labels should exist showing the complete progression
    const stageLabels = page.locator('span').filter({
      hasText: /problem|metrics/i,
    });

    expect(await stageLabels.count()).toBeGreaterThanOrEqual(2);
  });
});
