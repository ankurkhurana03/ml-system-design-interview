# E2E Tests for ML System Design Interview Tool

This directory contains comprehensive end-to-end tests using Playwright to ensure the ML System Design Interview application works correctly from a user's perspective.

## Test Files Overview

### 1. `app-load.spec.ts` - Application Loading
Tests basic application initialization and loading behavior:
- App loads successfully and shows sidebar
- Built-in problems are visible
- First problem auto-loads
- View mode toggle buttons are present
- Settings button is accessible

### 2. `wizard-navigation.spec.ts` - Wizard Navigation
Tests the core wizard step-by-step navigation flow:
- Initial node display with Continue button or choices
- Advancing through info nodes
- Displaying and selecting choices at question nodes
- Back button navigation
- Completing full paths through the decision tree
- Breadcrumb trail display
- Stage indicator visibility
- Speaker labels (Interviewer/Candidate)

### 3. `view-modes.spec.ts` - View Mode Toggling
Tests the three view modes (Graph Only, Split, Wizard Only):
- Switching between view modes
- Correct panel visibility in each mode
- State persistence when changing modes
- Divider visibility in Split mode

### 4. `sidebar.spec.ts` - Sidebar Functionality
Tests sidebar interactions and problem management:
- Collapse/expand sidebar
- Search and filter problems
- Difficulty badges and tags display
- Active problem highlighting
- Problem switching
- Generate New Problem button
- Truncated descriptions

### 5. `transcript.spec.ts` - Transcript Download
Tests the transcript download feature:
- Download button appears at terminal nodes
- Transcript downloads as .md file
- Filename includes problem reference
- Success toast notification
- Start Over button functionality
- Navigation reset after Start Over

### 6. `settings.spec.ts` - Settings Panel
Tests settings panel functionality:
- Opening and closing settings panel
- Settings button accessibility from all view modes
- Sign In button display
- State persistence when toggling settings

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Install Playwright browsers (if not already installed)
npx playwright install
```

### Run All Tests
```bash
# Run all e2e tests
npm run test:e2e

# Or use Playwright directly
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode (interactive)
npx playwright test --ui
```

### Run Specific Test Files
```bash
# Run a single test file
npx playwright test app-load.spec.ts

# Run specific test suite
npx playwright test -g "Wizard Navigation"

# Run specific test
npx playwright test -g "should complete a full path"
```

### Debug Tests
```bash
# Run in debug mode
npx playwright test --debug

# Run specific test in debug mode
npx playwright test app-load.spec.ts --debug
```

### View Test Results
```bash
# Show HTML report (after running tests)
npx playwright show-report

# Run tests with trace
npx playwright test --trace on
```

## Test Configuration

Tests are configured in `/playwright.config.ts`:
- **Base URL**: `http://localhost:5173`
- **Test Directory**: `./tests/e2e`
- **Web Server**: Auto-starts dev server (`npm run dev`)
- **Retries**: 2 retries in CI, 0 locally
- **Screenshots**: Captured on failure
- **Traces**: Captured on first retry

## Writing New Tests

### Best Practices

1. **Use User-Centric Selectors**
   ```typescript
   // Good - semantic selectors
   page.getByRole('button', { name: /continue/i })
   page.getByText('Flight Delay Prediction')
   page.getByPlaceholder(/search/i)

   // Avoid - implementation details
   page.locator('.some-internal-class')
   ```

2. **Wait Appropriately**
   ```typescript
   // Wait for network to be idle
   await page.waitForLoadState('networkidle');

   // Wait with timeout for visibility
   await expect(element).toBeVisible({ timeout: 5000 });

   // Use small waits only when necessary
   await page.waitForTimeout(500); // Only for animations
   ```

3. **Handle Dynamic Content**
   ```typescript
   // Check if element exists before interacting
   const hasButton = await button.isVisible({ timeout: 2000 }).catch(() => false);
   if (hasButton) {
     await button.click();
   }
   ```

4. **Use Robust Loops for Navigation**
   ```typescript
   let maxSteps = 50;
   while (maxSteps > 0) {
     maxSteps--;
     // Navigation logic with multiple exit conditions
     if (await terminalCondition) break;
     // Continue navigation
   }
   ```

5. **Test User Flows, Not Implementation**
   - Focus on what users see and do
   - Avoid testing internal state unless necessary
   - Test complete workflows, not isolated functions

### Adding Data Test IDs

For more stable selectors, you can add `data-testid` attributes to components:

```tsx
// In your component
<div data-testid="wizard-panel">
  {/* content */}
</div>

// In your test
const wizardPanel = page.getByTestId('wizard-panel');
```

## Common Patterns

### Navigation Helper
```typescript
async function navigateToTerminal(page: Page) {
  let maxSteps = 50;
  while (maxSteps > 0) {
    maxSteps--;

    const startOverBtn = page.getByRole('button', { name: /start over/i });
    if (await startOverBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }

    const continueBtn = page.getByRole('button', { name: /continue/i });
    if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
      continue;
    }

    const choiceButtons = page.locator('[data-testid="choice-button"]');
    if (await choiceButtons.count() > 0) {
      await choiceButtons.first().click();
      await page.waitForTimeout(500);
      continue;
    }

    break;
  }
  return false;
}
```

### Download Handler
```typescript
const downloadPromise = page.waitForEvent('download');
await downloadButton.click();
const download = await downloadPromise;
expect(download.suggestedFilename()).toMatch(/\.md$/);
```

## CI/CD Integration

These tests are designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check if dev server is starting correctly
- Verify network conditions

### Flaky Tests
- Add appropriate waits for animations
- Use `waitForLoadState('networkidle')`
- Increase timeouts for slow operations
- Check for race conditions

### Element Not Found
- Verify selectors match current UI
- Check if element is in viewport
- Wait for element to be visible before interacting

### Download Tests Failing
- Ensure download permissions in Playwright config
- Check file path expectations
- Verify download event listeners

## Maintenance

### When UI Changes
1. Update selectors in affected tests
2. Re-run entire test suite to catch regressions
3. Update README if test behavior changes

### Adding New Features
1. Write tests for new user flows
2. Group related tests in appropriate spec files
3. Follow existing patterns and conventions
4. Document any new patterns in this README

### Performance
- Keep individual tests focused and fast
- Use `test.describe.configure({ mode: 'parallel' })` for independent tests
- Avoid unnecessary waits
- Share setup via `beforeEach` when possible

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Guide](https://playwright.dev/docs/ci)
