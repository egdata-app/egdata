import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/supported-locales";
import enUS from "@/locales/en-US/translation.json";

export const resources = {
  "en-US": { translation: enUS },
} as const;

type TranslationResource = typeof enUS;
type LoadableLocale =
  | "en-US"
  | "es-ES"
  | "es-MX"
  | "fr"
  | "pt-BR"
  | "zh-CN"
  | "zh-Hant"
  | "ko"
  | "id"
  | "ms"
  | "da"
  | "de"
  | "vi"
  | "tr"
  | "cs"
  | "bg"
  | "ru"
  | "uk"
  | "ar"
  | "hi"
  | "th"
  | "ja"
  | "fil"
  | "it"
  | "hu"
  | "nl"
  | "no"
  | "pl"
  | "pt"
  | "ro"
  | "fi"
  | "sv";
type I18nHydrationState = {
  locale: LoadableLocale;
  resources: {
    translation: TranslationResource;
  };
};

declare global {
  interface Window {
    __EGDATA_I18N__?: I18nHydrationState;
  }
}

const localeLoaders: Record<LoadableLocale, () => Promise<TranslationResource>> = {
  "en-US": async () => enUS,
  "es-ES": () =>
    import("@/locales/es-ES/translation.json").then(
      (module) => module.default as TranslationResource,
    ),
  "es-MX": () =>
    import("@/locales/es-MX/translation.json").then(
      (module) => module.default as TranslationResource,
    ),
  fr: () =>
    import("@/locales/fr/translation.json").then((module) => module.default as TranslationResource),
  "pt-BR": () =>
    import("@/locales/pt-BR/translation.json").then(
      (module) => module.default as TranslationResource,
    ),
  "zh-CN": () =>
    import("@/locales/zh-CN/translation.json").then(
      (module) => module.default as TranslationResource,
    ),
  "zh-Hant": () =>
    import("@/locales/zh-Hant/translation.json").then(
      (module) => module.default as TranslationResource,
    ),
  ko: () =>
    import("@/locales/ko/translation.json").then((module) => module.default as TranslationResource),
  id: () =>
    import("@/locales/id/translation.json").then((module) => module.default as TranslationResource),
  ms: () =>
    import("@/locales/ms/translation.json").then((module) => module.default as TranslationResource),
  da: () =>
    import("@/locales/da/translation.json").then((module) => module.default as TranslationResource),
  de: () =>
    import("@/locales/de/translation.json").then((module) => module.default as TranslationResource),
  vi: () =>
    import("@/locales/vi/translation.json").then((module) => module.default as TranslationResource),
  tr: () =>
    import("@/locales/tr/translation.json").then((module) => module.default as TranslationResource),
  cs: () =>
    import("@/locales/cs/translation.json").then((module) => module.default as TranslationResource),
  bg: () =>
    import("@/locales/bg/translation.json").then((module) => module.default as TranslationResource),
  ru: () =>
    import("@/locales/ru/translation.json").then((module) => module.default as TranslationResource),
  uk: () =>
    import("@/locales/uk/translation.json").then((module) => module.default as TranslationResource),
  ar: () =>
    import("@/locales/ar/translation.json").then((module) => module.default as TranslationResource),
  hi: () =>
    import("@/locales/hi/translation.json").then((module) => module.default as TranslationResource),
  th: () =>
    import("@/locales/th/translation.json").then((module) => module.default as TranslationResource),
  ja: () =>
    import("@/locales/ja/translation.json").then((module) => module.default as TranslationResource),
  fil: () =>
    import("@/locales/fil/translation.json").then(
      (module) => module.default as TranslationResource,
    ),
  it: () =>
    import("@/locales/it/translation.json").then((module) => module.default as TranslationResource),
  hu: () =>
    import("@/locales/hu/translation.json").then((module) => module.default as TranslationResource),
  nl: () =>
    import("@/locales/nl/translation.json").then((module) => module.default as TranslationResource),
  no: () =>
    import("@/locales/no/translation.json").then((module) => module.default as TranslationResource),
  pl: () =>
    import("@/locales/pl/translation.json").then((module) => module.default as TranslationResource),
  pt: () =>
    import("@/locales/pt/translation.json").then((module) => module.default as TranslationResource),
  ro: () =>
    import("@/locales/ro/translation.json").then((module) => module.default as TranslationResource),
  fi: () =>
    import("@/locales/fi/translation.json").then((module) => module.default as TranslationResource),
  sv: () =>
    import("@/locales/sv/translation.json").then((module) => module.default as TranslationResource),
};

