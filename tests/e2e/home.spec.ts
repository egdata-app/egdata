import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the main content is visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display featured discounts section', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check if featured discounts section exists
    // This might need adjustment based on actual DOM structure
    const featuredSection = page.locator('[data-testid="featured-discounts"], section:has-text("Featured"), section:has-text("Discount")');
    await expect(featuredSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display latest offers section', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check if latest offers section exists
    const latestSection = page.locator('#latest-games, section:has-text("Latest Added")');
    await expect(latestSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display giveaways section', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check if giveaways section exists
    const giveawaysSection = page.locator('[data-testid="giveaways"], section:has-text("Free"), section:has-text("Giveaway")');
    await expect(giveawaysSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if navigation elements exist
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible({ timeout: 5000 });
  });
});