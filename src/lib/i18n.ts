import { useCallback, useSyncExternalStore } from "react";
import { m } from "@/paraglide/messages.js";
import {
  baseLocale,
  getLocale,
  setLocale as setParaglideLocale,
  toLocale,
  type Locale,
} from "@/paraglide/runtime.js";

type MessageParams = Record<string, unknown> & {
  defaultValue?: unknown;
};

type MessageFunction = (inputs?: Record<string, unknown>) => string;
type MessageCatalog = Record<string, MessageFunction | undefined>;

const messages = m as unknown as MessageCatalog;
const subscribers = new Set<() => void>();

function normalizeLocale(locale?: string | null): Locale {
  if (!locale) return baseLocale;

  const exact = toLocale(locale);
  if (exact) return exact;

  const language = locale.split("-")[0];
  return toLocale(language) ?? baseLocale;
}

function emitLocaleChange() {
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

export type TFunction = {
  (key: string | readonly string[], params?: MessageParams): string;
};

export const t: TFunction = (key, params = {}) => {
  const keys = Array.isArray(key) ? key : [key];

  for (const candidate of keys) {
    const message = messages[candidate];
    if (!message) continue;

    return message(params);
  }

  if (params.defaultValue != null) {
    return String(params.defaultValue);
  }

  return String(keys[0] ?? "");
};

export function exists(key: string): boolean {
  return typeof messages[key] === "function";
}

export async function ensureLocale(locale?: string | null): Promise<Locale> {
  return normalizeLocale(locale);
}

export async function changeLanguage(locale?: string | null): Promise<Locale> {
  const resolvedLocale = normalizeLocale(locale);

  if (typeof window !== "undefined") {
    await setParaglideLocale(resolvedLocale, { reload: false });
    document.documentElement.lang = resolvedLocale;
  }

  emitLocaleChange();
  return resolvedLocale;
}

export function useTranslation() {
  useSyncExternalStore(subscribe, getLocale, getLocale);

  const translate = useCallback<TFunction>((key, params) => t(key, params), []);

  return {
    t: translate,
    i18n: i18nCompat,
  };
}

const i18nCompat = {
  get language() {
    return getLocale();
  },
  t,
  exists,
  changeLanguage,
};

export default i18nCompat;
