# Comments and Moderation Tests

This document describes the comprehensive test suite for the comments and moderation features of the ML System Design Interview tool.

## Test Files Created

### 1. Unit Tests: `/tests/unit/useNodeComments.test.ts`

Tests the `useNodeComments` hook logic in isolation with mocked Supabase dependencies.

**Test Coverage:**

- **Initialization**
  - Hook initializes with empty comments array
  - Doesn't fetch if problemId or nodeId is missing

- **Loading Comments**
  - Successfully loads comments from Supabase
  - Nests replies correctly under parent comments
  - Handles multiple levels of threading

- **Adding Comments**
  - Adds comments optimistically to state
  - Adds replies optimistically under parent comment
  - Generates unique IDs for new comments
  - Sets correct timestamps for new comments
  - Handles different comment types (suggestion, question, feedback)

- **Fallback Behavior**
  - Falls back to localStorage when Supabase is unavailable
  - Stores comment to localStorage when Supabase insert fails

- **Refetching**
  - Refetches comments when refetch is called
  - Updates state with new data

**Running Unit Tests:**

```bash
# Run all unit tests
npm test

# Run only the useNodeComments tests
npm test -- tests/unit/useNodeComments.test.ts

# Run with coverage
npm test -- --coverage tests/unit/useNodeComments.test.ts

# Watch mode during development
npm test -- --watch tests/unit/useNodeComments.test.ts
```

### 2. E2E Tests: `/tests/e2e/comments.spec.ts`

Tests the full comments feature from the user's perspective using Playwright.

**Test Coverage:**

- **UI Visibility**
  - Shows comments toggle on each node
  - Expands/collapses comments section
  - Shows comment count in toggle button

- **Comment Form**
  - Opens comment form when Add Comment is clicked
  - Displays all form fields (name input, type selector, textarea)
  - Cancels form properly
  - Clears textarea after successful submission
  - Persists author name across submissions

- **Comment Submission**
  - Submits a comment successfully
  - Displays comment with correct type badge
  - Uses "Anonymous" if name is not provided
  - Supports different comment types (suggestion, question, feedback)
  - Shows multiple comments

- **Form Validation**
  - Disables submit button when content is empty
  - Enables submit button when content is added

- **Reply Functionality**
  - Shows reply button on comments
  - Opens reply form when Reply is clicked
  - Submits a reply to a comment
  - Displays "Replying to comment" indicator
  - Cancels reply and returns to normal comment form

**Running E2E Tests:**

```bash
# Run all e2e tests
npm run test:e2e

# Run only the comments tests
npx playwright test comments

# Run in headed mode (see browser)
npx playwright test comments --headed

# Run in UI mode (interactive)
npx playwright test comments --ui

# Debug mode
npx playwright test comments --debug

# Run specific test
npx playwright test comments -g "should submit a comment"
```

## Test Architecture

### Unit Test Architecture

The unit tests use **Vitest** with the following setup:

1. **Mock Strategy**: Uses `vi.hoisted()` to create mock functions before module imports to avoid Temporal Dead Zone issues
2. **Supabase Mocking**: Mocks the entire Supabase client with chainable methods
3. **localStorage**: Uses the jsdom environment's localStorage implementation
4. **React Testing**: Uses `@testing-library/react` hooks for testing React hooks

**Key Testing Patterns:**

```typescript
// Mocking Supabase responses
mockOrder.mockResolvedValue({ data: mockComments, error: null });

// Testing hook behavior
const { result } = renderHook(() => useNodeComments(problemId, nodeId));

// Waiting for async operations
await waitFor(() => {
  expect(result.current.loading).toBe(false);
});

// Testing state updates
await act(async () => {
  await result.current.addComment('content', 'author', 'suggestion');
});
```

### E2E Test Architecture

The E2E tests use **Playwright** with the following patterns:

1. **Robust Selectors**: Uses semantic selectors (text, role) over brittle CSS selectors
2. **Wait Strategies**: Implements appropriate waits for animations and network requests
3. **Fallback Checks**: Uses try-catch patterns for optional UI elements
4. **Isolation**: Clears localStorage before each test for clean state

**Key Testing Patterns:**

```typescript
// Waiting for elements with timeout
await expect(element).toBeVisible({ timeout: 5000 });

// Fallback for optional elements
const hasElement = await element.isVisible({ timeout: 2000 }).catch(() => false);

// Wait for animations
await page.waitForTimeout(300);

// Clear state before tests
await page.evaluate(() => localStorage.clear());
```

## Test Data Structures

### Mock Comment Structure

```typescript
const mockComment: NodeComment = {
  id: 'comment-1',
  problem_id: 'test-problem-1',
  node_id: 'test-node-1',
  author_name: 'John Doe',
  content: 'This is a suggestion',
  comment_type: 'suggestion', // 'suggestion' | 'question' | 'feedback' | 'answer'
  status: 'approved', // 'pending' | 'approved' | 'answered' | 'rejected'
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  replies: [], // Optional array of child comments
};
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Tips

### Unit Tests

1. **Isolate a test**: Use `it.only()` to run a single test
2. **Skip a test**: Use `it.skip()` to skip failing tests temporarily
3. **Console logging**: Add `console.log(result.current.comments)` to inspect state
4. **Mock inspection**: Use `expect(mockSelect).toHaveBeenCalledWith(...)` to verify mock calls

### E2E Tests

1. **Headed mode**: Run with `--headed` to see the browser
2. **UI mode**: Use `--ui` for interactive debugging
3. **Debug mode**: Use `--debug` to step through tests
4. **Screenshots**: Automatically captured on failure in `test-results/`
5. **Trace viewer**: View traces with `npx playwright show-trace trace.zip`

## Coverage Goals

The test suite aims for:

- **Unit Tests**: 90%+ code coverage for the hook
- **E2E Tests**: Cover all critical user flows
- **Integration**: Test localStorage fallback scenarios
- **Edge Cases**: Empty states, validation, error handling

## Maintenance

### Adding New Tests

1. **Unit Tests**: Add to `/tests/unit/useNodeComments.test.ts`
2. **E2E Tests**: Add to `/tests/e2e/comments.spec.ts`
3. **Follow existing patterns**: Use similar naming and structure
4. **Update this README**: Document new test coverage

### Common Issues

**Issue**: Tests fail with "Element not visible"
- **Solution**: Increase timeout or add `waitForTimeout()` for animations

**Issue**: Supabase mock not working
- **Solution**: Ensure mocks are defined with `vi.hoisted()` before imports

**Issue**: localStorage not persisting
- **Solution**: Check that `beforeEach` is properly clearing state

**Issue**: Flaky E2E tests
- **Solution**: Add explicit waits, avoid `waitForTimeout()` in favor of `waitFor()` when possible

## Future Enhancements

Potential test additions:

1. **Moderation Features**: When moderation UI is added
   - Approve/reject comments
   - Change comment status
   - Moderate replies

2. **Advanced Features**
   - Edit comments
   - Delete comments
   - Upvote/downvote
   - Mark answers as accepted

3. **Performance Tests**
   - Load time with many comments
   - Scroll performance
   - Memory leaks

4. **Accessibility Tests**
   - Keyboard navigation
   - Screen reader compatibility
   - ARIA labels

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
