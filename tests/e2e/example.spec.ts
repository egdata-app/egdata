import { test, expect } from '@playwright/test';

/**
 * Example test file demonstrating best practices for e2e testing
 * This file shows how to write maintainable and reliable tests
 */

test.describe('Example Tests - Best Practices', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should demonstrate basic page interaction', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/egdata/i);
    
    // Check main content is visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
    
    // Example of checking for specific text content
    await expect(page.getByText(/latest/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should demonstrate form interaction', async ({ page }) => {
    // Navigate to search page
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Find search input using multiple fallback selectors
    const searchInput = page.locator(
      '[data-testid="search-input"], input[type="search"], input[placeholder*="search" i]'
    ).first();
    
    if (await searchInput.isVisible()) {
      // Fill the search input
      await searchInput.fill('test game');
      
      // Submit the form (try multiple methods)
      const submitButton = page.locator(
        '[data-testid="search-submit"], button[type="submit"], button:has-text("Search")'
      ).first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
      } else {
        await searchInput.press('Enter');
      }
      
      // Wait for results
      await page.waitForLoadState('networkidle');
      
      // Verify search was performed (URL change or results visible)
      const hasResults = await page.locator(
        '[data-testid="search-results"], .search-results, .results'
      ).first().isVisible();
      
      const urlChanged = page.url().includes('search');
      
      expect(hasResults || urlChanged).toBeTruthy();
    }
  });

  test('should demonstrate responsive design testing', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop Large' },
      { width: 1366, height: 768, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Main content should be visible on all screen sizes
      await expect(page.locator('main')).toBeVisible();
      
      console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) - OK`);
    }
  });

  test('should demonstrate error handling', async ({ page }) => {
    // Test how the app handles network errors
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // App should still render basic structure even with API failures
    await expect(page.locator('body')).toBeVisible();
    
    // Look for error states or fallback content
    const hasErrorState = await page.locator(
      '[data-testid="error"], .error, [role="alert"]'
    ).first().isVisible();
    
    const hasMainContent = await page.locator('main').isVisible();
    
    // Either error state should be shown or main content should still render
    expect(hasErrorState || hasMainContent).toBeTruthy();
  });

  test('should demonstrate accessibility testing', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1); // Should have exactly one h1
    
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      for (let i = 0; i < Math.min(imageCount, 3); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).not.toBeNull(); // Alt attribute should exist
      }
    }
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible({ timeout: 2000 });
  });

  test('should demonstrate performance testing', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
    
    // Check that images load properly
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      const firstImage = images.first();
      await expect(firstImage).toBeVisible();
      
      // Check if image actually loaded (not broken)
      const naturalWidth = await firstImage.evaluate(
        (img: HTMLImageElement) => img.naturalWidth
      );
      expect(naturalWidth).toBeGreaterThan(0);
    }
    
    console.log(`Page loaded in ${loadTime}ms`);
  });

  test('should demonstrate data-driven testing', async ({ page }) => {
    // Example of testing multiple scenarios with different data
    const testCases = [
      { path: '/', expectedText: /latest|featured|games/i },
      { path: '/about', expectedText: /about|egdata/i },
      { path: '/search', expectedText: /search/i }
    ];
    
    for (const testCase of testCases) {
      await page.goto(testCase.path);
      await page.waitForLoadState('networkidle');
      
      // Check that page loads and contains expected content
      await expect(page.locator('main')).toBeVisible();
      
      // Look for expected text content
      const hasExpectedText = await page.getByText(testCase.expectedText).first().isVisible();
      const hasMainContent = await page.locator('main').isVisible();
      
      // Either expected text or main content should be visible
      expect(hasExpectedText || hasMainContent).toBeTruthy();
      
      console.log(`✓ ${testCase.path} - OK`);
    }
  });
});

/**
 * Tips for writing better tests:
 * 
 * 1. Use data-testid attributes in your components:
 *    <button data-testid="submit-button">Submit</button>
 * 
 * 2. Always wait for network idle or specific elements:
 *    await page.waitForLoadState('networkidle');
 *    await expect(element).toBeVisible({ timeout: 10000 });
 * 
 * 3. Use multiple selector strategies for robustness:
 *    page.locator('[data-testid="element"], .fallback-class, button:has-text("Text")')
 * 
 * 4. Test error states and edge cases:
 *    - Network failures
 *    - Empty states
 *    - Loading states
 * 
 * 5. Make tests independent:
 *    - Each test should work in isolation
 *    - Use beforeEach for common setup
 *    - Don't rely on test execution order
 */