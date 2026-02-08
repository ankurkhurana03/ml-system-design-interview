# Setup TODO - Manual Steps Required

## Quick Start - Copy and Paste These Commands

Run these commands in order to complete the setup:

```bash
# Navigate to project directory
cd /Users/ankur/Downloads/ml_sys_design

# Initialize Git (if not already done)
git init

# Initialize Husky for Git hooks
npx husky init

# Make pre-commit hook executable
chmod +x .husky/pre-commit

# Install Playwright and browsers
npm install -D @playwright/test
npx playwright install chromium

# Verify everything works
npm run type-check
npm run lint
npm run format:check
npm run test:run
npm run build

# Test pre-commit hook (optional)
git add .
git commit -m "chore: setup development environment with linting, formatting, and testing"
```

## Detailed Checklist

- [ ] **Step 1: Initialize Git**
  ```bash
  cd /Users/ankur/Downloads/ml_sys_design
  git init
  ```
  - Skip if Git is already initialized
  - Verify: `ls -la .git` should show `.git` directory

- [ ] **Step 2: Initialize Husky**
  ```bash
  npx husky init
  ```
  - Creates `.husky/_` directory
  - Sets up Git hooks infrastructure
  - Verify: `ls -la .husky/_` should show husky files

- [ ] **Step 3: Make pre-commit hook executable**
  ```bash
  chmod +x .husky/pre-commit
  ```
  - Ensures the hook can run
  - Verify: `ls -la .husky/pre-commit` should show `-rwxr-xr-x`

- [ ] **Step 4: Install Playwright**
  ```bash
  npm install -D @playwright/test
  npx playwright install chromium
  ```
  - Installs Playwright testing framework
  - Downloads Chromium browser for testing
  - This may take a few minutes

- [ ] **Step 5: Verify TypeScript**
  ```bash
  npm run type-check
  ```
  - Should complete without errors
  - If errors occur, fix them before proceeding

- [ ] **Step 6: Verify ESLint**
  ```bash
  npm run lint
  ```
  - May show warnings or errors
  - Run `npm run lint:fix` to auto-fix
  - Fix any remaining issues manually

- [ ] **Step 7: Verify Prettier**
  ```bash
  npm run format:check
  ```
  - Checks if all files are formatted
  - Run `npm run format` to format all files
  - Verify again with `npm run format:check`

- [ ] **Step 8: Verify Unit Tests**
  ```bash
  npm run test:run
  ```
  - Should run sample tests successfully
  - All tests should pass

- [ ] **Step 9: Verify Build**
  ```bash
  npm run build
  ```
  - Should build without errors
  - Creates `dist/` directory

- [ ] **Step 10: Test Pre-commit Hook**
  ```bash
  git add .
  git commit -m "chore: setup development environment"
  ```
  - Pre-commit hook should run automatically
  - ESLint and Prettier should process staged files
  - Commit should succeed if no errors

- [ ] **Step 11: Test E2E (Optional)**
  ```bash
  npm run test:e2e
  ```
  - Runs sample E2E tests
  - Opens Playwright test runner
  - Tests should pass

## Expected Results

### After Step 5 (type-check)
```
✓ TypeScript compilation completed successfully
```

### After Step 6 (lint)
```
✓ ESLint completed with no errors
```
or
```
⚠ ESLint found issues (fixable with --fix)
```

### After Step 8 (test:run)
```
✓ tests/unit/sample.test.ts (4)
  ✓ Sample Test Suite (4)
    ✓ should pass a basic test
    ✓ should handle string operations
    ✓ should work with arrays
    ✓ should handle async operations

Test Files  1 passed (1)
Tests  4 passed (4)
```

### After Step 10 (commit)
```
✔ Preparing lint-staged...
✔ Running tasks for staged files...
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
[main abc1234] chore: setup development environment
 XX files changed, XXX insertions(+), XXX deletions(-)
```

## Troubleshooting

### If Git init fails with "Initialized empty Git repository"
- This is actually success! Continue to next step.

### If Husky init fails
```bash
rm -rf .husky
npm uninstall husky
npm install -D husky
npx husky init
```

### If Playwright install fails
```bash
npx playwright install --force chromium
```

### If ESLint shows many errors
```bash
npm run lint:fix
npm run format
```

### If pre-commit hook doesn't run
```bash
chmod +x .husky/pre-commit
cat .husky/pre-commit  # Verify content
git config core.hooksPath  # Should show .husky
```

### If TypeScript errors occur
- Review the errors
- Fix type issues in your code
- Run `npm run type-check` again

## After Setup

Once all steps are complete:

1. ✅ Read `DEVELOPMENT.md` for guidelines
2. ✅ Bookmark `QUICK_REFERENCE.md` for commands
3. ✅ Start developing: `npm run dev`
4. ✅ Write tests for new features
5. ✅ Commit frequently - hooks ensure quality

## Quick Commands Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production

# Code Quality
npm run lint:fix     # Fix linting issues
npm run format       # Format all files
npm run type-check   # Check types

# Testing
npm test            # Run tests in watch mode
npm run test:run    # Run tests once
npm run test:e2e    # Run E2E tests

# All checks at once
npm run type-check && npm run lint && npm run format:check && npm run test:run
```

## Notes

- Pre-commit hook only runs on `git commit`, not on `git add`
- You can skip the hook with `git commit --no-verify` (not recommended)
- ESLint and Prettier run automatically on save if you use VSCode with recommended extensions
- Tests run in watch mode by default with `npm test`
- E2E tests start the dev server automatically

---

**Start here:** Run the commands in the "Quick Start" section at the top.
