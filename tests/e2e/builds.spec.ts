import { expect, test, type Page } from "@playwright/test";
import {
  createBuildPageResponse,
  currentBuildId,
  oldestBuildId,
  previousBuildId,
} from "./support/build-fixture.mjs";

async function mockBuildApi(page: Page) {
  await page.route("**/builds/**", async (route) => {
    if (route.request().resourceType() === "document") return route.continue();
    const response = createBuildPageResponse(new URL(route.request().url()));
    if (!response) return route.continue();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(response) });
  });
}

test.describe("build comparison", () => {
  test("shows technical details by default and still lets visitors collapse them", async ({ page }) => {
    await mockBuildApi(page);
    await page.goto(`http://localhost:3000/builds/${currentBuildId}/files`);

    const details = page.locator("details").filter({ hasText: "Technical Details" });
    await expect(details).toHaveAttribute("open", "");
    await details.locator("summary").click();
    await expect(details).not.toHaveAttribute("open", "");
  });

  test("pins the previous build and renders an accessible change summary", async ({ page }) => {
    await mockBuildApi(page);
    await page.goto(`http://localhost:3000/builds/${currentBuildId}/files`);

    await expect(page.getByTestId("build-diff-summary")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]compare=${previousBuildId}(?:&|$)`));
    await expect(
      page.getByTestId("desktop-build-timeline").locator('[aria-current="true"]'),
    ).toHaveAttribute("data-build-id", currentBuildId);
    await expect(page.getByTestId("current-build-select")).toContainText("Jul 1, 2026");
    await expect(page.getByTestId("previous-build-select")).toContainText("Jun 1, 2026");
    await expect(page.getByTestId("current-timeline-label")).toContainText("Jul 1, 2026");
    await expect(page.getByTestId("baseline-timeline-label")).toContainText("Jun 1, 2026");
    await expect(
      page.getByTestId("build-diff-table").locator('[data-change-kind="modified"]'),
    ).toHaveCount(1);
    await expect(
      page.getByText("Full download size is the compressed size", { exact: false }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("build-diff-summary")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`[?&]compare=${previousBuildId}(?:&|$)`));
  });

  test("selects dated endpoints and clusters dense observations without horizontal overflow", async ({
    page,
  }) => {
    await mockBuildApi(page);
    await page.goto(`http://localhost:3000/builds/${currentBuildId}/files`);

    await expect(page.getByTestId("build-timeline-cluster").first()).toBeVisible();
    await page.getByTestId("build-timeline-cluster").first().click();
    const unverifiedClusterEntry = page
      .getByText("BuildVersion-1.0.230725-unverified", { exact: true })
      .locator("..")
      .locator("..");
    await expect(
      unverifiedClusterEntry.getByRole("button", { name: "Use as baseline" }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");

    await page.getByTestId("previous-build-select").click();
    await page.getByRole("option", { name: /BuildVersion-1\.0\.210725\.2/ }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]compare=${oldestBuildId}(?:&|$)`));
    await expect(page.getByTestId("previous-build-select")).toContainText("May 1, 2026");

    await page.getByTestId("current-build-select").click();
    await page.getByRole("option", { name: /BuildVersion-1\.0\.290725/ }).click();
    await expect(page).toHaveURL(new RegExp(`/builds/${previousBuildId}/files(?:\\?|$)`));
    await expect(page).toHaveURL(new RegExp(`[?&]compare=${oldestBuildId}(?:&|$)`));

    await page.getByRole("button", { name: "Swap" }).click();
    await expect(page).toHaveURL(new RegExp(`/builds/${oldestBuildId}/files(?:\\?|$)`));
    await expect(page).toHaveURL(new RegExp(`[?&]compare=${previousBuildId}(?:&|$)`));

    const overflow = await page.getByTestId("build-timeline").evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
  });

  test("keeps the comparison usable without page-level mobile overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockBuildApi(page);
    await page.goto(
      `http://localhost:3000/es-ES/builds/${currentBuildId}/files?view=changes&page=1&compare=${previousBuildId}`,
    );
    await expect(page.getByTestId("mobile-build-trail")).toBeVisible();
    await expect(page.getByTestId("desktop-build-timeline")).toBeHidden();
    await expect(page.getByTestId("current-build-select")).toContainText("1 jul 2026");
    await expect(page.getByText("Añadido", { exact: true }).first()).toBeVisible();
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
  });
});
