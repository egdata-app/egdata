import { expect, test, type Page } from "@playwright/test";
import { expectMainReady } from "./support/assertions";

const searchQuery = "red dead redemption 2";
const imageUrl = "https://cdn.example.test/rdr2-wide.jpg";
const acceptedCookies = Buffer.from(
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
).toString("base64");
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

test.describe("Global search", () => {
  test.beforeEach(async ({ page }) => {
    await mockGlobalSearch(page);
  });

  test("keeps duplicate results independently selectable and uses sharper thumbnails", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 720 });
    await page.context().addCookies([
      {
        name: "EGDATA_COOKIES_2",
        value: acceptedCookies,
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/about");
    await expectMainReady(page);

    const searchButton = page.getByRole("button", { name: /Search games/i });
    const dialog = page.getByRole("dialog", { name: "Search EGDATA" });
    await expect(async () => {
      await searchButton.click();
      await expect(dialog).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
    await page.setViewportSize({ width: 698, height: 720 });

    await page.getByPlaceholder("Search games, items, sellers...").fill(searchQuery);
    await expect(page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]')).toBeVisible();

    await page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]').hover();
    await expect(page.locator("[cmdk-item][data-selected=true]")).toHaveCount(1);
    await expect(
      page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]'),
    ).toHaveAttribute("data-selected", "true");

    const commandListHasNoHorizontalOverflow = await page
      .locator("[cmdk-list]")
      .evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
    expect(commandListHasNoHorizontalOverflow).toBe(true);

    await expectFullyInside(
      dialog,
      page
        .locator(`[cmdk-item][data-value="action:search-offers:${searchQuery}"]`)
        .getByText("Search", { exact: true }),
    );
    await expectFullyInside(
      dialog,
      page
        .locator('[cmdk-item][data-value="offer:offer-rdr2-duplicate"]')
        .getByText("Pre-purchase", { exact: true }),
    );

    const image = page.getByRole("img", { name: "Red Dead Redemption 2" }).first();
    await expect(image).toHaveAttribute("src", /w=88/);
    await expect(image).toHaveAttribute("src", /quality=high/);
    await expect(image).toHaveAttribute("sizes", "44px");
  });
});

async function mockGlobalSearch(page: Page) {
  await page.route("**/multisearch/offers**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: searchQuery,
        hits: [
          offer("offer-rdr2-standard", "Red Dead Redemption 2"),
          offer("offer-rdr2-duplicate", "Red Dead Redemption 2"),
        ],
        processingTimeMs: 1,
        limit: 6,
        offset: 0,
        estimatedTotalHits: 2,
      }),
    });
  });

  await page.route("**/multisearch/items**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: searchQuery,
        hits: [
          {
            _id: "item-long-title",
            id: "item-long-title",
            namespace: "DURABLE-89efe5924d3d467c839449ab6ab5227f",
            title:
              "Adventure Characters Pack 2 - Survival, Survivor, RPG, Shooter, Action Character All Format Asset Bundle With Extra Long Name",
            description: "",
            keyImages: [
              {
                type: "DieselGameBoxWide",
                url: "https://cdn.example.test/item-wide.jpg",
                md5: "",
              },
            ],
            categories: [],
            status: "ACTIVE",
            creationDate: "",
            lastModifiedDate: "",
            customAttributes: {},
            entitlementName: "",
            entitlementType: "",
            itemType: "Item",
            releaseInfo: [],
            developer: "",
            developerId: "",
            eulaIds: [],
            installModes: [],
            endOfSupport: false,
            applicationId: "",
            unsearchable: false,
            requiresSecureAccount: false,
          },
        ],
        processingTimeMs: 1,
        limit: 6,
        offset: 0,
        estimatedTotalHits: 1,
      }),
    });
  });

  await page.route("**/multisearch/sellers**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: searchQuery,
        hits: [],
        processingTimeMs: 1,
        limit: 6,
        offset: 0,
        estimatedTotalHits: 0,
      }),
    });
  });

  await page.route("https://cdn.example.test/**", async (route) => {
    await route.fulfill({
      contentType: "image/png",
      body: tinyPng,
    });
  });
}

function offer(id: string, title: string) {
  return {
    _id: id,
    id,
    namespace: "rdr2",
    title,
    description: "",
    longDescription: null,
    offerType: "BASE_GAME",
    effectiveDate: "",
    creationDate: "",
    lastModifiedDate: "",
    isCodeRedemptionOnly: false,
    keyImages: [
      {
        type: "DieselStoreFrontWide",
        url: imageUrl,
        md5: "",
      },
    ],
    seller: {
      id: "rockstar-games",
      name: "Rockstar Games",
    },
    productSlug: null,
    urlSlug: null,
    url: null,
    tags: [],
    items: [],
    customAttributes: {},
    categories: [],
    developerDisplayName: null,
    publisherDisplayName: null,
    prePurchase: id === "offer-rdr2-duplicate",
    releaseDate: "",
    pcReleaseDate: null,
    viewableDate: "",
    countriesBlacklist: null,
    countriesWhitelist: null,
    refundType: "",
    offerMappings: null,
    price: null,
    giveaway: null,
  };
}

async function expectFullyInside(
  container: ReturnType<Page["locator"]>,
  target: ReturnType<Page["locator"]>,
) {
  const [containerBox, targetBox] = await Promise.all([
    container.boundingBox(),
    target.boundingBox(),
  ]);

  expect(containerBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  expect(targetBox!.x).toBeGreaterThanOrEqual(containerBox!.x);
  expect(targetBox!.x + targetBox!.width).toBeLessThanOrEqual(
    containerBox!.x + containerBox!.width,
  );
}
