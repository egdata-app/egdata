import { expect, test, type Page } from "@playwright/test";
import { createBuildPageResponse, currentBuildId } from "./support/build-fixture.mjs";
import {
  createReadyTechnologyResponse,
  createTechnologyApiResponse,
  createTechnologyOfferResponse,
  isTechnologyOfferRequest,
  technologyOfferId,
} from "./support/technology-fixture.mjs";
import { expectNoPageHorizontalOverflow } from "./support/assertions";

const emptySearchResponse = {
  total: 0,
  offers: [],
  page: 1,
  limit: 28,
  aggregations: {
    price_stats: { count: 0, min: 0, max: 0, avg: 0, sum: 0 },
    technologies: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
  },
  meta: { ms: 1, timed_out: false, cached: false },
};

async function mockSearch(page: Page, bodies: unknown[] = []) {
  await page.route("**/search/v2/search**", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(emptySearchResponse),
    });
  });
  await page.route("**/search/tags**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
}

async function mockTechnologyClient(
  page: Page,
  resolve = (id: string) => createTechnologyApiResponse(id),
) {
  await page.route(
    "https://technologies-api.egdata.app/v1/assets/technology-logos/**",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    },
  );
  await page.route("https://technologies-api.egdata.app/v1/technologies/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const id = decodeURIComponent(pathname.slice(pathname.lastIndexOf("/") + 1));
    const response = resolve(id);
    await route.fulfill({
      status: response.status,
      headers: response.headers,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });
}

test.describe("technology profiles", () => {
  test("renders a sourced profile and locks search to the exact route key", async ({ page }) => {
    const searchBodies: unknown[] = [];
    await mockSearch(page, searchBodies);
    await mockTechnologyClient(page);

    await page.goto("/technologies/NVIDIA_DLSS?technologies=OVERRIDE&title=ray");

    await expect(page.getByRole("heading", { name: "NVIDIA DLSS", exact: true })).toBeVisible();
    const logo = page.getByRole("img", { name: "NVIDIA DLSS logo" });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute(
      "src",
      `https://technologies-api.egdata.app/v1/assets/technology-logos/${"a".repeat(64)}.png`,
    );
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
    await expect(page).toHaveTitle("NVIDIA DLSS Technology | egdata.app");
    await expect(page.getByRole("link", { name: /Official site/u })).toHaveAttribute(
      "href",
      "https://www.nvidia.com/en-us/geforce/technologies/dlss/",
    );
    await expect(page.getByRole("heading", { name: "Sources", exact: true })).toBeVisible();
    await expect(
      page.locator('p[lang="en"]').filter({ hasText: "neural rendering techniques" }),
    ).toBeVisible();
    await expect(page.getByText("No results found")).toBeVisible();
    await expect(page).not.toHaveURL(/(?:\?|&)technologies=/u);
    await expect
      .poll(() =>
        searchBodies.find(
          (body) =>
            typeof body === "object" && body !== null && "title" in body && body.title === "ray",
        ),
      )
      .toMatchObject({ technologies: ["NVIDIA_DLSS"], title: "ray" });
  });

  test("polls a pending profile until it becomes ready", async ({ page }) => {
    await mockSearch(page);
    let pendingClientRequests = 0;
    await mockTechnologyClient(page, (id) => {
      if (id !== "PENDING_TECH") return createTechnologyApiResponse(id);
      pendingClientRequests += 1;
      return pendingClientRequests === 1
        ? createTechnologyApiResponse(id)
        : { status: 200, body: createReadyTechnologyResponse(id, "Pending Tech") };
    });

    await page.goto("/technologies/PENDING_TECH");
    await expect(page.getByRole("heading", { name: "Researching PENDING TECH" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pending Tech", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("No results found")).toBeVisible();
  });

  for (const state of [
    {
      id: "CFG",
      heading: "Profile unavailable for CFG",
      description: "multiple technologies",
    },
    {
      id: "INVALID_TECH",
      heading: "Technology not found",
      description: "does not appear in the EGDATA search index",
    },
    {
      id: "UNAVAILABLE_TECH",
      heading: "Technology profile temporarily unavailable",
      description: "matching games are still available",
    },
  ]) {
    test(`keeps matching games available for ${state.id}`, async ({ page }) => {
      await mockSearch(page);
      await mockTechnologyClient(page);

      await page.goto(`/technologies/${state.id}`);
      await expect(page.getByRole("heading", { name: state.heading })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(state.description, { exact: false })).toBeVisible();
      await expect(page.getByText("No results found")).toBeVisible();
    });
  }

  test("localizes the UI, retains the English profile, and has no mobile overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockSearch(page);
    await mockTechnologyClient(page);

    await page.goto("/es-ES/technologies/NVIDIA_DLSS");

    await expect(page.locator("html")).toHaveAttribute("lang", "es-ES");
    await expect(page.getByRole("img", { name: "Logotipo de NVIDIA DLSS" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Fuentes" })).toBeVisible();
    await expect(page.getByText("Juegos que usan NVIDIA DLSS")).toBeVisible();
    await expect(
      page.locator('p[lang="en"]').filter({ hasText: "neural rendering techniques" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Filtros", exact: true })).toBeVisible();
    await expectNoPageHorizontalOverflow(page);
  });

  test("preserves exact technology keys and locale prefixes in build links", async ({ page }) => {
    await page.route("**/builds/**", async (route) => {
      if (route.request().resourceType() === "document") return route.continue();
      const response = createBuildPageResponse(new URL(route.request().url()));
      if (!response) return route.continue();
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(response) });
    });

    await page.goto(`/es-ES/builds/${currentBuildId}`);
    await expect(page.getByRole("link", { name: "Engine / Unreal Engine" })).toHaveAttribute(
      "href",
      "/es-ES/technologies/Unreal%20Engine",
    );
  });

  test("preserves exact technology keys and locale prefixes in offer links", async ({ page }) => {
    await page.route("**/graphql", async (route) => {
      const payload = route.request().postDataJSON();
      if (!isTechnologyOfferRequest(payload)) return route.continue();
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(createTechnologyOfferResponse(payload.variables.id)),
      });
    });

    await page.goto(`/es-ES/offers/${technologyOfferId}`);
    await expect(page.getByRole("link", { name: "NVIDIA_DLSS", exact: true })).toHaveAttribute(
      "href",
      "/es-ES/technologies/NVIDIA_DLSS",
    );
  });
});
