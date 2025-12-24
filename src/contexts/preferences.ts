import { createContext } from "react";

export interface PreferencesState {
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}

export const PreferencesContext = createContext<PreferencesState | undefined>({
  view: "grid",
  setView: () => {},
});
