# E2E Testing with Playwright

This directory contains end-to-end tests for the EGData application using Playwright.

## Setup

The e2e testing setup is already configured. To get started:

1. Install dependencies (if not already done):
   ```bash
   pnpm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Running Tests

### Basic Commands

- **Run all e2e tests:**
  ```bash
  pnpm test:e2e
  ```

- **Run tests with UI mode (interactive):**
  ```bash
  pnpm test:e2e:ui
  ```

- **Run tests in headed mode (see browser):**
  ```bash
  pnpm test:e2e:headed
  ```

- **Debug tests:**
  ```bash
  pnpm test:e2e:debug
  ```

- **View test report:**
  ```bash
  pnpm test:e2e:report
  ```

### Advanced Commands

- **Run specific test file:**
  ```bash
  npx playwright test tests/e2e/home.spec.ts
  ```

- **Run tests on specific browser:**
  ```bash
  npx playwright test --project=chromium
  npx playwright test --project=firefox
  npx playwright test --project=webkit
  ```

- **Run tests with specific tag:**
  ```bash
  npx playwright test --grep "@smoke"
  ```

## Test Structure

The tests are organized into the following categories:

### `home.spec.ts`
- Tests for the main landing page
- Verifies core sections load correctly
- Checks responsive design
- Tests basic navigation

### `navigation.spec.ts`
- Tests navigation between pages
- Verifies browser back/forward functionality
- Tests mobile menu functionality
- Handles 404 pages

### `search.spec.ts`
- Tests search functionality
- Verifies search results display
- Tests search filters
- Checks autocomplete/suggestions

### `accessibility.spec.ts`
- Tests keyboard navigation
- Verifies proper heading structure
- Checks alt text for images
- Tests form labels and ARIA attributes
- Validates semantic landmarks

### `performance.spec.ts`
- Tests page load times
- Verifies efficient image loading
- Tests under slow network conditions
- Monitors for memory leaks

## Configuration

The Playwright configuration is in `playwright.config.ts` at the project root. Key settings:

- **Base URL:** `http://localhost:3000`
- **Test Directory:** `./tests/e2e`
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Auto-start dev server:** Yes (runs `pnpm dev` automatically)
- **Screenshots:** On failure only
- **Videos:** Retained on failure
- **Traces:** On first retry

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Your test code here
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection:
   ```html
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   await page.locator('[data-testid="submit-button"]').click();
   ```

2. **Wait for network idle** before assertions:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Use descriptive test names** that explain what is being tested

4. **Group related tests** using `test.describe()`

5. **Add timeouts** for elements that might take time to load:
   ```typescript
   await expect(element).toBeVisible({ timeout: 10000 });
   ```

6. **Handle dynamic content** gracefully:
   ```typescript
   if (await element.isVisible()) {
     // Test the element
   }
   ```

## CI/CD Integration

E2E tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The GitHub Actions workflow:
- Installs dependencies
- Builds the application
- Runs all e2e tests
- Uploads test reports and artifacts

## Debugging Failed Tests

1. **View the HTML report:**
   ```bash
   pnpm test:e2e:report
   ```

2. **Run in headed mode to see what's happening:**
   ```bash
   pnpm test:e2e:headed
   ```

3. **Use debug mode for step-by-step execution:**
   ```bash
   pnpm test:e2e:debug
   ```

4. **Check screenshots and videos** in the `test-results` directory

5. **Use trace viewer** for detailed execution traces:
   ```bash
   npx playwright show-trace test-results/path-to-trace.zip
   ```

## Environment Variables

You can customize test behavior with environment variables:

- `CI=true` - Enables CI mode (retries, single worker)
- `PLAYWRIGHT_BASE_URL` - Override base URL
- `PLAYWRIGHT_HEADED` - Run in headed mode

## Troubleshooting

### Common Issues

1. **Tests timing out:**
   - Increase timeout in test or config
   - Check if dev server is starting properly
   - Verify network connectivity

2. **Element not found:**
   - Check if selector is correct
   - Wait for element to be visible
   - Use more specific selectors

3. **Flaky tests:**
   - Add proper waits
   - Use `waitForLoadState('networkidle')`
   - Avoid hard-coded delays

### Getting Help

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)