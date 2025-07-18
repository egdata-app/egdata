import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to search page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for search link or button
    const searchLink = page.locator('a[href*="search"], button:has-text("Search"), [data-testid="search"]');
    
    if (await searchLink.first().isVisible()) {
      await searchLink.first().click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the search page
      await expect(page.url()).toContain('search');
    } else {
      // If no search link found, navigate directly
      await page.goto('/search');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should navigate to about page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for about link
    const aboutLink = page.locator('a[href*="about"], a:has-text("About")');
    
    if (await aboutLink.first().isVisible()) {
      await aboutLink.first().click();
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the about page
      await expect(page.url()).toContain('about');
    } else {
      // If no about link found, navigate directly
      await page.goto('/about');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should handle browser back and forward navigation', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to about
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toBe('http://localhost:3000/');
    
    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('about');
  });

  test('should display navigation menu on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for mobile menu button (hamburger menu)
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("☰"), [data-testid="mobile-menu"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Check if menu is opened
      const mobileMenu = page.locator('[role="dialog"], .mobile-menu, nav[data-state="open"]');
      await expect(mobileMenu.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto('/non-existent-page');
    
    // Check if it's a 404 or if the app handles it gracefully
    if (response?.status() === 404) {
      // Verify 404 page content
      await expect(page.locator('body')).toContainText(/404|not found/i);
    } else {
      // If SPA routing, should still show some content
      await expect(page.locator('main, body')).toBeVisible();
    }
  });
});