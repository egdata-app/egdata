import { expect, test } from "@playwright/test";

test.describe("Homepage smoke", () => {
  test("renders homepage shell", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "egdata.app", exact: true })).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("navigates to key routes from homepage links", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Giveaway Stats", exact: true }).click();
    await expect(page).toHaveURL(/\/freebies/);

    await page.goto("/");
    await page.getByRole("link", { name: "Latest Offers", exact: true }).click();
    await expect(page).toHaveURL(/\/search\?sortBy=creationDate/);
  });
});
