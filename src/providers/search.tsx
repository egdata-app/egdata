import { SearchDispatchContext, SearchStateContext } from "@/contexts/search";
import { useCountry } from "@/hooks/use-country";
import { httpClient } from "@/lib/http-client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type PropsWithChildren, useMemo, useState } from "react";

export type CountData = {
  tagCounts: Array<{ _id: string; count: number }>;
  offerTypeCounts: Array<{ _id: string; count: number }>;
  total: number;
  developer: Array<{ _id: string; count: number }>;
  publisher: Array<{ _id: string; count: number }>;
  priceRange: {
    minPrice: number;
    maxPrice: number;
    currency: string;
  };
};

// biome-ignore lint/complexity/noBannedTypes: the props are empty
export function SearchProvider({ children }: PropsWithChildren<{}>) {
  const { country } = useCountry();
  const [hash, setHash] = useState<string>("");
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [isFetching, setIsFetching] = useState(false);

  // Centralized count data fetching function
  const fetchCountData = async () => {
    const data = await httpClient.get<CountData>(`/search/${hash}/count`, {
      params: { country },
    });
    return data;
  };

  const {
    data: countData,
    isLoading: isFetchingCounts,
    error,
  } = useQuery({
    queryKey: ["count", { hash, country }],
    queryFn: fetchCountData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
    enabled: !!hash,
  });

  const transformCounts = <T extends { _id: string; count: number }>(
    counts: T[] | undefined,
  ): Record<string, number> =>
    counts?.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    ) || {};

  // biome-ignore lint/correctness/useExhaustiveDependencies: avoid re-renders
  const stateValue = useMemo(
    () => ({
      totalCount: countData?.total || 0,
      tagCounts: transformCounts(countData?.tagCounts),
      offerTypeCounts: transformCounts(countData?.offerTypeCounts),
      developerCounts: transformCounts(countData?.developer),
      publisherCounts: transformCounts(countData?.publisher),
      isFetchingCounts,
      priceRange: countData?.priceRange
        ? {
            currency: countData.priceRange.currency,
            min: countData.priceRange.minPrice,
            max: countData.priceRange.maxPrice,
          }
        : { min: 0, max: 0, currency: "" },
      currentPageNumber,
      hash,
      isFetching,
    }),
    [countData, isFetchingCounts, currentPageNumber, hash, isFetching],
  );

  // Dispatch functions
  const dispatchValue = useMemo(
    () => ({
      setCurrentPageNumber,
      setHash,
      setIsFetching,
    }),
    [],
  );

  // Optional: Log any errors
  if (error) {
    console.error("Error fetching count data:", error);
  }

  return (
    <SearchStateContext.Provider value={stateValue}>
      <SearchDispatchContext.Provider value={dispatchValue}>
        {children}
      </SearchDispatchContext.Provider>
    </SearchStateContext.Provider>
  );
}
