# Comments Test Commands - Quick Reference

## 🚀 Quick Start

```bash
# Run all unit tests for comments
npm test -- tests/unit/useNodeComments.test.ts

# Run all e2e tests for comments
npx playwright test comments
```

## 📋 Unit Test Commands

### Basic
```bash
# Run tests
npm test -- tests/unit/useNodeComments.test.ts

# Run with coverage
npm test -- --coverage tests/unit/useNodeComments.test.ts

# Run in watch mode (auto-rerun on changes)
npm test -- --watch tests/unit/useNodeComments.test.ts

# Run only failed tests
npm test -- --rerun-failures tests/unit/useNodeComments.test.ts
```

### Filtering
```bash
# Run specific test by name
npm test -- tests/unit/useNodeComments.test.ts -t "should add comment optimistically"

# Run all tests matching pattern
npm test -- tests/unit/useNodeComments.test.ts -t "localStorage"

# Run test file in UI mode (if available)
npm test -- --ui tests/unit/useNodeComments.test.ts
```

### Debugging
```bash
# Run with verbose output
npm test -- --reporter=verbose tests/unit/useNodeComments.test.ts

# Run with debug logging
DEBUG=* npm test -- tests/unit/useNodeComments.test.ts

# Run single test (modify file to use .only)
# it.only('should add comment', async () => { ... })
npm test -- tests/unit/useNodeComments.test.ts
```

### Coverage Reports
```bash
# Generate coverage report
npm test -- --coverage tests/unit/useNodeComments.test.ts

# Coverage with HTML report
npm test -- --coverage --coverage.reporter=html tests/unit/useNodeComments.test.ts

# Open HTML coverage report (after generating)
open coverage/index.html
```

## 🎭 E2E Test Commands

### Basic
```bash
# Run all comment tests
npx playwright test comments

# Run in headed mode (see the browser)
npx playwright test comments --headed

# Run in UI mode (interactive debugging)
npx playwright test comments --ui

# Run in debug mode (step through)
npx playwright test comments --debug
```

### Filtering
```bash
# Run specific test
npx playwright test comments -g "should submit a comment"

# Run tests matching pattern
npx playwright test comments -g "reply"

# Run only tests with specific tag (if using @tag)
npx playwright test comments --grep @smoke
```

### Different Browsers
```bash
# Run in all browsers
npx playwright test comments --project=chromium --project=firefox --project=webkit

# Run in specific browser
npx playwright test comments --project=chromium
npx playwright test comments --project=firefox
npx playwright test comments --project=webkit

# Run in mobile viewport
npx playwright test comments --project="Mobile Chrome"
```

### Debugging & Reports
```bash
# Generate trace on failure
npx playwright test comments --trace on

# Show test report
npx playwright show-report

# View trace file
npx playwright show-trace trace.zip

# Take screenshots
npx playwright test comments --screenshot=on

# Record video
npx playwright test comments --video=on
```

### Advanced
```bash
# Run with specific timeout
npx playwright test comments --timeout=60000

# Run with retries
npx playwright test comments --retries=2

# Run with workers (parallel)
npx playwright test comments --workers=4

# Run in different viewport size
npx playwright test comments --viewport-size=1920,1080
```

## 🔍 Combined Commands

```bash
# Run both unit and e2e tests
npm test -- tests/unit/useNodeComments.test.ts && npx playwright test comments

# Run unit tests with coverage, then e2e
npm test -- --coverage tests/unit/useNodeComments.test.ts && npx playwright test comments --headed

# Quick smoke test (fast)
npm test -- tests/unit/useNodeComments.test.ts -t "should initialize" && \
npx playwright test comments -g "should show comments toggle"
```

## 🐛 Common Debugging Workflows

### "Test is failing randomly"
```bash
# Run test 10 times to check for flakiness
for i in {1..10}; do npx playwright test comments -g "failing test name"; done

# Run with retries
npx playwright test comments --retries=3

# Run with video to see what's happening
npx playwright test comments --video=on --headed
```

### "I need to see what's happening"
```bash
# Interactive UI mode (best for debugging)
npx playwright test comments --ui

# Debug mode with breakpoints
npx playwright test comments --debug

# Headed mode with slow motion
npx playwright test comments --headed --slow-mo=1000
```

