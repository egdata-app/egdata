import { expect, type Page } from "@playwright/test";

const appErrorText =
  /Application error|ReferenceError|TypeError|Cannot read properties|Hydration failed|Minified React error|Unhandled Runtime Error|ZodError|Invalid input: expected/i;

export async function expectNoAppError(page: Page) {
  await expect(page.getByText(appErrorText)).toHaveCount(0);
}

export async function expectMainReady(page: Page) {
  await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });
  await expectNoAppError(page);
}

export async function expectNoPageHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(2);
}

export async function waitForApiResponse(
  page: Page,
  urlPart: string | RegExp,
  options: {
    method?: string;
    timeout?: number;
  } = {},
) {
  const response = await page.waitForResponse(
    (res) => {
      const matches =
        typeof urlPart === "string" ? res.url().includes(urlPart) : urlPart.test(res.url());
      const methodMatches =
        !options.method || res.request().method().toUpperCase() === options.method.toUpperCase();

      return matches && methodMatches;
    },
    { timeout: options.timeout ?? 20_000 },
  );

  expect(response.status(), `${response.request().method()} ${response.url()}`).toBeLessThan(500);

  return response;
}

export async function waitForSearchResponse(page: Page) {
  return waitForApiResponse(page, "/search/v2/search", { method: "POST" });
}

export async function expectSearchResultsReady(page: Page) {
  await expect(
    page
      .getByRole("link", { name: /^Open offer / })
      .first()
      .or(page.getByText("No results found")),
  ).toBeVisible({ timeout: 30_000 });
  await expectNoAppError(page);
}
