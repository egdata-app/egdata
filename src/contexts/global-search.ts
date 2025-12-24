import { createContext } from "react";

export interface SearchState {
  focus: boolean;
  query: string;
  results: Element[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  setQuery: (query: string) => void;
  setFocus: (focus: boolean) => void;
}

export const defaultState: SearchState = {
  focus: false,
  query: "",
  results: [],
  inputRef: { current: null },
  setQuery: () => {},
  setFocus: () => {},
};

export const SearchContext = createContext<SearchState | undefined>(undefined);
