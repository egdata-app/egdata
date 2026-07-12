import { expect, test } from "@playwright/test";
import {
  expectMainReady,
  expectSearchResultsReady,
  waitForSearchResponse,
} from "./support/assertions";

test.describe("Freebies flow", () => {
  test("opens active PC giveaways in Epic's purchase popup", async ({ page, request }) => {
    const [giveawaysResponse, mobileGiveawaysResponse] = await Promise.all([
      request.get("https://api.egdata.app/free-games?country=US"),
      request.get("https://api.egdata.app/free-games/mobile"),
    ]);
    expect(giveawaysResponse.ok()).toBeTruthy();
    expect(mobileGiveawaysResponse.ok()).toBeTruthy();

    const giveaways = (await giveawaysResponse.json()) as Array<{
      id: string;
      namespace: string;
      giveaway: { startDate: string; endDate: string };
    }>;
    const mobileGiveaways = (await mobileGiveawaysResponse.json()) as Array<{
      id: string;
      namespace: string;
    }>;
    const mobileOfferKeys = new Set(
      mobileGiveaways.map((offer) => `${offer.namespace}:${offer.id}`),
    );
    const now = Date.now();
    const expectedOffers = giveaways
      .filter((offer) => {
        const startTime = new Date(offer.giveaway.startDate).getTime();
        const endTime = new Date(offer.giveaway.endDate).getTime();
        return (
          startTime <= now &&
          now < endTime &&
          !mobileOfferKeys.has(`${offer.namespace}:${offer.id}`)
        );
      })
      .map((offer) => `1-${offer.namespace}-${offer.id}--`);

    expect(expectedOffers.length).toBeGreaterThan(0);

    await page.addInitScript(() => {
      const popupState = {
        calls: [] as Array<{ url: string; target?: string; features?: string }>,
        focused: false,
      };
      const testWindow = window as typeof window & {
        __redeemPopupState: typeof popupState;
      };
      testWindow.__redeemPopupState = popupState;
      window.open = ((url?: string | URL, target?: string, features?: string) => {
        popupState.calls.push({ url: String(url), target, features });
        return {
          focus: () => {
            popupState.focused = true;
          },
        } as Window;
      }) as typeof window.open;
    });

    const initialSearch = waitForSearchResponse(page);
    await page.goto("/freebies");
    await initialSearch;
    await expectMainReady(page);

    const redeemButton = page.getByRole("button", { name: "Redeem Now" });
    await expect(redeemButton).toBeEnabled();
    await redeemButton.click();

    const popupState = await page.evaluate(() => {
      return (
        window as typeof window & {
          __redeemPopupState: {
            calls: Array<{ url: string; target?: string; features?: string }>;
            focused: boolean;
          };
        }
      ).__redeemPopupState;
    });

    expect(popupState.calls).toHaveLength(1);
    expect(popupState.calls[0]?.target).toBe("_blank");
    expect(popupState.calls[0]?.features).toBe("width=1000,height=700");
    expect(popupState.focused).toBeTruthy();

    const purchaseUrl = new URL(popupState.calls[0]!.url);
    expect(purchaseUrl.origin).toBe("https://store.epicgames.com");
    expect(purchaseUrl.pathname).toBe("/purchase");
    expect(purchaseUrl.searchParams.get("showNavigation")).toBe("true");
    expect(purchaseUrl.searchParams.get("highlightColor")).toBe("0078f2");
    expect(purchaseUrl.searchParams.get("lang")).toBe(
      await page.locator("html").getAttribute("lang"),
    );
    expect(purchaseUrl.searchParams.getAll("offers").sort()).toEqual(expectedOffers.sort());
  });

  test("renders stats, current freebies, mobile freebies, and past freebies search", async ({
    page,
  }) => {
    const initialSearch = waitForSearchResponse(page);
    await page.goto("/freebies");
    await initialSearch;

    await expectMainReady(page);
    await expect(page.getByRole("heading", { name: "Giveaways in numbers" })).toBeVisible();
    await expect(page.getByText("Total Value")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Current Free Games" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Redeem Now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mobile Free Games" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Past Free Games" })).toBeVisible();
    await expectSearchResultsReady(page);

    await Promise.all([
      waitForSearchResponse(page),
      page.getByPlaceholder("Search for games").fill("lego"),
    ]);
    await expect(page).toHaveURL(/title=lego/);
    await expect(page).toHaveURL(/pastGiveaways=true/);
    await expect(page).toHaveURL(/sortBy=giveawayDate/);
    await expectSearchResultsReady(page);
  });

  for (const legacyPath of ["/free-games", "/freegames"]) {
    test(`redirects ${legacyPath} to /freebies`, async ({ page }) => {
      await page.goto(legacyPath);
      await expect(page).toHaveURL(/\/freebies\/?$/);
      await expectMainReady(page);
    });
  }
});
