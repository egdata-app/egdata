import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { expectMainReady, expectSearchResultsReady } from "./support/assertions";

const PROFILE_ID_WITH_ACHIEVEMENTS = "ac7b3a70e3ce4652b49c38e648001d9e";

async function attachPageScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

test.describe("Design system screenshot QA", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`captures core redesigned pages at ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto("/");
      await expectMainReady(page);
      await expect(page.getByRole("heading", { name: "egdata.app", exact: true })).toBeVisible();
      await attachPageScreenshot(page, testInfo, `homepage-${viewport.name}.png`);

      await page.goto("/search");
      await expectSearchResultsReady(page);
      await attachPageScreenshot(page, testInfo, `search-${viewport.name}.png`);

      await page.goto("/downloads");
      await expectMainReady(page);
      await attachPageScreenshot(page, testInfo, `downloads-${viewport.name}.png`);

      await page.goto(`/profile/${PROFILE_ID_WITH_ACHIEVEMENTS}`);
      await expect(page.getByRole("heading", { name: "Sr_DraBx" })).toBeVisible({
        timeout: 30_000,
      });
      await attachPageScreenshot(page, testInfo, `profile-${viewport.name}.png`);
    });
  }
});
