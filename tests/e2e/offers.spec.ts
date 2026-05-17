import { expect, test } from "@playwright/test";
import {
  expectMainReady,
  expectNoAppError,
  expectSearchResultsReady,
  waitForSearchResponse,
} from "./support/assertions";

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

  test("renders a clear not-found state for an invalid offer", async ({ page }) => {
    await page.goto("/offers/non-existent-offer-id-12345");
    await expect(page).toHaveURL(/\/offers\/non-existent-offer-id-12345/);
    await expect(page.locator("main")).toContainText("Offer not found");
    await expectNoAppError(page);
  });

  test("renders static informational route", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveURL(/\/about/);
    await expectMainReady(page);
  });
});
