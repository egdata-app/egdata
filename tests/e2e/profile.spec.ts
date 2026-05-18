import { expect, test } from "@playwright/test";
import { expectNoAppError, waitForApiResponse } from "./support/assertions";

const PROFILE_ID_WITH_ACHIEVEMENTS = "ac7b3a70e3ce4652b49c38e648001d9e";

test.describe("Profile page", () => {
  test("renders games with achievements without an explicit page search param", async ({
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

    const gamesResponse = waitForApiResponse(
      page,
      `/profiles/${PROFILE_ID_WITH_ACHIEVEMENTS}/games`,
    );

    await page.goto(`/profile/${PROFILE_ID_WITH_ACHIEVEMENTS}`);

    await gamesResponse;

    await expect(page).toHaveURL(
      new RegExp(`/profile/${PROFILE_ID_WITH_ACHIEVEMENTS}/?(?:\\?page=1)?$`),
    );
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Achievements Progress").first()).toBeVisible({
      timeout: 30_000,
    });
    const gameCardRarestAchievements = page
      .locator(`a[href^="/profile/${PROFILE_ID_WITH_ACHIEVEMENTS}/achievements/"] section`, {
        hasText: "Rarest Achievements",
      })
      .first();

    await expect(gameCardRarestAchievements).toBeVisible({
      timeout: 30_000,
    });
    await expect(gameCardRarestAchievements.locator("img").first()).toHaveAttribute(
      "src",
      /\/epic-achievements\/[^?]+$/,
    );
    await expectNoAppError(page);

    expect(achievementIconRequests.length).toBeGreaterThan(0);
    expect(achievementIconRequests.filter((url) => new URL(url).search)).toEqual([]);
    expect(invalidHtmlMessages).toEqual([]);
  });
});
