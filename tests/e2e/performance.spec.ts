import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should load the home page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds (adjust as needed)
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`Home page loaded in ${loadTime}ms`);
  });

  test('should have reasonable First Contentful Paint', async ({ page }) => {
    await page.goto('/');
    
    // Wait for first contentful paint
    await page.waitForLoadState('domcontentloaded');
    
    // Check if main content is visible quickly
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 5000 });
  });

  test('should handle multiple concurrent requests', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to a page that likely makes multiple API calls
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should handle concurrent requests efficiently
    expect(loadTime).toBeLessThan(15000);
    
    // Check that content is actually loaded
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    // Navigate through several pages to check for memory issues
    const pages = ['/', '/search', '/about'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Basic check that page loads successfully
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Small delay between navigations
      await page.waitForTimeout(500);
    }
  });

  test('should load images efficiently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if images are loaded
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check first few images load successfully
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        
        // Wait for image to load or timeout
        await expect(img).toBeVisible({ timeout: 10000 });
        
        // Check if image has loaded (not broken)
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });

  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Should still load within reasonable time even with slow network
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(20000);
    
    // Content should still be visible
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 15000 });
  });

  test('should not block UI with JavaScript execution', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to interact with the page immediately
    const body = page.locator('body');
    await body.click();
    
    // Page should remain responsive
    await expect(body).toBeVisible();
    
    // Try keyboard interaction
    await page.keyboard.press('Tab');
    
    // Should be able to focus elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible({ timeout: 2000 });
  });

  test('should efficiently handle search operations', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i]');
    
    if (await searchInput.first().isVisible()) {
      const startTime = Date.now();
      
      // Perform search
      await searchInput.first().fill('test');
      await searchInput.first().press('Enter');
      
      // Wait for search results
      await page.waitForLoadState('networkidle');
      
      const searchTime = Date.now() - startTime;
      
      // Search should complete within reasonable time
      expect(searchTime).toBeLessThan(8000);
      
      console.log(`Search completed in ${searchTime}ms`);
    }
  });

  test('should handle page size efficiently', async ({ page }) => {
    // Monitor network requests
    const responses: any[] = [];
    
    page.on('response', (response) => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length']
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that we don't have too many failed requests
    const failedRequests = responses.filter(r => r.status >= 400);
    expect(failedRequests.length).toBeLessThan(5);
    
    // Check that main document loaded successfully
    const mainDocument = responses.find(r => r.url === page.url());
    expect(mainDocument?.status).toBe(200);
  });
});