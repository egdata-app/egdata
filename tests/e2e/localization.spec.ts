import { expect, test } from "@playwright/test";
import { expectMainReady } from "./support/assertions";

test.describe("localized routes", () => {
  test("renders bare about without redirecting", async ({ page }) => {
    await page.goto("/about");
    await expectMainReady(page);

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: "About", exact: true })).toBeVisible();
  });

  test("renders prefixed about in Spanish", async ({ page }) => {
    await page.goto("/es-ES/about");
    await expectMainReady(page);

    await expect(page).toHaveURL(/\/es-ES\/about$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es-ES");
    await expect(page.getByRole("heading", { name: "Acerca de", exact: true })).toBeVisible();
  });

  test("keeps generated internal links bare from a prefixed localized entry page", async ({ page }) => {
    await page.goto("/es-ES");
    await expectMainReady(page);

    const prefixedInternalLinks = page.locator('a[href="/es-ES"], a[href^="/es-ES/"]');
    await expect(prefixedInternalLinks).toHaveCount(0);

    expect(await page.locator('a[href^="/offers/"]').count()).toBeGreaterThan(5);
  });

  test("switching locale keeps the current route bare and persists the cookie", async ({ page }) => {
    await page.goto("/about");
    await expectMainReady(page);

    await page.locator('button[role="combobox"]').filter({ hasText: "English" }).click();

    await page.getByText("Español", { exact: true }).click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es-ES");
    await expect(page.getByRole("heading", { name: "Acerca de", exact: true })).toBeVisible();

    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "user_locale")?.value).toBe("es-ES");
  });

  test("rejects unsupported locale prefixes", async ({ page }) => {
    const response = await page.goto("/zz/about");

    expect(response?.status()).toBe(404);
  });

  test("keeps protocol routes unprefixed", async ({ page }) => {
    const apiResponse = await page.request.get("/api/hello");
    expect(apiResponse.status()).toBe(200);
    expect(await apiResponse.text()).toBe("Hello World!");

    const sitemapResponse = await page.request.get("/sitemap.xml", { maxRedirects: 0 });
    expect(sitemapResponse.status()).toBe(308);
    expect(sitemapResponse.headers().location).toBe("https://api.egdata.app/sitemap.xml");
  });
});
