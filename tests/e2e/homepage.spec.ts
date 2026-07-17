import { expect, test } from "@playwright/test";
import { expectMainReady, expectNoAppError } from "./support/assertions";

test.describe("Homepage smoke", () => {
  test("keeps hero quick links visible without an internal scrollbar", async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 520 });
    await page.goto("/");
    await expectMainReady(page);

    const quickLinks = page.getByTestId("hero-quick-links");
    await expect(quickLinks).toBeVisible();
    await expect(quickLinks.getByRole("link", { name: "Free now", exact: true })).toHaveCount(0);
    const overflow = await quickLinks.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("keeps the desktop hero panel from overlapping RTL content", async ({ page, context }) => {
    await context.addCookies([{ name: "user_locale", value: "ar", url: "http://localhost:3000" }]);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await expectMainReady(page);

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const panel = page.getByTestId("hero-pulse-panel");
    const content = page.getByTestId("hero-content");

    await expect(panel).toBeVisible();
    await expect(content).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const panel = document.querySelector('[data-testid="hero-pulse-panel"]');
          const content = document.querySelector('[data-testid="hero-content"]');

          if (!panel || !content) return Number.POSITIVE_INFINITY;

          const panelRect = panel.getBoundingClientRect();
          const contentRect = content.getBoundingClientRect();

          if (panelRect.width === 0 || contentRect.width === 0) {
            return Number.POSITIVE_INFINITY;
          }

          return panelRect.right - contentRect.left;
        }),
      )
      .toBeLessThanOrEqual(0);
  });

  test("renders homepage content and key sections", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);

    await expect(page.getByText("Offers Tracked")).toBeVisible();
    await expect(page.getByText("Price Changes / 72h")).toBeVisible();
    await expect(page.getByText("Active Discounts")).toBeVisible();
    await expect(page.getByText("Giveaways to Date")).toBeVisible();

    await expect(page.getByRole("link", { name: "Giveaway Stats", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Giveaway Offers", exact: true })).toBeVisible();
    await expect(page.getByTestId("historical-lows")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Previous historical-low offers", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next historical-low offers", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Latest Offers", exact: true })).toBeVisible();
    await expectNoAppError(page);
  });

  test("navigates to key routes from homepage links", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);

    await page.getByText("Giveaways to Date").waitFor();
    const giveawayStatsLink = page
      .getByRole("link", { name: "Giveaway Stats", exact: true })
      .first();
    await expect(giveawayStatsLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/freebies/, { timeout: 10000 }),
      giveawayStatsLink.click({ timeout: 10000 }),
    ]);
    await expectMainReady(page);

    await page.goto("/");
    await expectMainReady(page);
    await page.getByText("Giveaways to Date").waitFor();
    const latestOffersLink = page.getByRole("link", { name: "Latest Offers", exact: true }).first();
    await expect(latestOffersLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/search\?sortBy=creationDate/, { timeout: 10000 }),
      latestOffersLink.click({ timeout: 10000 }),
    ]);
    await expectMainReady(page);
  });
});
