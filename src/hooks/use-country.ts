import { CountryContext } from "@/contexts/country";
import type { CountryState } from "@/providers/country";
import { useContext } from "react";

export function useCountry(): CountryState {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
}
