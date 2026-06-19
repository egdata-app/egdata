import { expect, test } from "@playwright/test";
import { expectMainReady, expectNoAppError } from "./support/assertions";

test.describe("Homepage smoke", () => {
  test("renders homepage content and key sections", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);

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

    await page.getByText("Giveaways to Date").waitFor();
    const giveawayStatsLink = page.getByRole("link", { name: "Giveaway Stats", exact: true }).first();
    await giveawayStatsLink.waitFor({ state: "attached" });
    await page.waitForTimeout(500);
    await giveawayStatsLink.click({ timeout: 10000 });
    await expect(page).toHaveURL(/\/freebies/, { timeout: 10000 });
    await expectMainReady(page);

    await page.goto("/");
    await expectMainReady(page);
    await page.getByText("Giveaways to Date").waitFor();
    const latestOffersLink = page.getByRole("link", { name: "Latest Offers", exact: true }).first();
    await latestOffersLink.waitFor({ state: "attached" });
    await page.waitForTimeout(500);
    await latestOffersLink.click({ timeout: 10000 });
    await expect(page).toHaveURL(/\/search\?sortBy=creationDate/, { timeout: 10000 });
    await expectMainReady(page);
  });
});
