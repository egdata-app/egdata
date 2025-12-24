import { useState, type ReactNode } from "react";
import { CookiesProvider, useCookies } from "react-cookie";
import { useLocation } from "@tanstack/react-router";
import { CountryContext } from "@/contexts/country";
import getCountryCode from "@/lib/country-code";

export interface CountryState {
  country: string;
  setCountry: (country: string) => void;
}

interface CountryProviderProps {
  children: ReactNode;
  defaultCountry: string;
}

function CountryProvider({ children, defaultCountry }: CountryProviderProps) {
  const location = useLocation();
  const url = new URL(`https://dummy${location.pathname}${location.search}`);

  const [cookies, setCookie] = useCookies(["EGDATA_COUNTRY"]);
  const [countryState, setCountryState] = useState<string>(
    defaultCountry ?? getCountryCode(url, cookies),
  );

  const handleCountry = (selectedCountry: string) => {
    setCookie("EGDATA_COUNTRY", selectedCountry, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      domain: ".egdata.app",
    });
    if (import.meta.env.DEV) {
      setCookie("EGDATA_COUNTRY", selectedCountry, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
        domain: "localhost",
      });
    }
    setCountryState(selectedCountry);
  };

  return (
    <CookiesProvider>
      <CountryContext.Provider
        value={{
          country: countryState,
          setCountry: handleCountry,
        }}
      >
        {children}
      </CountryContext.Provider>
    </CookiesProvider>
  );
}

export { CountryProvider };
