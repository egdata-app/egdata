import { type ReactNode, useEffect, useState } from "react";
import { cookiesContext, type CookiesSelection } from "@/contexts/cookies";
import { useCookies as useCookiesClient } from "react-cookie";
import { CookieBanner } from "@/components/app/cookies";
import { Base64Utils } from "@/lib/base-64";
import { GoogleAnalytics } from "@/components/app/google-analytics";
import { AhrefsAnalytics } from "@/components/app/ahrefs-analytics";

export interface CookiesProviderProps {
  children: ReactNode;
  initialSelection: CookiesSelection | null;
}

/**
 * The cookie is a base64 encoded string of the JSON object
 */
const decodeCookie = (cookie: string): CookiesSelection | null => {
  try {
    return JSON.parse(Base64Utils.decode(cookie)) as CookiesSelection;
  } catch (error) {
    console.error("Failed to decode cookie", error);
    return null;
  }
};

export function CookiesProvider({ children, initialSelection }: CookiesProviderProps) {
  const [cookies, setCookie] = useCookiesClient(["EGDATA_COOKIES_2"]);
  const [selection, setSelection] = useState<CookiesSelection | null>(initialSelection ?? null);

  useEffect(() => {
    if (cookies.EGDATA_COOKIES_2) {
      const decodedCookie = decodeCookie(cookies.EGDATA_COOKIES_2);
      if (decodedCookie) {
        setSelection(decodedCookie);
      }
    }
  }, [cookies.EGDATA_COOKIES_2]);

  useEffect(() => {
    if (selection) {
      setCookie("EGDATA_COOKIES_2", Base64Utils.encode(JSON.stringify(selection)), {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
        domain: import.meta.env.PROD ? ".egdata.app" : "localhost",
      });
    }
  }, [selection, setCookie]);

  const acceptCookies = () => {
    setSelection({
      googleAnalytics: true,
      selfHostedAnalytics: true,
      ahrefsAnalytics: true,
      googleConsent: {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
        functionality_storage: "granted",
        personalization_storage: "granted",
        security_storage: "granted",
      },
    });
  };

  const declineCookies = () => {
    setSelection({
      googleAnalytics: false,
      selfHostedAnalytics: false,
      ahrefsAnalytics: false,
      googleConsent: {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        functionality_storage: "denied",
        personalization_storage: "denied",
        security_storage: "denied",
      },
    });
  };

  return (
    <cookiesContext.Provider
      value={{
        selection,
        setSelection,
        acceptCookies,
        declineCookies,
      }}
    >
      {children}
      {!selection && <CookieBanner />}
      {selection?.googleAnalytics && (
        <GoogleAnalytics tagId="G-HB0VNVBEDQ" consentSettings={selection.googleConsent} />
      )}
      {selection?.ahrefsAnalytics && <AhrefsAnalytics tagId="f5ZfWIYM8MP8bKgYntptug" />}
    </cookiesContext.Provider>
  );
}