### "Mock is not working"
```bash
# Check if mocks are called
npm test -- tests/unit/useNodeComments.test.ts --reporter=verbose

# Add console.log to see mock calls
# In test file: console.log(mockSelect.mock.calls)

# Run single test to isolate issue
# Use it.only() in test file
```

### "localStorage is persisting between tests"
```bash
# Check beforeEach hooks are running
npm test -- --reporter=verbose tests/unit/useNodeComments.test.ts

# Manually clear between test runs
# Should be handled by beforeEach, but verify
```

## 📊 Coverage Commands

### Generate Coverage
```bash
# Basic coverage
npm test -- --coverage tests/unit/useNodeComments.test.ts

# Coverage with threshold
npm test -- --coverage --coverage.lines=90 tests/unit/useNodeComments.test.ts

# Coverage for specific files
npm test -- --coverage --coverage.include=src/hooks/useNodeComments.ts
```

### View Coverage
```bash
# Terminal output
npm test -- --coverage

# HTML report
npm test -- --coverage --coverage.reporter=html
open coverage/index.html

# JSON report (for CI)
npm test -- --coverage --coverage.reporter=json
```

## 🏗️ CI/CD Commands

### Pre-commit
```bash
# Run before committing
npm test -- tests/unit/useNodeComments.test.ts && \
npx playwright test comments --reporter=line
```

### CI Pipeline
```bash
# Unit tests with coverage
npm test -- --coverage --reporter=json tests/unit/useNodeComments.test.ts

# E2E tests headless
npx playwright test comments --reporter=json

# Install Playwright browsers (in CI)
npx playwright install --with-deps
```

### Full Suite
```bash
# Run everything
npm test && npm run test:e2e
```

## 🔧 Maintenance Commands

### Update Snapshots (if using)
```bash
# Update all snapshots
npm test -- --update tests/unit/useNodeComments.test.ts
npx playwright test comments --update-snapshots
```

### Clean Test Artifacts
```bash
# Remove test results
rm -rf test-results/
rm -rf playwright-report/

# Remove coverage
rm -rf coverage/

# Remove all test artifacts
rm -rf test-results/ playwright-report/ coverage/
```

### Lint Tests
```bash
# Lint test files
npm run lint tests/unit/useNodeComments.test.ts
npm run lint tests/e2e/comments.spec.ts
```

## 💡 Pro Tips

### Use Test Aliases (add to package.json)
```json
{
  "scripts": {
    "test:comments": "npm test -- tests/unit/useNodeComments.test.ts",
    "test:comments:e2e": "npx playwright test comments",
    "test:comments:all": "npm run test:comments && npm run test:comments:e2e",
    "test:comments:watch": "npm test -- --watch tests/unit/useNodeComments.test.ts",
    "test:comments:debug": "npx playwright test comments --ui"
  }
}
```

Then run:
```bash
npm run test:comments
npm run test:comments:e2e
npm run test:comments:all
npm run test:comments:watch
npm run test:comments:debug
```

### Use Environment Variables
```bash
# Run with specific Supabase URL (if needed)
VITE_SUPABASE_URL=http://localhost:54321 npm test -- tests/unit/useNodeComments.test.ts

# Run in CI mode
CI=true npx playwright test comments

# Debug mode
DEBUG=pw:api npx playwright test comments
```

### Focused Testing During Development
```bash
# In one terminal: watch unit tests
npm test -- --watch tests/unit/useNodeComments.test.ts

# In another terminal: run e2e in UI mode
npx playwright test comments --ui

# In VS Code: Use Test Explorer extension
# Install: ms-playwright.playwright
```

## 📝 Test File Locations

```
tests/
├── unit/
│   └── useNodeComments.test.ts          ← Unit tests
├── e2e/
│   └── comments.spec.ts                 ← E2E tests
├── COMMENTS_TESTS_README.md             ← Full documentation
├── COMMENTS_TESTS_SUMMARY.md            ← Quick overview
├── COMMENTS_COVERAGE_MAP.md             ← Coverage details
└── COMMENTS_TEST_COMMANDS.md            ← This file
```

## 🆘 Help & Resources

```bash
# Vitest help
npm test -- --help

# Playwright help
npx playwright test --help

# Show available reporters
npx playwright test --help | grep reporter

# Show available projects
npx playwright test --list
```

### Documentation Links
- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- Testing Library: https://testing-library.com/
- Project README: /tests/COMMENTS_TESTS_README.md

---

**Quick Reference Card** - Save this file for easy access to all test commands!
