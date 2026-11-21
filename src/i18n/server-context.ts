/**
 * Server-only catalog context.
 *
 * Every request resolves its locale in paraglideMiddleware; this module binds
 * the matching catalog to that request through AsyncLocalStorage so SSR renders
 * the right language even with concurrent requests.
 *
 * The `catalogs` map (src/i18n/catalogs/index.ts) is generated from
 * src/locales by scripts/build-i18n-catalogs.mjs, so adding a locale never
 * leaves the server without its catalog.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { setServerCatalogStore } from "@/lib/i18n";
import type { Catalog } from "./catalog";
import { baseCatalog, catalogs } from "./catalogs/index";

const storage = new AsyncLocalStorage<{ catalog: Catalog; locale: string }>();

let warnedMissing = false;

setServerCatalogStore(storage);

export function runWithLocaleCatalog<T>(locale: string, run: () => T): T {
  const catalog = catalogs[locale];

  if (!catalog && !warnedMissing) {
    warnedMissing = true;
    console.warn(
      `[i18n] no server catalog for locale "${locale}"; falling back to en-US. Run \`pnpm i18n:build\` if the locale is new.`,
    );
  }

  return storage.run({ catalog: catalog ?? baseCatalog, locale }, run);
}
