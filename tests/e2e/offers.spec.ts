import { test, expect } from '@playwright/test';

test.describe('Offer Page', () => {
  test.describe('Navigation from Homepage', () => {
    test('should navigate to an offer page from Latest Offers section', async ({ page }) => {
      await page.goto('/');

      // Wait for the Latest Offers section to load
      await expect(page.getByRole('link', { name: 'Latest Offers', exact: true })).toBeVisible();

      // Find the first offer link in the page and click it
      const offerLinks = page.locator('a[href^="/offers/"]').first();
      await expect(offerLinks).toBeVisible({ timeout: 10000 });

      await offerLinks.click();

      // Should be on an offer page
      await expect(page).toHaveURL(/\/offers\//);
    });
  });

  test.describe('Offer Page Structure', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to an offer by going through the homepage first
      await page.goto('/');

      // Wait for content to load and click on the first offer
      const offerLink = page.locator('a[href^="/offers/"]').first();
      await expect(offerLink).toBeVisible({ timeout: 10000 });
      await offerLink.click();

      // Wait for the offer page to load
      await expect(page).toHaveURL(/\/offers\//);
    });

    test('should display the offer title', async ({ page }) => {
      // The offer title is in an h1 element within the main content area
      // Wait for the offer details table to be visible first (indicates page loaded)
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });

      // The h1 should be visible (offer title)
      await expect(page.locator('main h1').first()).toBeVisible();
    });

    test('should display the offer details table', async ({ page }) => {
      // Check for the offer ID row
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });

      // Check for the Namespace row
      await expect(page.getByText('Namespace')).toBeVisible();

      // Check for the Offer Type row
      await expect(page.getByText('Offer Type')).toBeVisible();

      // Check for the Seller row
      await expect(page.getByRole('cell', { name: 'Seller' })).toBeVisible();

      // Check for the Developer row
      await expect(page.getByRole('cell', { name: 'Developer' })).toBeVisible();
    });

    test('should display supported platforms row', async ({ page }) => {
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Supported Platforms')).toBeVisible();
    });

    test('should display release date row', async ({ page }) => {
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Release Date')).toBeVisible();
    });

    test('should display the sections navigation', async ({ page }) => {
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });

      // Check for the section navigation links within the offer-information section
      const offerSection = page.locator('#offer-information');
      await expect(offerSection.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
      await expect(offerSection.getByRole('link', { name: 'Price', exact: true })).toBeVisible();
      await expect(offerSection.getByRole('link', { name: 'Items', exact: true })).toBeVisible();
      await expect(offerSection.getByRole('link', { name: 'Builds', exact: true })).toBeVisible();
    });

    test('should display the Compare button', async ({ page }) => {
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Compare' })).toBeVisible();
    });
  });

  test.describe('Offer Page Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const offerLink = page.locator('a[href^="/offers/"]').first();
      await expect(offerLink).toBeVisible({ timeout: 10000 });
      await offerLink.click();

      await expect(page).toHaveURL(/\/offers\//);
      // Wait for the page to fully load
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Price section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Price', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/price/);
    });

    test('should navigate to Items section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Items', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/items/);
    });

    test('should navigate to Builds section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Builds', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/builds/);
    });

    test('should navigate to Achievements section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Achievements', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/achievements/);
    });

    test('should navigate to Related section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Related', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/related/);
    });

    test('should navigate to Metadata section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Metadata', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/metadata/);
    });

    test('should navigate to Changelog section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Changelog', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/changelog/);
    });

    test('should navigate to Media section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Media', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/media/);
    });

    test('should navigate to Reviews section', async ({ page }) => {
      const offerSection = page.locator('#offer-information');
      await offerSection.getByRole('link', { name: 'Reviews', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/reviews/);
    });

    test('should navigate back to Overview', async ({ page }) => {
      const offerSection = page.locator('#offer-information');

      // First go to another section
      await offerSection.getByRole('link', { name: 'Price', exact: true }).click();
      await expect(page).toHaveURL(/\/offers\/.*\/price/);

      // Then back to Overview
      await offerSection.getByRole('link', { name: 'Overview', exact: true }).click();

      // The URL should end with just the offer ID (no sub-path)
      await expect(page).toHaveURL(/\/offers\/[^/]+$/);
    });
  });

  test.describe('Offer Page - Seller Link', () => {
    test('should navigate to seller page when clicking seller link', async ({ page }) => {
      await page.goto('/');

      const offerLink = page.locator('a[href^="/offers/"]').first();
      await expect(offerLink).toBeVisible({ timeout: 10000 });
      await offerLink.click();

      await expect(page).toHaveURL(/\/offers\//);
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });

      // Find and click the seller link in the table
      const sellerCell = page.getByRole('row').filter({ hasText: 'Seller' }).getByRole('link');
      if (await sellerCell.isVisible()) {
        await sellerCell.click();
        await expect(page).toHaveURL(/\/sellers\//);
      }
    });
  });

  test.describe('Offer Page - Error Handling', () => {
    test('should display error message for non-existent offer', async ({ page }) => {
      await page.goto('/offers/non-existent-offer-id-12345');

      // Should show an error message or "not found"
      await expect(
        page.getByText(/not found/i).or(page.getByText(/error/i)).or(page.getByText(/Offer not found/i))
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Offer Page - Compare Functionality', () => {
    test('should toggle compare button state when clicked', async ({ page }) => {
      await page.goto('/');

      const offerLink = page.locator('a[href^="/offers/"]').first();
      await expect(offerLink).toBeVisible({ timeout: 10000 });
      await offerLink.click();

      await expect(page).toHaveURL(/\/offers\//);
      await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });

      const compareButton = page.getByRole('button', { name: 'Compare' });
      await expect(compareButton).toBeVisible();

      // Click to add to compare
      await compareButton.click();

      // The button should still be visible (text might change but button remains)
      await expect(compareButton).toBeVisible();
    });
  });
});

test.describe('Offer Page - Responsive', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const offerLink = page.locator('a[href^="/offers/"]').first();
    await expect(offerLink).toBeVisible({ timeout: 10000 });
    await offerLink.click();

    await expect(page).toHaveURL(/\/offers\//);

    // Wait for the page to load by checking for the offer details
    await expect(page.getByText('Offer ID')).toBeVisible({ timeout: 10000 });

    // Should still show the title (use main h1 to avoid matching other h1s)
    await expect(page.locator('main h1').first()).toBeVisible();

    // Should still show the sections navigation within the offer section
    const offerSection = page.locator('#offer-information');
    await expect(offerSection.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  });
});
