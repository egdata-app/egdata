import type React from "react";
import { createContext } from "react";

interface SearchState {
  isFetching: boolean;
  isFetchingCounts: boolean;
  totalCount: number;
  tagCounts: Record<string, number>;
  offerTypeCounts: Record<string, number>;
  developerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  currentPageNumber: number;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  hash: string;
}

interface SearchActions {
  setIsFetching: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentPageNumber: React.Dispatch<React.SetStateAction<number>>;
  setHash: React.Dispatch<React.SetStateAction<string>>;
}

export const SearchStateContext = createContext<SearchState | undefined>(undefined);
export const SearchDispatchContext = createContext<SearchActions | undefined>(undefined);
