import { type ReactNode, useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { LocaleContext } from "@/contexts/locale";
import { DEFAULT_LOCALE, isRTL } from "@/lib/supported-locales";
import { changeLanguage as changeI18nLanguage } from "@/lib/i18n";

const DEFAULT_TIMEZONE = "UTC";

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: string | null;
  initialTimezone?: string | null;
}

function updateDocumentLocale(locale: string) {
  if (typeof document === "undefined") return;

  document.documentElement.lang = locale;
  document.documentElement.dir = isRTL(locale) ? "rtl" : "ltr";
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({
  children,
  initialLocale,
  initialTimezone,
}) => {
  const [locale, setLocaleState] = useState<string | undefined>(
    () => initialLocale || Cookies.get("user_locale") || DEFAULT_LOCALE,
  );
  const [timezone, setTimezone] = useState<string | undefined>(
    () => initialTimezone || Cookies.get("user_timezone") || DEFAULT_TIMEZONE,
  );

  const setLocale = (next: string) => {
    setLocaleState(next);
    updateDocumentLocale(next);
  };

  useEffect(() => {
    const nextLocale = locale ?? DEFAULT_LOCALE;
    let cancelled = false;

    updateDocumentLocale(nextLocale);

    void changeI18nLanguage(nextLocale)
      .then((resolvedLocale) => {
        if (cancelled) return;

        updateDocumentLocale(locale ?? resolvedLocale);
      })
      .catch((error: unknown) => {
        console.error("Failed to load locale", error);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (initialLocale || Cookies.get("user_locale")) return;

    const browserLocale = window.navigator.language;
    if (browserLocale && browserLocale !== locale) {
      setLocaleState(browserLocale);
      updateDocumentLocale(browserLocale);
    }
  }, [initialLocale, locale]);

  const checkAndUpdateTimezone = useCallback(() => {
    if (typeof window === "undefined") return;

    const currentTimezone = window.Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lastCheck = Cookies.get("timezone_last_check");
    const today = new Date().toDateString();

    // Update if timezone has changed or if it's a new day
    if (currentTimezone !== timezone || lastCheck !== today) {
      setTimezone(currentTimezone);
      Cookies.set("timezone_last_check", today);
    }
  }, [timezone]);

  // Initial timezone check and cookie setup
  useEffect(() => {
    // Save locale to cookie only if it differs from the current cookie value
    if (locale && Cookies.get("user_locale") !== locale) {
      Cookies.set("user_locale", locale, { expires: 365 }); // Set cookie with a 1-year expiry
    }
    if (timezone && Cookies.get("user_timezone") !== timezone) {
      Cookies.set("user_timezone", timezone, { expires: 7 });
    }
  }, [locale, timezone]);

  // Check timezone on page load and window focus
  useEffect(() => {
    // Check timezone on mount
    checkAndUpdateTimezone();

    // Add focus event listener
    const handleFocus = () => {
      checkAndUpdateTimezone();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkAndUpdateTimezone]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, timezone, setTimezone }}>
      {children}
    </LocaleContext.Provider>
  );
};
