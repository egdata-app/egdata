import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper page titles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if page has a title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for h1 element
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    
    // Should have at least one h1, but not more than one per page is recommended
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check if headings exist
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check first few images for alt text
      const imagesToCheck = Math.min(imageCount, 5);
      
      for (let i = 0; i < imagesToCheck; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        
        // Alt attribute should exist (can be empty for decorative images)
        expect(alt).not.toBeNull();
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Start keyboard navigation
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible({ timeout: 5000 });
    
    // Continue tabbing through a few elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100); // Small delay between tabs
    }
    
    // Should still have a focused element
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    
    // Check for form inputs
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        // Input should have some form of labeling
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          
          const hasAccessibleName = hasLabel || ariaLabel || ariaLabelledBy;
          expect(hasAccessibleName).toBeTruthy();
        } else {
          // If no id, should have aria-label or aria-labelledby
          expect(ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    }
  });

  test('should have proper button accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        
        // Button should have accessible text or aria-label
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledBy = await button.getAttribute('aria-labelledby');
        
        const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || ariaLabelledBy;
        expect(hasAccessibleName).toBeTruthy();
      }
    }
  });

  test('should have proper color contrast (basic check)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if text is visible (basic contrast check)
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, div').filter({ hasText: /.+/ });
    const textCount = await textElements.count();
    
    if (textCount > 0) {
      // Check first few text elements are visible
      for (let i = 0; i < Math.min(textCount, 5); i++) {
        const element = textElements.nth(i);
        await expect(element).toBeVisible();
      }
    }
  });

  test('should support screen reader navigation landmarks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for semantic landmarks
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();
    
    // Check for navigation
    const nav = page.locator('nav, [role="navigation"]');
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible();
    }
    
    // Check for header
    const header = page.locator('header, [role="banner"]');
    if (await header.count() > 0) {
      await expect(header.first()).toBeVisible();
    }
  });
});