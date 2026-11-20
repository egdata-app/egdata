import { useCallback, useSyncExternalStore } from "react";
import {
  baseLocale,
  getLocale,
  setLocale as setParaglideLocale,
  toLocale,
  type Locale,
} from "@/paraglide/runtime.js";
import { hasMessage, translate, type Catalog, type MessageParams } from "@/i18n/catalog";
import { loadCatalog } from "@/i18n/catalog-loader";

export type { MessageParams };

export type TFunction = {
  (key: string | readonly string[], params?: MessageParams): string;
};

/**
 * Server-side catalogs live in an AsyncLocalStorage owned by src/i18n/server-context.ts
 * so concurrent requests with different locales never see each other's strings.
 * The client never imports that module; on the client the catalog is module state.
 */
interface CatalogStore {
  getStore(): { catalog: Catalog; locale: string } | undefined;
}

let serverCatalogStore: CatalogStore | undefined;
let clientCatalog: Catalog | undefined;
let clientLocale: string | undefined;

export function setServerCatalogStore(store: CatalogStore) {
  serverCatalogStore = store;
}

const subscribers = new Set<() => void>();
let version = 0;

function emitLocaleChange() {
  version += 1;

  for (const subscriber of subscribers) {
    subscriber();
  }
}

function subscribe(subscriber: () => void) {
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

function getVersion() {
  return version;
}

function normalizeLocale(locale?: string | null): Locale {
  if (!locale) return baseLocale;

  const exact = toLocale(locale);

  if (exact) return exact;

  const language = locale.split("-")[0];

  return toLocale(language) ?? baseLocale;
}

function currentCatalog(): { catalog: Catalog | undefined; locale: string } {
  if (typeof window === "undefined") {
    const store = serverCatalogStore?.getStore();

    return {
      catalog: store?.catalog,
      locale: store?.locale ?? getLocale(),
    };
  }

  return {
    catalog: clientCatalog,
    locale: clientLocale ?? getLocale(),
  };
}

export const t: TFunction = (key, params = {}) => {
  const keys = Array.isArray(key) ? key : [key];
  const { catalog, locale } = currentCatalog();

  for (const candidate of keys) {
    const message = translate(catalog, locale, candidate, params);

    if (message !== undefined) return message;
  }

  if (params.defaultValue != null) {
    return String(params.defaultValue);
  }

  return String(keys[0] ?? "");
};

export function exists(key: string): boolean {
  const { catalog } = currentCatalog();

  return hasMessage(catalog, key);
}

/** Loads the catalog for another locale without switching to it (hover prefetch). */
export async function prefetchLocaleCatalog(locale?: string | null): Promise<Locale> {
  const resolved = normalizeLocale(locale);

  if (typeof window === "undefined") return resolved;

  // A prefetch is best effort: a failed import just means the switch will load it.
  await loadCatalog(resolved).catch(() => undefined);

  return resolved;
}

export const CATALOG_SCRIPT_ID = "__EGDATA_I18N_CATALOG__";

/**
 * Resolves the built chunk URL for a locale. Registered by the server entry from
 * the build manifest so SSR can modulepreload the active catalog; the dev server
 * and the client have no manifest and simply return undefined.
 */
let catalogChunkResolver: ((locale: string) => string | undefined) | undefined;

export function setCatalogChunkResolver(resolver: (locale: string) => string | undefined) {
  catalogChunkResolver = resolver;
}

export function getCatalogChunkUrl(locale: string): string | undefined {
  if (typeof window !== "undefined") return undefined;

  return catalogChunkResolver?.(locale);
}

export async function ensureLocale(locale?: string | null): Promise<Locale> {
  return normalizeLocale(locale);
}

/**
 * Client-only: loads the catalog for the given locale and makes it active.
 * The client entry awaits this before hydrating so the first render has strings.
 */
export async function ensureLocaleCatalog(locale?: string | null): Promise<Locale> {
  const resolved = normalizeLocale(locale ?? clientLocale ?? getLocale());

  if (typeof window === "undefined") return resolved;

  if (clientCatalog && clientLocale === resolved) return resolved;

  return changeLanguage(resolved);
}

export async function changeLanguage(locale?: string | null): Promise<Locale> {
  const resolvedLocale = normalizeLocale(locale);

  if (typeof window !== "undefined") {
    const catalog = await loadCatalog(resolvedLocale);

    clientCatalog = catalog;
    clientLocale = resolvedLocale;

    await setParaglideLocale(resolvedLocale, { reload: false });
    document.documentElement.lang = resolvedLocale;
  }

  emitLocaleChange();

  return resolvedLocale;
}

export function useTranslation() {
  useSyncExternalStore(subscribe, getVersion, getVersion);

  const translateFn = useCallback<TFunction>((key, params) => t(key, params), []);

  return {
    t: translateFn,
    i18n: i18nCompat,
  };
}

const i18nCompat = {
  get language() {
    return currentCatalog().locale;
  },
  exists,
  t,
  changeLanguage,
};

export default i18nCompat;
