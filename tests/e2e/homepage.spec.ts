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

  test("anchors tooltips and hover cards to their triggers", async ({ page }) => {
    // Provide deterministic fallback data when CI has no v1 API key so the
    // tooltip and hover-card triggers render even without live API access.
    await page.route("**/v1/free-games/stats*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            totalValue: { originalPrice: 12345, discountPrice: 0, currencyCode: "USD" },
            totalGiveaways: 100,
            totalOffers: 90,
            repeated: 10,
            sellers: 25,
          },
          meta: {},
        }),
      });
    });
    await page.route("**/v1/offers/latest-released*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "e2e-hover-offer",
              title: "E2E Hover Offer",
              keyImages: [],
              releaseDate: "2026-01-01T00:00:00.000Z",
              price: null,
            },
          ],
          meta: {},
        }),
      });
    });
    await page.route("**/v1/offers/*/overview*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            offer: {
              id: "e2e-hover-offer",
              title: "E2E Hover Offer",
              keyImages: [],
              seller: { id: "e2e-seller", name: "E2E Seller" },
              developerDisplayName: "E2E Developer",
              publisherDisplayName: "E2E Publisher",
              releaseDate: "2026-01-01T00:00:00.000Z",
            },
            price: null,
            media: null,
            igdb: null,
            features: { launcher: "Epic", features: [], epicFeatures: [] },
            ageRating: null,
            polls: null,
            genres: [],
            technologies: [],
          },
          meta: {},
        }),
      });
    });

    // Skip the consent dialog so it cannot swallow pointer events.
    await page.context().addCookies([
      {
        name: "EGDATA_COOKIES_2",
        value: Buffer.from(
          JSON.stringify({
            googleAnalytics: false,
            selfHostedAnalytics: false,
            ahrefsAnalytics: false,
            googleConsent: {
              ad_storage: "denied",
              ad_user_data: "denied",
              ad_personalization: "denied",
              analytics_storage: "denied",
              functionality_storage: "denied",
              personalization_storage: "denied",
              security_storage: "denied",
            },
          }),
          "utf-8",
        ).toString("base64"),
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await expectMainReady(page);

    // Tooltips must render next to their trigger. React Aria positions
    // bottom-anchored overlays against the viewport, so a positioned <body>
    // used to push them to the bottom of the document.
    await page.getByText("Giveaways to Date").waitFor();
    const valueLabel = page.getByText("Total Value", { exact: true }).first();
    await expect(valueLabel).toBeVisible();
    await valueLabel.hover();

    const tooltip = page.locator('[role="tooltip"]').first();
    await expect(tooltip).toBeVisible();
    const triggerBox = await valueLabel.boundingBox();
    const tooltipBox = await tooltip.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(tooltipBox).not.toBeNull();
    expect(tooltipBox!.y).toBeGreaterThanOrEqual(0);
    expect(tooltipBox!.y).toBeLessThan(1000);
    expect(Math.abs(tooltipBox!.y - triggerBox!.y)).toBeLessThan(120);

    // Offer rows on the homepage open the overview hover card.
    await page.mouse.move(0, 0);
    const row = page.locator('[data-slot="table-row"][aria-haspopup]').first();
    await expect(row).toBeVisible();
    await row.hover();

    const hoverCard = page.locator('[data-slot="hover-card-content"]').first();
    await expect(hoverCard).toBeVisible();
    const rowBox = await row.boundingBox();
    const cardBox = await hoverCard.boundingBox();
    expect(rowBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.y).toBeGreaterThanOrEqual(0);
    expect(cardBox!.y).toBeLessThan(1000);
    expect(Math.abs(cardBox!.y - rowBox!.y)).toBeLessThan(80);
  });
});
