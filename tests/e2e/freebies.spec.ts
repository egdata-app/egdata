import { expect, test } from "@playwright/test";
import {
  expectMainReady,
  expectSearchResultsReady,
  waitForSearchResponse,
} from "./support/assertions";

test.describe("Freebies flow", () => {
  test("renders stats, current freebies, mobile freebies, and past freebies search", async ({
    page,
  }) => {
    const initialSearch = waitForSearchResponse(page);
    await page.goto("/freebies");
    await initialSearch;

    await expectMainReady(page);
    await expect(page.getByRole("heading", { name: "Giveaways in numbers" })).toBeVisible();
    await expect(page.getByText("Total Value")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Current Free Games" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Redeem Now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mobile Free Games" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Past Free Games" })).toBeVisible();
    await expectSearchResultsReady(page);

    await Promise.all([
      waitForSearchResponse(page),
      page.getByPlaceholder("Search for games").fill("lego"),
    ]);
    await expect(page).toHaveURL(/title=lego/);
    await expect(page).toHaveURL(/pastGiveaways=true/);
    await expect(page).toHaveURL(/sortBy=giveawayDate/);
    await expectSearchResultsReady(page);
  });

  for (const legacyPath of ["/free-games", "/freegames"]) {
    test(`redirects ${legacyPath} to /freebies`, async ({ page }) => {
      await page.goto(legacyPath);
      await expect(page).toHaveURL(/\/freebies\/?$/);
      await expectMainReady(page);
    });
  }
});
