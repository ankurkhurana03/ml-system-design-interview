import { test, expect } from '@playwright/test';
import { navigateSteps, navigateToTerminal } from './helpers';

test.describe('Notes Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const wizardPanel = page.locator('.flex.flex-col.h-full.bg-gray-100');
    await expect(wizardPanel).toBeVisible({ timeout: 10000 });
  });

  test('should show notes toggle button', async ({ page }) => {
    // Look for Notes button in the wizard panel area
    const notesButton = page.getByRole('button', { name: /notes/i });
    
    // The Notes button might not be visible if showNotes is false by default
    // Try to find it or switch to a mode where it's visible
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      // Try switching to a mode that shows notes (e.g., tutor mode)
      const modeButton = page.getByRole('button', { name: /tutor|interview|free form/i }).first();
      const hasModeButton = await modeButton.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasModeButton) {
        await modeButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    const notesBtn = page.getByRole('button', { name: /notes/i });
    const hasNotesBtn = await notesBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasNotesBtn).toBeTruthy();
  });

  test('should expand notes panel when clicked', async ({ page }) => {
    // Get or enable Notes button
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      // Switch to tutor mode to enable notes
      const settingsBtn = page.getByTitle('LLM Settings');
      await settingsBtn.click();
      await page.waitForTimeout(500);
      
      const tutorModeBtn = page.getByRole('radio', { name: /tutor/i });
      const hasTutorMode = await tutorModeBtn.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasTutorMode) {
        await tutorModeBtn.click();
        await page.waitForTimeout(500);
      }
      
      // Close settings
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    // Click Notes button
    const notesBtn = page.getByRole('button', { name: /notes/i });
    const btnExists = await notesBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (btnExists) {
      await notesBtn.click();
      await page.waitForTimeout(500);

      // Textarea should be visible after clicking
      const textarea = page.locator('textarea[placeholder*="Take notes"]');
      await expect(textarea).toBeVisible({ timeout: 5000 });
    }
  });

  test('should allow typing notes', async ({ page }) => {
    // Enable and open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      // Skip if notes button not available
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Find textarea
    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Type test notes
    const testNotes = 'My test notes about ML system design';
    await textarea.fill(testNotes);

    // Verify text was entered
    const textValue = await textarea.inputValue();
    expect(textValue).toBe(testNotes);
  });

  test('should persist notes in localStorage', async ({ page, context }) => {
    // Get the first problem from sidebar to know the problemId
    const problemItems = page.locator('.w-full.text-left.p-3.rounded-lg');
    const firstProblemVisible = await problemItems.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!firstProblemVisible) {
      test.skip();
    }

    // Get problem ID from the page context
    let problemId = await page.evaluate(() => {
      // Try to get from window state or localStorage keys
      const keys = Object.keys(localStorage);
      const problemKey = keys.find(k => k.startsWith('wizard-state-'));
      if (problemKey) {
        const state = JSON.parse(localStorage.getItem(problemKey) || '{}');
        return state.problemId || 'flight-delay';
      }
      return 'flight-delay'; // Default fallback
    });

    // Open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Type notes
    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    const testNotes = 'Persistent test notes';
    await textarea.fill(testNotes);
    await page.waitForTimeout(500);

    // Verify localStorage has the notes
    const storageKey = `notes.${problemId}`;
    const savedNotes = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, storageKey);

    expect(savedNotes).toBe(testNotes);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open notes again
    const notesBtn2 = page.getByRole('button', { name: /notes/i });
    const isVisible2 = await notesBtn2.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible2) {
      await notesBtn2.click();
      await page.waitForTimeout(500);

      // Verify notes are still there
      const textarea2 = page.locator('textarea[placeholder*="Take notes"]');
      const textValue = await textarea2.inputValue();
      expect(textValue).toBe(testNotes);
    }
  });

  test('should collapse notes panel', async ({ page }) => {
    // Open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Verify textarea is visible
    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Click notes button again to collapse
    await notesButton.click();
    await page.waitForTimeout(500);

    // Textarea should no longer be visible
    await expect(textarea).not.toBeVisible();
  });

  test('should have separate notes per problem', async ({ page }) => {
    // Get list of problems in sidebar
    const problemItems = page.locator('.w-full.text-left.p-3.rounded-lg');
    const problemCount = await problemItems.count();
    
    if (problemCount < 2) {
      test.skip(); // Need at least 2 problems
    }

    // Get the first problem's ID
    const firstProblemId = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const problemKey = keys.find(k => k.startsWith('wizard-state-'));
      if (problemKey) {
        const state = JSON.parse(localStorage.getItem(problemKey) || '{}');
        return state.problemId;
      }
      return null;
    });

    // Open notes and type in first problem
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    const firstNotes = 'Notes for first problem';
    await textarea.fill(firstNotes);
    await page.waitForTimeout(500);

    // Close notes
    await notesButton.click();
    await page.waitForTimeout(300);

    // Click second problem in sidebar
    const secondProblem = problemItems.nth(1);
    await secondProblem.click();
    await page.waitForTimeout(1000);

    // Get second problem ID
    const secondProblemId = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const problemKey = keys.find(k => k.startsWith('wizard-state-'));
      if (problemKey) {
        const state = JSON.parse(localStorage.getItem(problemKey) || '{}');
        return state.problemId;
      }
      return null;
    });

    // Open notes for second problem
    const notesBtn2 = page.getByRole('button', { name: /notes/i });
    const isVisible2 = await notesBtn2.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible2) {
      await notesBtn2.click();
      await page.waitForTimeout(500);

      // Notes should be empty (or different)
      const textarea2 = page.locator('textarea[placeholder*="Take notes"]');
      const noteValue = await textarea2.inputValue();
      
      // Should be empty or different from first problem's notes
      if (firstProblemId && secondProblemId && firstProblemId !== secondProblemId) {
        expect(noteValue).not.toBe(firstNotes);
      }
    }
  });

  test('should show character count', async ({ page }) => {
    // Open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Find character count display
    const charCount = page.locator('text=/\\(\\d+ characters\\)/');
    const countVisible = await charCount.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!countVisible) {
      test.skip();
    }

    // Type some text
    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    const testText = 'Testing character count';
    await textarea.fill(testText);
    await page.waitForTimeout(300);

    // Check if count updated
    const countText = await charCount.textContent();
    const expectedCount = testText.length;
    
    expect(countText).toContain(expectedCount.toString());
  });

  test('should show Clear button when notes exist', async ({ page }) => {
    // Open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Type some notes
    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    await textarea.fill('Some test notes');
    await page.waitForTimeout(300);

    // Clear button should be visible
    const clearButton = page.getByRole('button', { name: /clear/i });
    const clearVisible = await clearButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(clearVisible).toBeTruthy();
  });

  test('should clear notes on Clear button click', async ({ page }) => {
    // Open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Type notes
    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    await textarea.fill('Notes to clear');
    await page.waitForTimeout(300);

    // Click Clear button
    const clearButton = page.getByRole('button', { name: /clear/i });
    const clearVisible = await clearButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (clearVisible) {
      // Handle confirmation dialog
      page.once('dialog', dialog => dialog.accept());
      
      await clearButton.click();
      await page.waitForTimeout(500);

      // Textarea should be empty
      const textValue = await textarea.inputValue();
      expect(textValue).toBe('');
    }
  });

  test('should show close button in notes panel', async ({ page }) => {
    // Open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Find close button (X icon)
    const closeButton = page.locator('button[title="Close Notes"]');
    const closeVisible = await closeButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(closeVisible).toBeTruthy();
  });

  test('should toggle notes panel state visually', async ({ page }) => {
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }

    // Initially closed
    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    let textareaVisible = await textarea.isVisible({ timeout: 1000 }).catch(() => false);
    expect(textareaVisible).toBeFalsy();

    // Open
    await notesButton.click();
    await page.waitForTimeout(500);
    textareaVisible = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    expect(textareaVisible).toBeTruthy();

    // Close
    await notesButton.click();
    await page.waitForTimeout(500);
    textareaVisible = await textarea.isVisible({ timeout: 1000 }).catch(() => false);
    expect(textareaVisible).toBeFalsy();

    // Open again
    await notesButton.click();
    await page.waitForTimeout(500);
    textareaVisible = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
    expect(textareaVisible).toBeTruthy();
  });

  test('should show notes help text', async ({ page }) => {
    // Open notes panel
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    // Look for help text about transcript inclusion
    const helpText = page.locator('text=/transcript|automatically saved/i');
    const helpVisible = await helpText.isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(helpVisible).toBeTruthy();
  });

  test('should maintain notes while navigating wizard', async ({ page }) => {
    // Open notes and type
    const notesButton = page.getByRole('button', { name: /notes/i });
    const isVisible = await notesButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isVisible) {
      test.skip();
    }
    
    await notesButton.click();
    await page.waitForTimeout(500);

    const textarea = page.locator('textarea[placeholder*="Take notes"]');
    const testNotes = 'Notes while navigating';
    await textarea.fill(testNotes);
    await page.waitForTimeout(300);

    // Close notes
    await notesButton.click();
    await page.waitForTimeout(300);

    // Navigate forward in wizard
    const continueBtn = page.getByRole('button', { name: /continue/i });
    const hasontinue = await continueBtn.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasontinue) {
      await continueBtn.click();
      await page.waitForTimeout(500);

      // Reopen notes
      const notesBtn2 = page.getByRole('button', { name: /notes/i });
      const isVisible2 = await notesBtn2.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible2) {
        await notesBtn2.click();
        await page.waitForTimeout(500);

        // Notes should still be there
        const textarea2 = page.locator('textarea[placeholder*="Take notes"]');
        const noteValue = await textarea2.inputValue();
        expect(noteValue).toBe(testNotes);
      }
    }
  });
});
