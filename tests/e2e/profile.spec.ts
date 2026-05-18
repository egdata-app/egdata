import { expect, test } from "@playwright/test";
import { expectNoAppError, waitForApiResponse } from "./support/assertions";

const PROFILE_ID_WITH_ACHIEVEMENTS = "ac7b3a70e3ce4652b49c38e648001d9e";

test.describe("Profile page", () => {
  test("renders games with achievements without an explicit page search param", async ({
    page,
  }) => {
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
    await expectNoAppError(page);
  });
});
