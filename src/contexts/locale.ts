import { createContext } from "react";

export interface LocaleContextProps {
  locale: string | undefined;
  timezone: string | undefined;
  setLocale: (locale: string) => void;
  setTimezone: (timezone: string) => void;
}

export const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);
