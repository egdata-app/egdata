import { expect, test, type Page } from "@playwright/test";
import {
  createBuildPageResponse,
  currentBuildId,
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
  test("pins the previous build and renders an accessible change summary", async ({ page }) => {
    await mockBuildApi(page);
    await page.goto(`http://localhost:3000/builds/${currentBuildId}/files`);

    await expect(page.getByTestId("build-diff-summary")).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("compare")).toBe(previousBuildId);
    await expect(
      page.getByTestId("build-timeline").locator('[aria-current="true"]'),
    ).toHaveAttribute("data-build-id", currentBuildId);
    await expect(
      page.getByTestId("build-diff-table").locator('[data-change-kind="modified"]'),
    ).toHaveCount(1);
    await expect(
      page.getByText("Full download size is the compressed size", { exact: false }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("build-diff-summary")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("compare")).toBe(previousBuildId);
  });

  test("keeps the comparison usable without page-level mobile overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockBuildApi(page);
    await page.goto(
      `http://localhost:3000/es-ES/builds/${currentBuildId}/files?view=changes&page=1&compare=${previousBuildId}`,
    );
    await expect(page.getByText("Añadido", { exact: true }).first()).toBeVisible();
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
  });
});
