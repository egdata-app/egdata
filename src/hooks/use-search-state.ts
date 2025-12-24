import { SearchDispatchContext, SearchStateContext } from "@/contexts/search";
import { useContext } from "react";

export function useSearchState() {
  const context = useContext(SearchStateContext);
  if (!context) {
    throw new Error("useSearchState must be used within a SearchProvider");
  }
  return context;
}

export function useSearchDispatch() {
  const context = useContext(SearchDispatchContext);
  if (!context) {
    throw new Error("useSearchDispatch must be used within a SearchProvider");
  }
  return context;
}
