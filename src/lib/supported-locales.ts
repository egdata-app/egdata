export interface SupportedLocale {
  code: string;
  name: string;
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ms", name: "Bahasa Melayu" },
  { code: "da", name: "Dansk" },
  { code: "de", name: "Deutsch" },
  { code: "en-US", name: "English" },
  { code: "es-ES", name: "Español" },
  { code: "es-MX", name: "Español (Latinoamérica)" },
  { code: "fil", name: "Filipino" },
  { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" },
  { code: "hu", name: "Magyar" },
  { code: "nl", name: "Nederlands" },
  { code: "no", name: "Norsk" },
  { code: "pl", name: "Polski" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "pt", name: "Português Europeu" },
  { code: "ro", name: "Română" },
  { code: "fi", name: "Suomi" },
  { code: "sv", name: "Svenska" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "tr", name: "Türkçe" },
  { code: "cs", name: "Čeština" },
  { code: "bg", name: "Български" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
  { code: "th", name: "ไทย" },
  { code: "ja", name: "日本語" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-Hant", name: "繁體中文" },
  { code: "ko", name: "한국어" },
];

export const DEFAULT_LOCALE = "en-US";

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

export function isRTL(code: string): boolean {
  const base = code.split("-")[0];
  return RTL_LOCALES.has(base);
}

export function getLocaleName(code: string): string {
  const entry = SUPPORTED_LOCALES.find((l) => l.code === code);
  return entry?.name ?? code;
}

export function isSupportedLocale(code: string): boolean {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}
