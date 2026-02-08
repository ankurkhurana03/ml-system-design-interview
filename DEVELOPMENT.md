# Development Setup

This document describes the development standards and tooling for the ML System Design Interview project.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **Vitest** - Unit testing
- **Playwright** - E2E testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit file linting

## Installation

```bash
npm install
```

## Running the Project

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Code Quality

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting without modifying files
npm run format:check
```

### Type Checking

```bash
# Run TypeScript type checking
npm run type-check
```

## Testing

### Unit Tests (Vitest)

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e
```

## Git Hooks

This project uses Husky for Git hooks. The following hooks are configured:

### Pre-commit Hook

Automatically runs on `git commit`:
- Lints and formats staged TypeScript/TSX files
- Formats staged JSON, CSS, and Markdown files

The pre-commit hook uses `lint-staged` to only process staged files.

## Initial Setup (First Time Only)

After cloning the repository, run these commands:

```bash
# Install dependencies
npm install

# Initialize Git (if not already initialized)
git init

# Initialize Husky
npx husky init

# Install Playwright browsers
npx playwright install chromium
```

## ESLint Configuration

The project uses a comprehensive ESLint configuration with:

- **TypeScript strict type checking** - Enforces type safety
- **React Hooks rules** - Ensures proper hook usage
- **Import ordering** - Automatic import organization
- **No unused variables** - Enforces clean code (allows underscore prefix for intentionally unused params)
- **Consistent type imports** - Prefers `import type` for type-only imports
- **Console warnings** - Warns about `console.log` (allows `console.warn` and `console.error`)
- **Prettier integration** - Disables formatting rules that conflict with Prettier

## Prettier Configuration

Code is formatted with the following settings:

- Semicolons: Yes
- Trailing commas: All
- Single quotes: Yes
- Print width: 100 characters
- Tab width: 2 spaces
- Spaces (not tabs)
- Bracket spacing: Yes
- Arrow function parens: Always
- Line endings: LF

## Project Structure

```
ml-sys-design/
├── src/
│   ├── components/         # React components
│   ├── test/              # Test setup files
│   │   └── setup.ts       # Vitest setup
│   └── ...
├── tests/
│   ├── unit/              # Unit tests
│   └── e2e/               # E2E tests
├── .husky/                # Git hooks
│   └── pre-commit         # Pre-commit hook
├── eslint.config.js       # ESLint configuration
├── playwright.config.ts   # Playwright configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite & Vitest configuration
├── .prettierrc            # Prettier configuration
└── .prettierignore        # Prettier ignore rules
```

## Writing Tests

### Unit Test Example (Vitest + React Testing Library)

```typescript
// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test Example (Playwright)

```typescript
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/ML System Design/);
  await expect(page.locator('h1')).toBeVisible();
});
```

## Best Practices

1. **Always run type checking before committing**: `npm run type-check`
2. **Write tests for new features**: Unit tests for components, E2E tests for critical user flows
3. **Use type imports**: Prefer `import type { Foo } from './foo'` for type-only imports
4. **Avoid console.log**: Use proper debugging tools or logging libraries
5. **Name unused parameters with underscore**: `const Component = ({ _unusedProp, usedProp }) => ...`
6. **Keep components small and focused**: Easier to test and maintain
7. **Use meaningful commit messages**: Pre-commit hooks will ensure code quality

## Troubleshooting

### Pre-commit hook not running

```bash
# Reinstall Husky
rm -rf .husky
npx husky init
```

### ESLint errors about missing types

```bash
# Ensure TypeScript project is configured
npm run type-check
```

### Playwright installation issues

```bash
# Reinstall Playwright browsers
npx playwright install --force chromium
```

## CI/CD Integration

All the scripts in this setup are CI-friendly:

```bash
# Typical CI pipeline
npm ci                    # Clean install
npm run type-check        # Type checking
npm run lint              # Linting
npm run format:check      # Format checking
npm run test:run          # Unit tests
npm run build             # Build
npm run test:e2e          # E2E tests
```
