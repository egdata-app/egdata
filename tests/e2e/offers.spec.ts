import { expect, test, type Page } from "@playwright/test";
import {
  expectMainReady,
  expectNoAppError,
  expectNoPageHorizontalOverflow,
  expectSearchResultsReady,
  waitForSearchResponse,
} from "./support/assertions";

async function getFirstSearchOffer(page: Page) {
  const initialSearch = waitForSearchResponse(page);
  await page.goto("/search?sortBy=creationDate");
  await initialSearch;

  await expectMainReady(page);
  await expectSearchResultsReady(page);

  const firstOffer = page.getByRole("link", { name: /^Open offer / }).first();
  await expect(firstOffer).toBeVisible();

  const href = await firstOffer.getAttribute("href");
  const offerName = (await firstOffer.getAttribute("aria-label"))?.replace(/^Open offer /, "");

  expect(href).toMatch(/^\/offers\/[^/?#]+/);

  return { href: href!, offerName };
}

async function expectOfferMainHasLoadingOrContent(page: Page) {
  await expectMainReady(page);

  const hasLoadingOrText = await page.locator("main").first().evaluate((main) => {
    return Boolean(main.querySelector(".animate-pulse")) || (main.textContent ?? "").trim() !== "";
  });

  expect(hasLoadingOrText).toBe(true);
}

async function expectOfferDetailReady(
  page: Page,
  options: { offerName?: string; offerIdLabel?: string } = {},
) {
  await expectOfferMainHasLoadingOrContent(page);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 30_000 });

  if (options.offerName) {
    await expect(page.getByRole("heading", { name: options.offerName, level: 1 })).toBeVisible();
  }

  await expect(page.getByText(options.offerIdLabel ?? "Offer ID")).toBeVisible();
  await expect(page.locator("#offer-information")).toBeVisible();
  await expectNoAppError(page);
}

test.describe("Offer detail flow", () => {
  test("opens an offer from search and navigates detail tabs", async ({ page }) => {
    const initialSearch = waitForSearchResponse(page);
    await page.goto("/search?sortBy=creationDate");
    await initialSearch;

    await expectMainReady(page);
    await expectSearchResultsReady(page);

    const firstOffer = page.getByRole("link", { name: /^Open offer / }).first();
    await expect(firstOffer).toBeVisible();
    const offerName = (await firstOffer.getAttribute("aria-label"))?.replace(/^Open offer /, "");

    await Promise.all([page.waitForURL(/\/offers\/[^/?#]+\/?$/), firstOffer.click()]);

    await expectMainReady(page);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    if (offerName) {
      await expect(page.getByRole("heading", { name: offerName, level: 1 })).toBeVisible();
    }
    await expect(page.getByText("Offer ID")).toBeVisible();
    await expect(page.getByText("Namespace")).toBeVisible();
    await expect(page.getByText("Seller").first()).toBeVisible();

    const tabHeadings: Record<string, RegExp> = {
      Price: /^Price$/,
      Items: /^Items$/,
      Changelog: /^Changelog$/,
      Reviews: /Epic Players Rating|EGDATA Rating|Critic Reviews/,
    };

    const offerInformation = page.locator("#offer-information").first();
    for (const [tab, heading] of Object.entries(tabHeadings)) {
      await Promise.all([
        page.waitForURL(new RegExp(`/offers/[^/]+/${tab.toLowerCase()}`)),
        offerInformation.getByRole("link", { name: tab, exact: true }).click(),
      ]);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible({
        timeout: 30_000,
      });
      await expectNoAppError(page);
    }
  });

  test("renders a cold direct offer detail page without a blank loading state", async ({
    page,
  }) => {
    const { href, offerName } = await getFirstSearchOffer(page);
    const coldPage = await page.context().newPage();

    try {
      await coldPage.goto(href, { waitUntil: "domcontentloaded" });
      await expect(coldPage).toHaveURL(/\/offers\/[^/?#]+\/?$/);
      await expectOfferDetailReady(coldPage, { offerName });
    } finally {
      await coldPage.close();
    }
  });

  test("hydrates a cold direct localized offer detail page", async ({ page }) => {
    const { href } = await getFirstSearchOffer(page);
    const localizedPage = await page.context().newPage();

    try {
      await localizedPage.goto(`/es-ES${href}`, { waitUntil: "domcontentloaded" });
      await expect(localizedPage).toHaveURL(/\/es-ES\/offers\/[^/?#]+\/?$/);
      await expect(localizedPage.locator("html")).toHaveAttribute("lang", "es-ES");
      await expectOfferDetailReady(localizedPage, { offerIdLabel: "ID de oferta" });
    } finally {
      await localizedPage.close();
    }
  });

  test("renders a clear not-found state for an invalid offer", async ({ page }) => {
    await page.goto("/offers/non-existent-offer-id-12345");
    await expect(page).toHaveURL(/\/offers\/non-existent-offer-id-12345/);
    await expect(page.locator("main")).toContainText("Offer not found");
    await expectNoAppError(page);
  });

  test("opens compare tray from the navbar without narrow-width overflow", async ({ page }) => {
    const initialSearch = waitForSearchResponse(page);
    await page.goto("/search?sortBy=creationDate");
    await initialSearch;

    await expectMainReady(page);
    await expectSearchResultsReady(page);

    const firstOffer = page.getByRole("link", { name: /^Open offer / }).first();
    await expect(firstOffer).toBeVisible();
    await Promise.all([page.waitForURL(/\/offers\/[^/?#]+\/?$/), firstOffer.click()]);

    await expectMainReady(page);
    await page.getByRole("button", { name: "Compare", exact: true }).click();

    const compareTrigger = page.getByTestId("compare-tray-trigger");
    await expect(compareTrigger).toBeVisible();
    await expect(compareTrigger).toContainText("1");
    await expect(compareTrigger).toHaveAttribute("aria-label", /1 selected/);

    for (const viewport of [
      { width: 503, height: 360 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(compareTrigger).toBeVisible();
      await expectNoPageHorizontalOverflow(page);
    }

    await compareTrigger.click();
    await expect(page.getByRole("dialog", { name: "Compare selected offers" })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
    await expectNoAppError(page);
  });

  test("sanitizes malformed persisted compare state on reload", async ({ page }) => {
    const cases = [
      { name: "object", value: "{}", expectedStored: "[]", expectedCount: 0 },
      { name: "string", value: JSON.stringify("bad"), expectedStored: "[]", expectedCount: 0 },
      {
        name: "mixed array",
        value: JSON.stringify(["offer-a", "", 42, "offer-a", " offer-b "]),
        expectedStored: JSON.stringify(["offer-a", "offer-b"]),
        expectedCount: 2,
      },
    ];

    for (const compareCase of cases) {
      await test.step(compareCase.name, async () => {
        await page.goto("/about");
        await expectMainReady(page);

        await page.evaluate((value) => {
          window.sessionStorage.setItem("compare", value);
        }, compareCase.value);

        await page.reload({ waitUntil: "domcontentloaded" });
        await expectMainReady(page);
        await expectNoAppError(page);

        await expect
          .poll(() => page.evaluate(() => window.sessionStorage.getItem("compare")))
          .toBe(compareCase.expectedStored);

        const compareTrigger = page.getByTestId("compare-tray-trigger");
        if (compareCase.expectedCount === 0) {
          await expect(compareTrigger).toHaveCount(0);
        } else {
          await expect(compareTrigger).toBeVisible();
          await expect(compareTrigger).toContainText(String(compareCase.expectedCount));
        }
      });
    }
  });

  test("renders static informational route", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveURL(/\/about/);
    await expectMainReady(page);
  });
});
