import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getServiceWorkerCacheControl, serveStaticAssets } from "../../src/lib/static-assets.ts";

test("getServiceWorkerCacheControl caches versioned sw.js immutably and skips unversioned", () => {
  assert.equal(
    getServiceWorkerCacheControl(new URL("https://egdata.app/sw.js?v=1794737161399")),
    "public, max-age=31536000, immutable",
  );
  assert.equal(
    getServiceWorkerCacheControl(new URL("https://egdata.app/sw.js")),
    "no-cache, no-store, max-age=0, must-revalidate",
  );
  assert.equal(
    getServiceWorkerCacheControl(new URL("https://egdata.app/sw.js?v=")),
    "no-cache, no-store, max-age=0, must-revalidate",
  );
  assert.equal(
    getServiceWorkerCacheControl(new URL("https://egdata.app/sw.js?v=%20%20")),
    "no-cache, no-store, max-age=0, must-revalidate",
  );
});

test("serveStaticAssets sets immutable Cache-Control on /sw.js?v= and no-store on bare /sw.js", async () => {
  const dir = await mkdtemp(join(tmpdir(), "egdata-sw-cache-"));
  try {
    await writeFile(join(dir, "sw.js"), "console.log('sw');\n");
    const middleware = serveStaticAssets({ dir });
    const next = async () => new Response("Not Found", { status: 404 });

    const versionedRes = await middleware(
      new Request("https://egdata.app/sw.js?v=abc123", { method: "HEAD" }),
      next,
    );
    assert.equal(versionedRes.status, 200);
    assert.equal(versionedRes.headers.get("cache-control"), "public, max-age=31536000, immutable");

    const unversionedRes = await middleware(
      new Request("https://egdata.app/sw.js", { method: "HEAD" }),
      next,
    );
    assert.equal(unversionedRes.status, 200);
    assert.equal(
      unversionedRes.headers.get("cache-control"),
      "no-cache, no-store, max-age=0, must-revalidate",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
