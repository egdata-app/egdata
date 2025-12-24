import { SearchContext, type SearchState } from "@/contexts/global-search";
import { useContext } from "react";

export function useSearch(): SearchState {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