const pendingLocaleLoads = new Map<LoadableLocale, Promise<void>>();
const supportedLngs = SUPPORTED_LOCALES.map((l) => l.code);
let languageChangeRequestId = 0;
const browserHydrationState = getBrowserHydrationState();
const initialLocale = browserHydrationState?.locale ?? DEFAULT_LOCALE;
const initialResources: Record<string, { translation: TranslationResource }> = {
  ...resources,
};

if (browserHydrationState) {
  initialResources[browserHydrationState.locale] = browserHydrationState.resources;
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: initialResources,
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs,
    nonExplicitSupportedLangs: true,
    defaultNS: "translation",
    ns: ["translation"],
    initImmediate: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  } as Record<string, unknown>);
} else {
  i18n.addResourceBundle("en-US", "translation", enUS, true, true);
  if (browserHydrationState) {
    i18n.addResourceBundle(
      browserHydrationState.locale,
      "translation",
      browserHydrationState.resources.translation,
      true,
      true,
    );
  }
  i18n.changeLanguage(initialLocale);
}

function getLoadableLocale(locale?: string | null): LoadableLocale {
  if (locale && locale in localeLoaders) {
    return locale as LoadableLocale;
  }

  return DEFAULT_LOCALE;
}

function getBrowserHydrationState(): I18nHydrationState | undefined {
  if (typeof window === "undefined") return undefined;

  const state = window.__EGDATA_I18N__;

  if (
    state &&
    state.locale in localeLoaders &&
    state.resources &&
    typeof state.resources.translation === "object"
  ) {
    return state;
  }

  return undefined;
}

function serializeHydrationState(state: I18nHydrationState): string {
  return JSON.stringify(state).replace(/[<>&\u2028\u2029]/g, (char) => {
    switch (char) {
      case "<":
        return "\\u003c";
      case ">":
        return "\\u003e";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      case "\u2029":
        return "\\u2029";
      default:
        return char;
    }
  });
}

export async function ensureLocale(locale?: string | null): Promise<LoadableLocale> {
  const resolvedLocale = getLoadableLocale(locale);

  if (i18n.hasResourceBundle(resolvedLocale, "translation")) {
    return resolvedLocale;
  }

  let pendingLoad = pendingLocaleLoads.get(resolvedLocale);

  if (!pendingLoad) {
    pendingLoad = localeLoaders[resolvedLocale]()
      .then((translation) => {
        i18n.addResourceBundle(resolvedLocale, "translation", translation, true, true);
      })
      .finally(() => {
        pendingLocaleLoads.delete(resolvedLocale);
      });

    pendingLocaleLoads.set(resolvedLocale, pendingLoad);
  }

  await pendingLoad;

  return resolvedLocale;
}

export function getI18nHydrationScript(locale?: string | null): string | null {
  const resolvedLocale = getLoadableLocale(locale);

  if (resolvedLocale === DEFAULT_LOCALE || !i18n.hasResourceBundle(resolvedLocale, "translation")) {
    return null;
  }

  const translation = i18n.getResourceBundle(resolvedLocale, "translation") as TranslationResource;
  const state: I18nHydrationState = {
    locale: resolvedLocale,
    resources: {
      translation,
    },
  };

  return `window.__EGDATA_I18N__=${serializeHydrationState(state)};`;
}

export async function changeLanguage(locale?: string | null): Promise<LoadableLocale> {
  const requestId = ++languageChangeRequestId;
  const resolvedLocale = await ensureLocale(locale);

  if (typeof window !== "undefined" && requestId !== languageChangeRequestId) {
    return resolvedLocale;
  }

  if (i18n.language !== resolvedLocale) {
    await i18n.changeLanguage(resolvedLocale);
  }

  return resolvedLocale;
}

export default i18n;
