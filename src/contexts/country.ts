import { createContext } from "react";

type CountryState = {
  country: string;
  setCountry: (country: string) => void;
};

export const defaultState: CountryState = {
  country: "US",
  setCountry: () => {},
};

export const CountryContext = createContext<CountryState | undefined>(undefined);
