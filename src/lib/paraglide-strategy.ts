import {
  defineCustomClientStrategy,
  defineCustomServerStrategy,
  getLocale,
  toLocale,
  type Locale,
} from "@/paraglide/runtime.js";

const CUSTOM_STRATEGY = "custom-url-prefix";
const NON_LOCALIZED_PREFIXES = new Set(["api", "auth", "assets", "static"]);
const NON_LOCALIZED_PATHS = new Set(["/sitemap.xml", "/sw.js", "/site.webmanifest"]);

let clientStrategyRegistered = false;
let serverStrategyRegistered = false;

function firstPathSegment(pathname: string): string | undefined {
  const [segment] = pathname.split("/").filter(Boolean);
  return segment ? decodeURIComponent(segment) : undefined;
}

export function localeFromPathname(pathname: string): Locale | undefined {
  const segment = firstPathSegment(pathname);
  return segment ? toLocale(segment) : undefined;
}

export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";

  if (!toLocale(segments[0])) {
    return pathname || "/";
  }

  const stripped = `/${segments.slice(1).join("/")}`;
  return stripped === "/" ? "/" : stripped.replace(/\/$/, "");
}

export function isNonLocalizedPath(pathname: string): boolean {
  if (NON_LOCALIZED_PATHS.has(pathname)) return true;

  const segment = firstPathSegment(pathname);
  return segment ? NON_LOCALIZED_PREFIXES.has(segment) : false;
}

export function withLocalePrefix(pathname: string, locale: Locale = getLocale()): string {
  if (isNonLocalizedPath(pathname)) return pathname;

  const barePathname = stripLocalePrefix(pathname);
  return barePathname === "/" ? `/${locale}` : `/${locale}${barePathname}`;
}

export function toBareInternalHref(href: string): string {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(href)
  ) {
    return href;
  }

  const url = new URL(href, "https://egdata.local");
  const pathname = isNonLocalizedPath(url.pathname) ? url.pathname : stripLocalePrefix(url.pathname);
  return `${pathname}${url.search}${url.hash}`;
}

export function localizeHref(href: string): string {
  return toBareInternalHref(href);
}

export function seoLocalizedHref(href: string, locale: Locale = getLocale()): string {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(href)
  ) {
    return href;
  }

  const url = new URL(href, "https://egdata.local");
  return `${withLocalePrefix(url.pathname, locale)}${url.search}${url.hash}`;
}

export function setupParaglideStrategies() {
  if (typeof window !== "undefined" && !clientStrategyRegistered) {
    defineCustomClientStrategy(CUSTOM_STRATEGY, {
      getLocale: () => localeFromPathname(window.location.pathname),
      setLocale: (locale) => {
        void locale;
      },
    });
    clientStrategyRegistered = true;
  }

  if (typeof window === "undefined" && !serverStrategyRegistered) {
    defineCustomServerStrategy(CUSTOM_STRATEGY, {
      getLocale: (request) => {
        if (!request) return undefined;

        return localeFromPathname(new URL(request.url).pathname);
      },
    });
    serverStrategyRegistered = true;
  }
}

setupParaglideStrategies();
