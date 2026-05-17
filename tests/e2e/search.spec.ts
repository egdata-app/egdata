import { expect, test } from "@playwright/test";
import {
  expectMainReady,
  expectSearchResultsReady,
  waitForSearchResponse,
} from "./support/assertions";

test.describe("Search flow", () => {
  test("loads results and keeps filters in the URL", async ({ page }) => {
    const initialSearch = waitForSearchResponse(page);
    await page.goto("/search");
    await initialSearch;

    await expectMainReady(page);
    await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();
    await expectSearchResultsReady(page);

    await Promise.all([
      waitForSearchResponse(page),
      page.getByPlaceholder("Search for games").fill("fortnite"),
    ]);
    await expect(page).toHaveURL(/title=fortnite/);
    await expectSearchResultsReady(page);

    await Promise.all([
      waitForSearchResponse(page),
      page.getByRole("checkbox", { name: "On Sale" }).click(),
    ]);
    await expect(page).toHaveURL(/onSale=true/);
    await expectSearchResultsReady(page);

    await page.getByRole("combobox", { name: "Sort offers" }).click();
    await Promise.all([
      waitForSearchResponse(page),
      page.getByRole("option", { name: "Price" }).click(),
    ]);
    await expect(page).toHaveURL(/sortBy=price/);
    await expectSearchResultsReady(page);
  });
});
