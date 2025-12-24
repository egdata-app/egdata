import { useContext } from "react";
import { cookiesContext, type CookiesContextProps } from "@/contexts/cookies";

export const useCookiesContext = (): CookiesContextProps => {
  const context = useContext(cookiesContext);
  if (!context) {
    throw new Error("useCookiesContext must be used within a CookiesProvider");
  }
  return context;
};
