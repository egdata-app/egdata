import { createContext, type RefObject } from "react";

export interface SearchContextValue {
  inputRef: RefObject<HTMLInputElement | null>;
  setFocus: (focus: boolean) => void;
  toggleFocus: () => void;
}

export const defaultState: SearchContextValue = {
  inputRef: { current: null },
  setFocus: () => {},
  toggleFocus: () => {},
};

export const SearchContext = createContext<SearchContextValue | undefined>(undefined);
