import { expect, test, type Page } from "@playwright/test";
import {
  createBuildPageResponse,
  currentBuildId,
  oldestBuildId,
  previousBuildId,
  unverifiedBuild,
} from "./support/build-fixture.mjs";

async function mockBuildApi(page: Page, options: { treeErrorPath?: string } = {}) {
  await page.route("**/builds/**", async (route) => {
    if (route.request().resourceType() === "document") return route.continue();
    const url = new URL(route.request().url());
    if (
      options.treeErrorPath &&
      url.pathname.endsWith("/tree") &&
      url.searchParams.get("path") === options.treeErrorPath
    ) {
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    }
    const response = createBuildPageResponse(url);
    if (!response) return route.continue();
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(response) });
  });
}

test.describe("build comparison", () => {
  test("shows technical details by default and still lets visitors collapse them", async ({
    page,
  }) => {
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

  test("browses the file tree and compares a selected file with the active baseline", async ({
    page,
  }) => {
    const apiRequests = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.hostname === "api.egdata.app") apiRequests.push(url.pathname);
    });
    await mockBuildApi(page);
    await page.goto(
      `http://localhost:3000/builds/${currentBuildId}/files?view=all&page=1&compare=${previousBuildId}`,
    );

    await expect(page.getByTestId("build-files-tree")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open folder Binaries" })).toBeVisible();
    await page.getByRole("button", { name: "Open folder Binaries" }).click();
    await expect(page).toHaveURL(/(?:\?|&)path=Binaries(?:&|$)/);
    await expect(page.getByTestId("build-tree-breadcrumbs")).toContainText("Binaries");

    await page.getByRole("button", { name: "Select file Game.exe" }).click();
    const details = page.getByTestId("build-file-details");
    await expect(details).toContainText("Binaries/Game.exe");
    await expect(details).toContainText("new");
    await expect(details).toContainText("old");
    await expect(details).toContainText("Modified");

    await page.getByTestId("previous-build-select").click();
    await page.getByRole("option", { name: /BuildVersion-1\.0\.210725\.2/ }).click();
    await expect(page).toHaveURL(/(?:\?|&)view=all(?:&|$)/);
    await expect(page).toHaveURL(new RegExp(`[?&]compare=${oldestBuildId}(?:&|$)`));
    await expect(page).toHaveURL(/(?:\?|&)path=Binaries(?:&|$)/);

    expect(apiRequests.some((path) => path.endsWith("/tree"))).toBe(true);
    expect(apiRequests.some((path) => path.endsWith("/files"))).toBe(false);
  });

  test("keeps folder paths in browser history and paginates directory contents", async ({
    page,
  }) => {
    await mockBuildApi(page);
    await page.goto(`http://localhost:3000/builds/${currentBuildId}/files?view=all&page=1`);

    await page.getByRole("button", { name: "Open folder Many" }).click();
    await expect(page.getByRole("button", { name: "Select file File-100.bin" })).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/(?:\?|&)page=2(?:&|$)/);
    await expect(page.getByRole("button", { name: "Select file File-101.bin" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/(?:\?|&)page=1(?:&|$)/);
    await expect(page.getByRole("button", { name: "Select file File-100.bin" })).toBeVisible();
    await page.getByRole("button", { name: "Root", exact: true }).click();
    await page.getByRole("button", { name: "Open folder Empty" }).click();
    await expect(page.getByTestId("build-tree-empty")).toHaveText("This folder is empty.");
  });

  test("shows a warning for an unverified file tree", async ({ page }) => {
    await mockBuildApi(page);
    await page.goto(`http://localhost:3000/builds/${unverifiedBuild.id}/files?view=all&page=1`);
    await expect(page.getByTestId("build-tree-manifest-warning")).toBeVisible();
  });

  test("shows no-baseline details in a mobile-safe layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockBuildApi(page);
    await page.goto(`http://localhost:3000/builds/${oldestBuildId}/files?view=all&page=1`);
    await expect(page.getByTestId("current-build-select")).toContainText(
      "BuildVersion-1.0.210725.2",
    );
    await page.getByRole("button", { name: "Select file README.txt" }).click();
    await expect(page.getByTestId("build-file-no-baseline")).toBeVisible();
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
  });

  test("shows an error when a tree folder cannot be loaded", async ({ page }) => {
    await mockBuildApi(page, { treeErrorPath: "Error" });
    await page.goto(`http://localhost:3000/builds/${currentBuildId}/files?view=all&page=1`);
    await page.getByRole("button", { name: "Open folder Error" }).click();
    await expect(page.getByTestId("build-tree-error")).toBeVisible({ timeout: 10_000 });
  });
});
