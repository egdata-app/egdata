import { useContext } from "react";
import { cookiesContext } from "@/contexts/cookies";

export const useCookies = () => {
  const context = useContext(cookiesContext);
  if (context === undefined) {
    throw new Error("useCookies must be used within a CookiesProvider");
  }
  return context;
};
