import { expect, test } from "@playwright/test";
import { sandboxFixtureId, sandboxFixtureResponse } from "./support/sandbox-fixture.mjs";
import { expectNoAppError, expectNoPageHorizontalOverflow } from "./support/assertions";

test.use({ baseURL: "http://localhost:3100" });

test.beforeEach(async ({ page }) => {
  await page.route("**/sandboxes/e2e-sandbox-catalog*/**", async (route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const response = sandboxFixtureResponse(new URL(route.request().url()));
    if (response) await route.fulfill({ status: response.status, json: response.body });
    else await route.continue();
  });
  await page.route("**/graphql", async (route) => {
    const response = sandboxFixtureResponse(
      new URL(route.request().url()),
      route.request().postDataJSON(),
    );
    if (response) await route.fulfill({ status: response.status, json: response.body });
    else await route.continue();
  });
});

for (const width of [1440, 390]) {
  test(`Sandbox header transitions expand and compress at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/sandboxes/${sandboxFixtureId}/offers`);
    await expect(page.getByRole("combobox", { name: "Content group" })).toBeEnabled();
    await page.evaluate(() => {
      const state = window as typeof window & {
        sandboxTransitions: { before: number; after: number; ready: boolean; finished: boolean }[];
      };
      state.sandboxTransitions = [];
      const start = document.startViewTransition.bind(document);
      const artworkWidth = () =>
        document.querySelector('[style*="sandbox-artwork"]')!.getBoundingClientRect().width;
      document.startViewTransition = (options) => {
        const result = { before: artworkWidth(), after: 0, ready: false, finished: false };
        state.sandboxTransitions.push(result);
        const transition = start(options);
        void transition.ready.then(() => {
          result.after = artworkWidth();
          result.ready = true;
        });
        void transition.finished.then(() => {
          result.finished = true;
        });
        return transition;
      };
    });
    const nav = page.getByRole("navigation", { name: "Sandbox sections" });
    await nav.getByRole("link", { name: "Overview" }).click();
    await page.waitForFunction(() => {
      const { sandboxTransitions } = window as typeof window & {
        sandboxTransitions: { before: number; after: number; ready: boolean; finished: boolean }[];
      };
      return (
        sandboxTransitions[0]?.ready &&
        sandboxTransitions[0]?.finished &&
        sandboxTransitions[0].after > sandboxTransitions[0].before * 2
      );
    });
    await nav.getByRole("link", { name: /^Offers/ }).click();
    await page.waitForFunction(() => {
      const { sandboxTransitions } = window as typeof window & {
        sandboxTransitions: { before: number; after: number; ready: boolean; finished: boolean }[];
      };
      return (
        sandboxTransitions[1]?.ready &&
        sandboxTransitions[1]?.finished &&
        sandboxTransitions[1].after < sandboxTransitions[1].before / 2
      );
    });
    await expectNoPageHorizontalOverflow(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await nav.getByRole("link", { name: "Overview" }).click();
    await expect(page).toHaveURL(new RegExp(`/sandboxes/${sandboxFixtureId}$`));
    expect(
      await page.evaluate(
        () =>
          (
            window as typeof window & {
              sandboxTransitions: unknown[];
            }
          ).sandboxTransitions.length,
      ),
    ).toBe(2);
    await page.evaluate(() => {
      Object.defineProperty(document, "startViewTransition", {
        value: undefined,
        configurable: true,
      });
    });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await nav.getByRole("link", { name: /^Offers/ }).click();
    await expect(page.getByRole("combobox", { name: "Content group" })).toBeEnabled();
    await expectNoAppError(page);
  });
}

test("overview keeps duplicate records, legacy bundles, and failed groups visible", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/sandboxes/${sandboxFixtureId}`);
  await expect(page.getByRole("heading", { name: "Catalog fixture", exact: true })).toBeVisible();
  const games = page.getByRole("region", { name: "Base game & editions", exact: true });
  await expect(games.getByRole("heading", { name: "Same title", exact: true })).toHaveCount(2);
  await expect(games.getByText("Price not available", { exact: true })).toHaveCount(3);
  await expect(
    page
      .getByRole("region", { name: "Demos & extras", exact: true })
      .getByText("Free", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy Namespace", exact: true }).click();
  await expect(page.getByText("Namespace copied", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Bundles", exact: true })
      .getByText("Legacy bundle", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "DLC", exact: true })
      .getByRole("button", { name: "Try again" }),
  ).toBeVisible({ timeout: 20000 });
  await page
    .getByRole("region", { name: "Add-ons", exact: true })
    .getByRole("link", { name: "View all" })
    .click();
  await expect(page.getByRole("combobox", { name: "Content group" })).toHaveValue("addons");
  await expect(page.getByText("25 offers", { exact: true })).toBeVisible();
  await expectNoAppError(page);
});

test("an empty Sandbox retains navigation and an explicit empty catalog", async ({ page }) => {
  await page.goto(`/sandboxes/${sandboxFixtureId}-empty`);
  await expect(page.getByText("No records in this section yet.", { exact: true })).toBeVisible();
  const all = page.getByRole("link", { name: "All offers", exact: true });
  await all.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Offers", exact: true })).toBeVisible();
  await expect(page.getByText("No records in this section yet.", { exact: true })).toBeVisible();
});

test("catalog state survives reload and history; search and filters reset pagination", async ({
  page,
}) => {
  await page.goto(`/sandboxes/${sandboxFixtureId}/offers`);
  await page.getByRole("combobox", { name: "Content group" }).selectOption("addons");
  await expect(page.getByText("25 offers", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Technical table", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search offers by title" }).fill("Add-on 01");
  await expect(page.getByText("1 offer", { exact: true })).toBeVisible();
  await expect(page.getByText("Page 1 of 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page.getByRole("button", { name: "Cards", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goBack();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("cell", { name: "FUTURE_TYPE", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Unclassified record", exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search offers by title" }).fill("no-such-title");
  await expect(page.getByText("No records match your search.", { exact: true })).toBeVisible();
});

test("mobile catalog and technical tabs contain horizontal overflow; Spanish copy works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const section of ["items", "assets", "builds", "achievements", "changelog"]) {
    await page.goto(`/sandboxes/${sandboxFixtureId}/${section}`);
    await expect(page.getByText("No records in this section yet.", { exact: true })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
    await expectNoAppError(page);
  }
  await page.goto(`/es-ES/sandboxes/${sandboxFixtureId}/offers`);
  await expect(page.getByRole("button", { name: "Tabla técnica", exact: true })).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
  await page.getByRole("button", { name: "Tabla técnica", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expectNoPageHorizontalOverflow(page);
});

test("a failed group can be retried after recovery", async ({ page }) => {
  await page.goto(`/sandboxes/${sandboxFixtureId}/offers`);
  await page.getByRole("combobox", { name: "Content group" }).selectOption("dlc");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.route("**/sandboxes/e2e-sandbox-catalog*/offers?**", (route) =>
    route.fulfill({ json: { elements: [], count: 0, page: 1, limit: 20 } }),
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("No records match your search.", { exact: true })).toBeVisible();
});
