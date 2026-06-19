import { expect, test } from "@playwright/test";
import { expectMainReady, expectNoAppError, waitForApiResponse } from "./support/assertions";

test.describe("Navigation controls", () => {
  test("supports desktop menus, country selection, and keyboard global search", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    await page.getByRole("button", { name: "Explore" }).click();
    await expect(page.getByRole("link", { name: "Top Sellers", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Release Stats", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Explore" }).click();

    const countrySelector = page.locator("header").getByRole("button", { name: "United States" });
    await countrySelector.click();
    await page.getByPlaceholder("Search countries...").fill("Spain");
    await page.getByRole("option", { name: "Spain" }).click();
    await expect(page.locator("header").getByRole("button", { name: "Spain" })).toBeVisible();

    const globalSearchResponse = waitForApiResponse(page, "/multisearch/offers", {
      method: "GET",
    });
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+K`);

    const globalSearchInput = page.getByPlaceholder("Search for games, items, sellers...");
    await expect(globalSearchInput).toBeFocused();
    await globalSearchInput.fill("fortnite");
    await globalSearchResponse;

    await expect(page.getByRole("heading", { name: "Offers", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(globalSearchInput).toHaveCount(0);
    await expectNoAppError(page);
  });

  test("keeps desktop expandable menus open while hovering their content", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    await page.getByRole("button", { name: "Explore" }).hover();

    const topSellers = page.getByRole("link", { name: "Top Sellers", exact: true });
    await expect(topSellers).toBeVisible();
    await topSellers.hover();
    await page.waitForTimeout(250);

    await expect(topSellers).toBeVisible();
    await expect(page.getByRole("link", { name: "Release Stats", exact: true })).toBeVisible();
    await expectNoAppError(page);
  });

  test("switches desktop expandable menus inside a single animated viewport", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    const content = page.locator('[data-slot="navigation-menu-content"]');

    await page.getByRole("button", { name: "Explore" }).hover();
    await expect(content).toHaveCount(1);
    await expect(content).toContainText("Rankings");
    await expect(content).toContainText("Release Stats");

    await page.getByRole("button", { name: "Browse" }).hover();
    await expect(content).toHaveCount(1);
    await expect(content).toContainText("Find what you're looking for");
    await expect(content).toContainText("Top Seller on the Epic Games Store");
    await expect(content).not.toContainText("Rankings");
    await expect(content).toHaveAttribute("data-motion", "from-end");
    await expectNoAppError(page);
  });

  test("opens the mobile sheet menu and launches search from it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expectMainReady(page);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    await page.getByRole("button", { name: "Toggle navigation menu" }).click();
    const sheet = page.getByRole("dialog").first();
    await expect(sheet).toBeVisible();

    await sheet.getByRole("button", { name: "Browse" }).click();
    await expect(sheet.getByRole("link", { name: /^Search/ })).toBeVisible();
    await expect(sheet.getByRole("link", { name: /^Free Games/ })).toBeVisible();

    await sheet.getByPlaceholder("Search games...").click();
    await expect(page.getByPlaceholder("Search for games, items, sellers...")).toBeFocused();
    await expectNoAppError(page);
  });
});
