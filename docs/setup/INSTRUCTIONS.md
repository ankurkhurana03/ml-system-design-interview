# Setup Instructions

Complete these steps to finalize the development environment setup.

## 1. Initialize Git Repository

If Git is not already initialized:

```bash
cd /Users/ankur/Downloads/ml_sys_design
git init
```

## 2. Set Up Husky

Initialize Husky for Git hooks:

```bash
npx husky init
```

This will create the `.husky` directory and set up the pre-commit hook.

## 3. Make Pre-commit Hook Executable

Ensure the pre-commit hook has execute permissions:

```bash
chmod +x .husky/pre-commit
```

## 4. Install Playwright

Install Playwright browsers for E2E testing:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## 5. Verify Setup

Run the following commands to verify everything is working:

```bash
# Check TypeScript types
npm run type-check

# Run linting
npm run lint

# Check formatting
npm run format:check

# Run unit tests
npm run test:run

# Build the project
npm run build
```

## 6. Test Pre-commit Hook

Create a test commit to verify the pre-commit hook is working:

```bash
# Stage all files
git add .

# Try to commit (pre-commit hook will run automatically)
git commit -m "Initial setup"
```

The pre-commit hook should:
- Run ESLint on TypeScript files
- Format code with Prettier
- Only process staged files

## 7. Optional: Run E2E Tests

To test E2E functionality:

```bash
# Start dev server in one terminal
npm run dev

# In another terminal, run E2E tests
npm run test:e2e
```

Or use the built-in webServer feature:

```bash
# This will start the dev server automatically
npm run test:e2e
```

## Troubleshooting

### If Husky doesn't work:

```bash
# Remove and reinstall Husky
rm -rf .husky
npm uninstall husky
npm install -D husky
npx husky init
chmod +x .husky/pre-commit
```

### If Playwright fails:

```bash
# Reinstall Playwright
npx playwright install --force chromium
```

### If ESLint shows errors about missing types:

The project uses TypeScript's project service for type-aware linting. Make sure:
1. All TypeScript files are saved
2. Run `npm run type-check` first
3. Restart your editor/IDE

### If lint-staged doesn't run:

Check that the hook file exists and is executable:

```bash
ls -la .husky/pre-commit
# Should show: -rwxr-xr-x (executable)

# If not executable:
chmod +x .husky/pre-commit
```

## What's Been Set Up

All configuration files have been created:

- ✅ `.prettierrc` - Prettier configuration
- ✅ `.prettierignore` - Prettier ignore rules
- ✅ `eslint.config.js` - ESLint configuration (updated)
- ✅ `vite.config.ts` - Vite + Vitest configuration (updated)
- ✅ `playwright.config.ts` - Playwright configuration
- ✅ `tsconfig.app.json` - TypeScript config (updated with test types)
- ✅ `package.json` - Scripts and lint-staged config (updated)
- ✅ `src/test/setup.ts` - Vitest setup file
- ✅ `.husky/pre-commit` - Pre-commit hook
- ✅ `tests/unit/` - Unit tests directory
- ✅ `tests/e2e/` - E2E tests directory
- ✅ Sample test files for demonstration

## Next Steps

1. Run the commands above to complete the setup
2. Start developing with `npm run dev`
3. Write tests for your components
4. Commit changes - the pre-commit hook will ensure code quality
5. Review `DEVELOPMENT.md` for detailed development guidelines
