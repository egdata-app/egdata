import type { ConsentSettings } from "@/components/app/google-analytics";
import { createContext } from "react";

export interface CookiesSelection {
  googleAnalytics: boolean;
  selfHostedAnalytics: boolean;
  googleConsent: ConsentSettings;
  ahrefsAnalytics: boolean;
}

export interface CookiesContextProps {
  /**
   * User selection of cookies, if null, the user has not yet made a selection
   */
  selection: CookiesSelection | null;
  setSelection: (selection: CookiesSelection) => void;
  /**
   * Accept all cookies with default settings
   */
  acceptCookies: () => void;
  /**
   * Decline all cookies
   */
  declineCookies: () => void;
}

export const cookiesContext = createContext<CookiesContextProps | undefined>(undefined);
