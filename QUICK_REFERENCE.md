# Quick Reference - Development Commands

## Essential Commands

### Development
```bash
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production
npm run preview          # Preview production build
```

### Code Quality
```bash
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors automatically
npm run format           # Format all files with Prettier
npm run format:check     # Check formatting without changes
npm run type-check       # Run TypeScript type checking
```

### Testing
```bash
npm test                 # Run unit tests in watch mode
npm run test:run         # Run unit tests once
npm run test:ui          # Run tests with UI
npm run test:e2e         # Run E2E tests
```

## Git Workflow

### Standard Commit
```bash
git add .
git commit -m "Your message"  # Pre-commit hook runs automatically
```

### Skip Pre-commit Hook (Not Recommended)
```bash
git commit --no-verify -m "Your message"
```

## Common Issues

### Fix All Code Quality Issues
```bash
npm run lint:fix && npm run format
```

### Pre-commit Hook Failing
1. Run `npm run lint:fix`
2. Run `npm run format`
3. Run `npm run type-check`
4. Fix any remaining errors manually
5. Try committing again

### Reinstall Husky
```bash
rm -rf .husky
npx husky init
chmod +x .husky/pre-commit
```

## File Structure

```
src/
├── components/         # React components
│   ├── auth/          # Authentication components
│   ├── generator/     # Generator components
│   ├── graph/         # Graph visualization
│   ├── layout/        # Layout components
│   ├── transcript/    # Transcript components
│   └── wizard/        # Wizard components
├── test/              # Test setup files
└── ...

tests/
├── unit/              # Unit tests
└── e2e/               # E2E tests
```

## Code Style Guidelines

### TypeScript
```typescript
// ✅ Good - Use type imports
import type { User } from './types';
import { getUser } from './api';

// ❌ Bad - Mixed imports
import { User, getUser } from './api';
```

### Unused Variables
```typescript
// ✅ Good - Prefix with underscore
const Component = ({ _unusedProp, usedProp }) => {
  return <div>{usedProp}</div>;
};

// ❌ Bad - ESLint error
const Component = ({ unusedProp, usedProp }) => {
  return <div>{usedProp}</div>;
};
```

### Console Usage
```typescript
// ✅ Good - Use for errors/warnings
console.error('Error occurred:', error);
console.warn('Deprecation warning');

// ⚠️ Warning - Will trigger ESLint warning
console.log('Debug info');

// ✅ Better - Remove before committing
// console.log('Debug info');
```

### Import Order
Imports are automatically organized by ESLint:
1. Built-in modules (Node.js)
2. External packages (npm)
3. Internal modules (project files)
4. Parent/sibling imports
5. Index imports
6. Type imports

## ESLint Rules Summary

| Rule | Setting | Purpose |
|------|---------|---------|
| `@typescript-eslint/no-unused-vars` | error | No unused variables (allow `_` prefix) |
| `@typescript-eslint/consistent-type-imports` | error | Prefer `import type` |
| `import/order` | error | Auto-organize imports |
| `no-console` | warn | Avoid console.log (allow warn/error) |
| React Hooks | error | Enforce hooks rules |

## Prettier Settings

- Semicolons: Yes
- Single Quotes: Yes
- Trailing Commas: All
- Print Width: 100
- Tab Width: 2 spaces
- Arrow Parens: Always

## Testing Patterns

### Unit Test
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Component from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Test
```typescript
import { test, expect } from '@playwright/test';

test('user flow', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/App/);
});
```

## VSCode Setup (Recommended)

Install these extensions:
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- Playwright Test (`ms-playwright.playwright`)
- Vitest (`vitest.explorer`)

## CI/CD Pipeline Example

```bash
npm ci                    # Clean install
npm run type-check        # Type checking
npm run lint              # Linting
npm run format:check      # Format checking
npm run test:run          # Unit tests
npm run build             # Build
npm run test:e2e          # E2E tests
```

## Need Help?

- Full documentation: `DEVELOPMENT.md`
- Setup instructions: `SETUP_INSTRUCTIONS.md`
- Report issues: Create a GitHub issue
