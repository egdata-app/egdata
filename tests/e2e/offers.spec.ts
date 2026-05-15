import { expect, test } from "@playwright/test";

const routes = ["/search", "/freebies", "/about"];

test.describe("Route smoke", () => {
  for (const route of routes) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}`));
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByText(/Application error|ReferenceError|TypeError/i)).toHaveCount(0);
    });
  }
});
