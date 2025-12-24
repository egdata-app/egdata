import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading and tagline', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'egdata.app', exact: true })).toBeVisible();
    await expect(page.getByText('Track prices, discover deals')).toBeVisible();
  });

  test('should display the search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search offers, items, or sellers...');
    await expect(searchInput).toBeVisible();
  });

  test('should display all metrics boxes', async ({ page }) => {
    await expect(page.getByText('Offers Tracked')).toBeVisible();
    await expect(page.getByText('Price Changes / 72h')).toBeVisible();
    await expect(page.getByText('Active Discounts')).toBeVisible();
    await expect(page.getByText('Giveaways to Date')).toBeVisible();
  });

  test('should display the Giveaway Stats section', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Giveaway Stats', exact: true })).toBeVisible();
  });

  test('should display the Giveaway Offers section', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Giveaway Offers', exact: true })).toBeVisible();
  });

  test('should display the Upcoming Offers section', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Upcoming Offers', exact: true })).toBeVisible();
  });

  test('should display the Latest Offers section', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Latest Offers', exact: true })).toBeVisible();
  });

  test('should display the Latest Released section', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Latest Released', exact: true })).toBeVisible();
  });

  test('should display the Top-Selling Offers section', async ({ page }) => {
    await expect(page.getByText('Top‑Selling Offers')).toBeVisible();
  });

  test('should display the Latest Builds section', async ({ page }) => {
    await expect(page.getByText('Latest Builds')).toBeVisible();
  });

  test('should navigate to freebies page when clicking Giveaway Stats link', async ({ page }) => {
    await page.getByRole('link', { name: 'Giveaway Stats', exact: true }).click();
    await expect(page).toHaveURL(/\/freebies/);
  });

  test('should navigate to search page when clicking Upcoming Offers link', async ({ page }) => {
    await page.getByRole('link', { name: 'Upcoming Offers', exact: true }).click();
    await expect(page).toHaveURL(/\/search\?sortBy=upcoming/);
  });

  test('should navigate to search page when clicking Latest Offers link', async ({ page }) => {
    await page.getByRole('link', { name: 'Latest Offers', exact: true }).click();
    await expect(page).toHaveURL(/\/search\?sortBy=creationDate/);
  });

  test('should open global search when clicking the search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search offers, items, or sellers...');
    await searchInput.click();

    // The global search portal should open with a different search input
    await expect(
      page.getByPlaceholder('Search for games, items, sellers...')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Homepage - Responsive', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'egdata.app', exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Search offers, items, or sellers...')).toBeVisible();
    await expect(page.getByText('Offers Tracked')).toBeVisible();
  });
});
