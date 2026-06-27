import { expect, test, type Page } from "@playwright/test";

async function waitForControlledServiceWorker(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const scriptUrl = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        });
      });
    }

    return registration.active?.scriptURL ?? navigator.serviceWorker.controller?.scriptURL ?? null;
  });

  expect(scriptUrl).toContain("/sw.js");
}

test.describe("service worker", () => {
  test("registers without showing the update prompt", async ({ page }) => {
    const dialogs: string[] = [];

    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await waitForControlledServiceWorker(page);

    expect(dialogs).not.toContain("New content available, reload?");
  });

  test("shows the offline fallback only when navigation cannot reach the network", async ({
    context,
    page,
  }) => {
    await waitForControlledServiceWorker(page);
    await context.setOffline(true);

    await page.goto(`/service-worker-offline-${Date.now()}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();

    await context.setOffline(false);
  });

  test("does not store failed static assets in Cache Storage", async ({ page }) => {
    await waitForControlledServiceWorker(page);

    const result = await page.evaluate(async () => {
      const missingJsPath = `/static/js/missing-service-worker-test-${Date.now()}.js`;
      const missingCssPath = `/static/css/missing-service-worker-test-${Date.now()}.css`;

      await Promise.all([fetch(missingJsPath), fetch(missingCssPath)]);

      const cacheNames = await caches.keys();
      const cacheMatches = await Promise.all(
        cacheNames.flatMap((cacheName) =>
          [missingJsPath, missingCssPath].map(async (path) => {
            const cache = await caches.open(cacheName);
            return Boolean(await cache.match(path));
          }),
        ),
      );

      return cacheMatches.some(Boolean);
    });

    expect(result).toBe(false);
  });

  test("caches only successful same-origin image responses", async ({ page }) => {
    await waitForControlledServiceWorker(page);

    const result = await page.evaluate(async () => {
      const loadImage = (src: string) =>
        new Promise<boolean>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = src;
          document.body.append(image);
        });

      const cache = await caches.open("egdata-images-v1");
      const cacheBust = Date.now();
      const goodImagePath = `/placeholder.webp?sw-image-cache-test=${cacheBust}`;
      const missingImagePath = `/missing-service-worker-image-${cacheBust}.png`;
      const goodImageUrl = new URL(goodImagePath, location.href).href;
      const missingImageUrl = new URL(missingImagePath, location.href).href;

      const [goodLoaded, missingLoaded] = await Promise.all([
        loadImage(goodImagePath),
        loadImage(missingImagePath),
      ]);

      let goodResponse: Response | undefined;

      for (let i = 0; i < 20; i++) {
        goodResponse = await cache.match(goodImageUrl);

        if (goodResponse) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const missingResponse = await cache.match(missingImageUrl);

      return {
        goodLoaded,
        goodStatus: goodResponse?.status ?? null,
        missingLoaded,
        missingCached: Boolean(missingResponse),
      };
    });

    expect(result).toEqual({
      goodLoaded: true,
      goodStatus: 200,
      missingLoaded: false,
      missingCached: false,
    });
  });
});
