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
type SemanticSearchMode = "success" | "empty" | "error";

test.describe("Global search", () => {
  test.beforeEach(async ({ page }) => {
    await mockGlobalSearch(page);
  });

  test("keeps duplicate results independently selectable and uses sharper thumbnails", async ({
    page,
  }) => {
    const dialog = await openGlobalSearch(page);
    await page.setViewportSize({ width: 698, height: 720 });

    await page.getByPlaceholder("Search games, items, sellers...").fill(searchQuery);
    await expect(page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]')).toBeVisible();

    const semanticGroup = page.locator("[cmdk-group]").filter({ hasText: "Matches by meaning" });
    const semanticItems = semanticGroup.locator('[cmdk-item][data-value^="offer:"]');
    await expect(semanticGroup).toBeVisible();
    await expect(semanticItems).toHaveCount(2);
    await expect(semanticItems.nth(0)).toContainText("Semantic Survival Match");
    await expect(semanticItems.nth(1)).toContainText("Semantic Co-op Match");
    await expect(page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]')).toHaveCount(
      1,
    );
    await expect(page.getByText("0.91", { exact: true })).toHaveCount(0);

    const standardOffer = page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]');
    const duplicateOffer = page.locator('[cmdk-item][data-value="offer:offer-rdr2-duplicate"]');
    await standardOffer.hover();
    expect(await standardOffer.evaluate((element) => element.matches(":hover"))).toBe(true);
    expect(await duplicateOffer.evaluate((element) => element.matches(":hover"))).toBe(false);

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

    await semanticItems.nth(0).click();
    await page.waitForURL(/\/offers\/offer-semantic-survival/);
  });

  test("hides the semantic group when the endpoint returns no matches", async ({ page }) => {
    await page.unroute("**/search/natural-language**");
    await mockSemanticSearch(page, "empty");
    await openGlobalSearch(page);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/search/natural-language") && response.status() === 200,
    );
    await page.getByPlaceholder("Search games, items, sellers...").fill(searchQuery);
    await responsePromise;

    await expect(page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]')).toBeVisible();
    await expect(page.getByText("Matches by meaning", { exact: true })).toHaveCount(0);
  });

  test("keeps direct matches usable when semantic search is unavailable", async ({ page }) => {
    await page.unroute("**/search/natural-language**");
    await mockSemanticSearch(page, "error");
    await openGlobalSearch(page);

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/search/natural-language") && response.status() === 503,
    );
    await page.getByPlaceholder("Search games, items, sellers...").fill(searchQuery);
    await responsePromise;

    const directOffer = page.locator('[cmdk-item][data-value="offer:offer-rdr2-standard"]');
    await expect(directOffer).toBeVisible();
    await expect(
      page.getByText("Could not load matches by meaning.", { exact: true }),
    ).toBeVisible();
    await directOffer.click();
    await page.waitForURL(/\/offers\/offer-rdr2-standard/);
  });
});

async function openGlobalSearch(page: Page) {
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

  return dialog;
}

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

  await mockSemanticSearch(page, "success");

  await page.route("https://cdn.example.test/**", async (route) => {
    await route.fulfill({
      contentType: "image/png",
      body: tinyPng,
    });
  });
}

async function mockSemanticSearch(page: Page, mode: SemanticSearchMode) {
  await page.route("**/search/natural-language**", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());

    expect(request.method()).toBe("POST");
    expect(requestUrl.searchParams.get("locale")).toBe("en-US");
    expect(request.postDataJSON()).toEqual({ query: searchQuery, topK: 6 });

    if (mode === "error") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Natural-language search is temporarily unavailable",
          error: "SERVICE_UNAVAILABLE",
        }),
      });
      return;
    }

    const matches =
      mode === "empty"
        ? []
        : [
            {
              score: 0.99,
              offer: offer("offer-rdr2-standard", "Red Dead Redemption 2"),
            },
            {
              score: 0.91,
              offer: offer("offer-semantic-survival", "Semantic Survival Match"),
            },
            {
              score: 0.83,
              offer: offer("offer-semantic-coop", "Semantic Co-op Match"),
            },
          ];

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query: searchQuery,
        count: matches.length,
        matches,
      }),
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
