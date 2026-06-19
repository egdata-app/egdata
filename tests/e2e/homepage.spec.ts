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

  test("shows giveaway row hover cards inside the viewport", async ({ page }) => {
    await page.goto("/");
    await expectMainReady(page);

    const giveawayCard = page
      .getByRole("link", { name: "Giveaway Offers", exact: true })
      .locator('xpath=ancestor::*[@data-slot="card"][1]');
    const firstRow = giveawayCard.locator("tbody tr").first();

    await expect(firstRow).toBeVisible();
    await firstRow.hover();

    const hoverCard = page.locator('[role="tooltip"]').first();
    await expect(hoverCard).toBeVisible({ timeout: 15_000 });
    await expect(hoverCard).toBeInViewport();
  });

  test("shows homepage stat tooltips without React Aria trigger warnings", async ({ page }) => {
    const tooltipWarnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "warning" && message.type() !== "error") return;

      const text = message.text();
      if (/Focusable|PressResponder/i.test(text)) {
        tooltipWarnings.push(text);
      }
    });

    await page.goto("/");
    await expectMainReady(page);

    const trigger = page.getByRole("button", { name: "Total Value" });
    await expect(trigger).toBeVisible({ timeout: 30_000 });

    await trigger.hover();

    const tooltip = page
      .getByRole("tooltip")
      .filter({ hasText: "Total value including any active discounts" });
    await expect(tooltip).toBeVisible();

    await expect(tooltip).toBeInViewport();
    expect(tooltipWarnings).toHaveLength(0);
  });
});
