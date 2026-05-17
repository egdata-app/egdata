import { expect, test } from "@playwright/test";
import { expectMainReady, expectNoAppError } from "./support/assertions";

test.describe("Homepage smoke", () => {
  test("renders homepage content and key sections", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);

    await expect(page.getByRole("heading", { name: "egdata.app", exact: true })).toBeVisible();
    await expect(page.getByText("Track prices, discover deals")).toBeVisible();
    await expect(page.getByPlaceholder("Search offers, items, or sellers...")).toBeVisible();

    await expect(page.getByText("Offers Tracked")).toBeVisible();
    await expect(page.getByText("Price Changes / 72h")).toBeVisible();
    await expect(page.getByText("Active Discounts")).toBeVisible();
    await expect(page.getByText("Giveaways to Date")).toBeVisible();

    await expect(page.getByRole("link", { name: "Giveaway Stats", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Giveaway Offers", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Latest Offers", exact: true })).toBeVisible();
    await expectNoAppError(page);
  });

  test("navigates to key routes from homepage links", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);

    await page.getByRole("link", { name: "Giveaway Stats", exact: true }).click();
    await expect(page).toHaveURL(/\/freebies/);
    await expectMainReady(page);

    await page.goto("/");
    await expectMainReady(page);
    await page.getByRole("link", { name: "Latest Offers", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?sortBy=creationDate/);
    await expectMainReady(page);
  });
});
