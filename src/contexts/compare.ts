import { createContext } from "react";

export interface CompareContextType {
  compare: string[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
}

export const CompareContext = createContext<CompareContextType>({
  compare: [],
  addToCompare: () => {},
  removeFromCompare: () => {},
});
