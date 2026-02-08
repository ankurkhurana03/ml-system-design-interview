# E2E Tests Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
# Install npm packages (if not already done)
npm install

# Install Playwright browsers
npx playwright install
```

### 2. Run Tests
```bash
# Run all tests
npm run test:e2e

# Or with Playwright directly
npx playwright test
```

### 3. View Results
```bash
# Open HTML report
npx playwright show-report
```

## 📁 Test Files

| File | Purpose | Tests |
|------|---------|-------|
| `app-load.spec.ts` | App initialization | 6 |
| `wizard-navigation.spec.ts` | Navigation flows | 8 |
| `view-modes.spec.ts` | View toggling | 7 |
| `sidebar.spec.ts` | Sidebar features | 12 |
| `transcript.spec.ts` | Download feature | 6 |
| `settings.spec.ts` | Settings panel | 8 |
| `example-with-helpers.spec.ts` | Helper examples | 11 |

**Total: 58 tests**

## 🎯 Quick Commands

```bash
# Development
npx playwright test --ui              # Interactive mode
npx playwright test --headed          # See browser
npx playwright test --debug           # Debug mode

# Specific tests
npx playwright test app-load          # One file
npx playwright test -g "navigation"   # By pattern

# CI/Production
npx playwright test --reporter=html   # HTML report
npx playwright test --workers=1       # Single worker
```

## 🛠️ Using Helpers

### Import Helpers
```typescript
import {
  navigateToTerminal,
  navigateSteps,
  setViewMode,
  downloadTranscript,
  waitForAppReady,
} from './helpers';
```

### Common Patterns

**Navigate Through Wizard**
```typescript
await waitForAppReady(page);
const reached = await navigateToTerminal(page);
expect(reached).toBeTruthy();
```

**Switch View Mode**
```typescript
await setViewMode(page, 'graph');
await setViewMode(page, 'wizard');
await setViewMode(page, 'split');
```

**Download Transcript**
```typescript
await navigateToTerminal(page);
const download = await downloadTranscript(page);
expect(download.suggestedFilename()).toMatch(/\.md$/);
```

**Search Problems**
```typescript
await searchProblems(page, 'flight');
const problems = await getVisibleProblems(page);
expect(problems).toContain('Flight Delay Prediction');
```

## ✍️ Writing New Tests

### Basic Template
```typescript
import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('should do something', async ({ page }) => {
    // Your test here
  });
});
```

### With Helpers
```typescript
import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  navigateSteps,
  getCurrentNodeId,
} from './helpers';

test('should navigate forward', async ({ page }) => {
  await page.goto('/');
  await waitForAppReady(page);

  const initialNode = await getCurrentNodeId(page);
  await navigateSteps(page, 3);
  const newNode = await getCurrentNodeId(page);

  expect(newNode).not.toBe(initialNode);
});
```

## 🔍 Debugging Tests

### Debug a Failing Test
```bash
# Run in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test app-load.spec.ts --debug
```

### Add Breakpoints
```typescript
test('my test', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // Playwright Inspector opens here
  // ... rest of test
});
```

### View Traces
```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## 📊 Common Assertions

```typescript
// Visibility
await expect(element).toBeVisible();
await expect(element).not.toBeVisible();

// Text content
await expect(element).toHaveText('Expected text');
await expect(element).toContainText('partial');

// CSS classes
await expect(element).toHaveClass(/active/);

// Attributes
await expect(element).toHaveAttribute('href', '/path');

// Count
await expect(elements).toHaveCount(5);

// URL
await expect(page).toHaveURL(/.*dashboard/);
```

## 🚨 Troubleshooting

### Tests Failing?

**Timeout errors**
```typescript
// Increase timeout for slow operations
await expect(element).toBeVisible({ timeout: 10000 });
```

**Element not found**
```typescript
// Wait for element to exist
await page.waitForSelector('.my-element');

// Check if element exists before using
const exists = await element.isVisible().catch(() => false);
if (exists) {
  await element.click();
}
```

**Flaky tests**
```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => document.readyState === 'complete');
```

## 📚 Resources

- [Full README](./README.md) - Comprehensive documentation
- [Test Summary](./TEST_SUMMARY.md) - Coverage and metrics
- [Helpers](./helpers.ts) - All helper functions
- [Examples](./example-with-helpers.spec.ts) - Example tests
- [Playwright Docs](https://playwright.dev) - Official documentation

## 🎓 Example Workflows

### Run Tests Locally
```bash
# 1. Start dev server (in another terminal)
npm run dev

# 2. Run tests
npm run test:e2e

# 3. View report
npx playwright show-report
```

### Add New Test
```bash
# 1. Create test file
touch tests/e2e/my-feature.spec.ts

# 2. Write test (see template above)

# 3. Run test
npx playwright test my-feature.spec.ts

# 4. Debug if needed
npx playwright test my-feature.spec.ts --debug
```

### Update After UI Change
```bash
# 1. Update selectors in affected tests

# 2. Run tests to verify
npx playwright test

# 3. Update helpers if needed
# Edit tests/e2e/helpers.ts

# 4. Run full suite
npm run test:e2e
```

## ✅ Checklist for New Features

- [ ] Write e2e test for happy path
- [ ] Write test for error cases
- [ ] Add helper function if reusable
- [ ] Run tests locally
- [ ] Verify tests pass in CI
- [ ] Update documentation if needed

## 💡 Pro Tips

1. **Use helpers** - Don't reinvent the wheel
2. **Wait properly** - Use networkidle and explicit waits
3. **Debug with UI mode** - `npx playwright test --ui`
4. **Check selectors** - Use Playwright Inspector
5. **Keep tests focused** - One test, one thing
6. **Name tests clearly** - Describe what they test
7. **Run tests often** - Catch issues early

## 🎉 You're Ready!

Start with:
```bash
npm run test:e2e
```

Need help? Check [README.md](./README.md) for detailed docs.

Happy testing! 🚀
