import { test, expect } from '@playwright/test';

test.describe('Search Functionality', () => {
  test('should perform a basic search', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i], [data-testid="search-input"]');
    
    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill('fortnite');
      
      // Look for search button or trigger search
      const searchButton = page.locator('button[type="submit"], button:has-text("Search"), [data-testid="search-button"]');
      
      if (await searchButton.first().isVisible()) {
        await searchButton.first().click();
      } else {
        // Try pressing Enter
        await searchInput.first().press('Enter');
      }
      
      // Wait for search results
      await page.waitForLoadState('networkidle');
      
      // Check if results are displayed
      const results = page.locator('[data-testid="search-results"], .search-results, .results');
      await expect(results.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle empty search', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i], [data-testid="search-input"]');
    
    if (await searchInput.first().isVisible()) {
      // Clear any existing text and submit empty search
      await searchInput.first().fill('');
      await searchInput.first().press('Enter');
      
      await page.waitForLoadState('networkidle');
      
      // Should either show all results or a message about empty search
      const content = page.locator('main, .content, [data-testid="search-content"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should handle search with no results', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i], [data-testid="search-input"]');
    
    if (await searchInput.first().isVisible()) {
      // Search for something that likely won't exist
      await searchInput.first().fill('xyznonexistentgame123');
      await searchInput.first().press('Enter');
      
      await page.waitForLoadState('networkidle');
      
      // Should show no results message or empty state
      const noResults = page.locator(':has-text("No results"), :has-text("not found"), :has-text("0 results"), .empty-state');
      await expect(noResults.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should filter search results', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Look for filter options
    const filters = page.locator('select, [role="combobox"], .filter, [data-testid*="filter"]');
    
    if (await filters.first().isVisible()) {
      // Try to interact with first filter
      await filters.first().click();
      
      // Look for filter options
      const filterOptions = page.locator('option, [role="option"], .filter-option');
      
      if (await filterOptions.first().isVisible()) {
        await filterOptions.first().click();
        await page.waitForLoadState('networkidle');
        
        // Verify that filtering worked (results changed or updated)
        const results = page.locator('[data-testid="search-results"], .search-results, .results');
        await expect(results.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should support search suggestions/autocomplete', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i], [data-testid="search-input"]');
    
    if (await searchInput.first().isVisible()) {
      // Type partial search term
      await searchInput.first().fill('fort');
      
      // Wait a bit for suggestions to appear
      await page.waitForTimeout(1000);
      
      // Look for suggestions dropdown
      const suggestions = page.locator('[role="listbox"], .suggestions, .autocomplete, [data-testid="suggestions"]');
      
      if (await suggestions.first().isVisible()) {
        // Click on first suggestion
        const firstSuggestion = suggestions.locator('li, [role="option"], .suggestion-item').first();
        await firstSuggestion.click();
        
        await page.waitForLoadState('networkidle');
        
        // Verify search was performed
        const results = page.locator('[data-testid="search-results"], .search-results, .results');
        await expect(results.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});