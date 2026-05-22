import { expect, test } from "@playwright/test";
import { expectNoAppError, waitForApiResponse } from "./support/assertions";

const PROFILE_ID_WITH_ACHIEVEMENTS = "ac7b3a70e3ce4652b49c38e648001d9e";

test.describe("Profile page", () => {
  test("renders the public showcase, library, and activity profile experience", async ({
    page,
  }) => {
    const achievementIconRequests: string[] = [];
    const invalidHtmlMessages: string[] = [];

    page.on("console", (message) => {
      if (message.type() !== "error" && message.type() !== "warning") return;

      const text = message.text();
      if (/cannot be a descendant|cannot contain a nested|hydration error/i.test(text)) {
        invalidHtmlMessages.push(text);
      }
    });

    page.on("request", (request) => {
      const url = new URL(request.url());

      if (url.pathname.includes("/epic-achievements/")) {
        achievementIconRequests.push(request.url());
      }
    });

    await page.context().addCookies([
      {
        name: "EGDATA_COOKIES_2",
        value: Buffer.from(
          JSON.stringify({
            googleAnalytics: false,
            selfHostedAnalytics: false,
            ahrefsAnalytics: false,
            googleConsent: {
              ad_storage: "denied",
              ad_user_data: "denied",
              ad_personalization: "denied",
              analytics_storage: "denied",
              functionality_storage: "denied",
              personalization_storage: "denied",
              security_storage: "denied",
            },
          }),
        ).toString("base64"),
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto(`/profile/${PROFILE_ID_WITH_ACHIEVEMENTS}`);

    await expect(page).toHaveURL(new RegExp(`/profile/${PROFILE_ID_WITH_ACHIEVEMENTS}/?$`));
    await expect(page.getByRole("heading", { name: "Sr_DraBx" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("tab", { name: "Showcase" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Library" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Featured Games" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "Recent Unlocks" })).toBeVisible({
      timeout: 30_000,
    });

    const achievementIcon = page.locator('img[src*="/epic-achievements/"]').first();
    await expect(achievementIcon).toHaveAttribute("src", /\/epic-achievements\/[^?]+$/, {
      timeout: 30_000,
    });

    await page.getByRole("tab", { name: "Library" }).click();
    const libraryPanel = page.getByRole("tabpanel", { name: "Library" });
    await expect(libraryPanel.getByRole("button", { name: "All", exact: true })).toBeVisible();
    await expect(libraryPanel.getByRole("button", { name: "In Progress" })).toBeVisible();

    const nextPageResponse = waitForApiResponse(page, "/graphql", { method: "POST" });
    await libraryPanel.getByRole("button", { name: "Go to next page" }).click();
    await nextPageResponse;
    await expect(page).toHaveURL(/page=2/);

    const filterResponse = waitForApiResponse(page, "/graphql", { method: "POST" });
    await libraryPanel.getByRole("button", { name: "In Progress" }).click();
    await filterResponse;
    await expect(page).toHaveURL(/filter=in-progress/);

    const sortResponse = waitForApiResponse(page, "/graphql", { method: "POST" });
    await libraryPanel.getByRole("combobox").click();
    await page.getByRole("option", { name: "XP" }).click();
    await sortResponse;
    await expect(page).toHaveURL(/sort=xp/);

    await page.getByRole("tab", { name: "Activity" }).click();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(
      page.locator(`a[href^="/profile/${PROFILE_ID_WITH_ACHIEVEMENTS}/achievements/"]`).first(),
    ).toBeVisible();

    await expectNoAppError(page);

    expect(achievementIconRequests.length).toBeGreaterThan(0);
    expect(achievementIconRequests.filter((url) => new URL(url).search)).toEqual([]);
    expect(invalidHtmlMessages).toEqual([]);
  });
});
