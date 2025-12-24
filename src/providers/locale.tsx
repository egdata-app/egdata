import { type ReactNode, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { LocaleContext } from "@/contexts/locale";

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale?: string | null;
  initialTimezone?: string | null;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({
  children,
  initialLocale,
  initialTimezone,
}) => {
  const [locale, setLocale] = useState<string | undefined>(
    () =>
      initialLocale ||
      Cookies.get("user_locale") ||
      (typeof window !== "undefined" ? window.navigator.language : undefined),
  );
  const [timezone, setTimezone] = useState<string | undefined>(
    () =>
      initialTimezone ||
      Cookies.get("user_timezone") ||
      (typeof window !== "undefined"
        ? window.Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined),
  );

  const checkAndUpdateTimezone = () => {
    if (typeof window === "undefined") return;

    const currentTimezone = window.Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lastCheck = Cookies.get("timezone_last_check");
    const today = new Date().toDateString();

    // Update if timezone has changed or if it's a new day
    if (currentTimezone !== timezone || lastCheck !== today) {
      setTimezone(currentTimezone);
      Cookies.set("timezone_last_check", today);
    }
  };

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
  }, [timezone]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, timezone, setTimezone }}>
      {children}
    </LocaleContext.Provider>
  );
};
