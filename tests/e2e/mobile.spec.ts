import { expect, test } from "@playwright/test";
import {
  expectMainReady,
  expectSearchResultsReady,
  waitForSearchResponse,
} from "./support/assertions";

async function expectNoPageHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(2);
}

test.describe("Mobile layout smoke", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("keeps homepage, search, freebies, and offer detail within the viewport", async ({
    page,
  }) => {
    await page.goto("/");
    await expectMainReady(page);
    await expectNoPageHorizontalOverflow(page);

    const initialSearch = waitForSearchResponse(page);
    await page.goto("/search?sortBy=creationDate");
    await initialSearch;
    await expectMainReady(page);
    await expectSearchResultsReady(page);
    await expect(page.getByRole("button", { name: /Filters/ })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    const firstOffer = page.getByRole("link", { name: /^Open offer / }).first();
    await expect(firstOffer).toBeVisible();
    await Promise.all([page.waitForURL(/\/offers\/[^/?#]+\/?$/), firstOffer.click()]);
    await expectMainReady(page);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectNoPageHorizontalOverflow(page);

    const freebiesSearch = waitForSearchResponse(page);
    await page.goto("/freebies");
    await freebiesSearch;
    await expectMainReady(page);
    await expect(page.getByRole("heading", { name: "Current Free Games" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Filters/ })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });
});
