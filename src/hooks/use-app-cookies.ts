import { useContext } from "react";
import type { CookiesContextProps } from "@/context/cookies";
import { CookiesContext } from "@/context/cookies-context";

export const useCookiesContext = (): CookiesContextProps => {
  const context = useContext(CookiesContext);
  if (!context) {
    throw new Error("useCookiesContext must be used within a CookiesProvider");
  }
  return context;
};
