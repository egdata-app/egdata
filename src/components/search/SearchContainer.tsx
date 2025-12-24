import { useEffect, useMemo, useRef } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { httpClient } from "@/lib/http-client";
import { getSearchStore, searchStoreManager } from "@/stores/searchStore";
import type { formSchema, SearchState } from "@/stores/searchStore";
import { useCountry } from "@/hooks/use-country";
import type { TypeOf } from "zod";
import type { FullTag } from "@/types/tags";
import type { AggregationBuckets, SearchV2Response } from "@/types/search-v2";
import { keepPreviousData } from "@tanstack/react-query";
import { SearchFilters } from "./SearchFilters";
import { SearchHeader } from "./SearchHeader";
import { SearchResults } from "./SearchResults";

export interface SearchContainerProps {
  contextId?: string; // Unique identifier for this search context
  initialSearch?: Partial<TypeOf<typeof formSchema>>;
  controls?: Partial<{
    showTitle: boolean;
    showTags: boolean;
    showDeveloper: boolean;
    showPublisher: boolean;
    showOfferType: boolean;
    showOnSale: boolean;
    showCodeRedemption: boolean;
    showBlockchain: boolean;
    showPastGiveaways: boolean;
    showSeller: boolean;
    showPrice: boolean;
  }>;
  fixedParams?: Partial<TypeOf<typeof formSchema>>;
  onSearchChange?: (search: TypeOf<typeof formSchema>) => void;
  title?: string;
}

const defaultControls = {
  showTitle: true,
  showTags: true,
  showDeveloper: true,
  showPublisher: true,
  showOfferType: true,
  showOnSale: true,
  showCodeRedemption: true,
  showBlockchain: true,
  showPastGiveaways: true,
  showSeller: true,
  showPrice: true,
  showLowestPrice: true,
};

const mergeSearchStates = (...states: Partial<SearchState>[]): Partial<SearchState> => {
  const result: Partial<SearchState> = {};
  for (const state of states) {
    for (const key in state) {
      const k = key as keyof SearchState;
      const resultValue = result[k];
      const stateValue = state[k];
      if (Array.isArray(resultValue) && Array.isArray(stateValue)) {
        (result as Record<keyof SearchState, unknown>)[k] = [
          ...new Set([...resultValue, ...stateValue]),
        ];
      } else if (stateValue !== undefined) {
        (result as Record<keyof SearchState, unknown>)[k] = stateValue;
      }
    }
  }
  return result;
};

export function SearchContainer({
  contextId,
  initialSearch = {},
  controls = {},
  fixedParams = {},
  onSearchChange,
  title = "Search",
}: SearchContainerProps) {
  // Get the appropriate store for this context with initial state
  const store = getSearchStore(contextId, mergeSearchStates(initialSearch, fixedParams));

  // Set up state
  const query = useStore(store) as TypeOf<typeof formSchema>;
  const setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void = (field, value) => {
    store.setState((prev) => {
      // If a filter changes (not the page itself), reset pagination to 1
      if (field !== "page" && field !== "limit") {
        return {
          ...prev,
          [field]: value,
          page: 1,
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  // Track previous search state to avoid infinite loops
  const prevSearchRef = useRef<TypeOf<typeof formSchema> | undefined>(undefined);

  // Track if component has been initialized to avoid overriding user changes
  const isInitializedRef = useRef(false);

  // Track if we should block onSearchChange during initial setup
  const blockOnSearchChangeRef = useRef(true);

  // On mount, mark as initialized and allow onSearchChange to run
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      // Allow onSearchChange to run after initialization is complete
      setTimeout(() => {
        blockOnSearchChangeRef.current = false;
      }, 0);
    }
  }, []); // Empty dependency array - only run once on mount

  // Debounce query for search
  const mergedQuery = useMemo(() => mergeSearchStates(query, fixedParams), [query, fixedParams]);
  const debouncedQuery = useDebounce(mergedQuery, 300);
  const { country } = useCountry();

  // Fetch search results
  const {
    data: results,
    isFetching,
    isLoading,
  } = useQuery({
    queryKey: ["search", contextId, debouncedQuery],
    queryFn: () =>
      httpClient.post<SearchV2Response>(`/search/v2/search?country=${country}`, debouncedQuery),
    placeholderData: keepPreviousData,
  });
  // Fetch tags
  const { data: tags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => httpClient.get<FullTag[]>("/search/tags?raw=true"),
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });

  // Compute tagTypes from tags
  const tagTypesDictionary = {
    event: "Event",
    genre: "Genre",
    epicfeature: "Epic Feature",
    accessibility: "Accessibility",
    feature: "Feature",
    usersay: "Usersay",
    subscription: "Subscription",
    platform: "Platform",
  };
  const tagTypes = Array.from(
    new Map(
      tags
        ?.filter((tag) => tag.groupName)
        .map((tag) => [
          tag.groupName,
          {
            name: tag.groupName,
            label: tagTypesDictionary[tag.groupName] ?? tag.groupName,
          },
        ]),
    ).values(),
  );

  // Helper type guard for priceAgg
  function isPriceStats(obj: unknown): obj is { min: number; max: number } {
    if (typeof obj !== "object" || obj === null) return false;
    return (
      Object.prototype.hasOwnProperty.call(obj, "min") &&
      typeof (obj as { min?: unknown }).min === "number" &&
      Object.prototype.hasOwnProperty.call(obj, "max") &&
      typeof (obj as { max?: unknown }).max === "number"
    );
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: isPriceStats would re-render this component
  const priceRange = useMemo(() => {
    const priceAgg = results?.aggregations?.price_stats;
    if (isPriceStats(priceAgg)) {
      return {
        ...priceAgg,
        // @ts-expect-error - TODO: fix this
        currency: results?.offers?.[0]?.price?.price?.currencyCode ?? "USD",
      };
    }
    return {
      min: 0,
      max: 1000,
      currency: "USD",
    };
  }, [results]);

  const parseAggregationBuckets = (
    aggregation: AggregationBuckets,
    transformKey?: (key: string) => string,
  ): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const bucket of aggregation?.buckets ?? []) {
      if (transformKey) {
        counts[transformKey(bucket.key)] = bucket.doc_count;
      } else {
        counts[bucket.key] = bucket.doc_count;
      }
    }
    return counts;
  };

  // Offer type counts
  const offerTypeCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.offerType as AggregationBuckets,
  );
  // Tag counts
  const tagCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.tags as AggregationBuckets,
    (key) => tags?.find((t) => t.name === key)?.id ?? key,
  );
  // Developer counts
  const developerCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.developer as AggregationBuckets,
  );
  // Publisher counts
  const publisherCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.publisher as AggregationBuckets,
  );

  // Controls (merge defaults with overrides)
  const mergedControls = { ...defaultControls, ...controls };

  // Notify parent of search changes - only when search actually changes and after initialization
  useEffect(() => {
    if (!onSearchChange || !isInitializedRef.current || blockOnSearchChangeRef.current) return;

    const currentSearch = { ...query, ...fixedParams };
    const prevSearch = prevSearchRef.current;

    // Only call onSearchChange if the search has actually changed
    if (!prevSearch || JSON.stringify(currentSearch) !== JSON.stringify(prevSearch)) {
      prevSearchRef.current = currentSearch;
      onSearchChange(currentSearch);
    }
  }, [query, fixedParams, onSearchChange]);

  // Cleanup store on unmount
  useEffect(() => {
    return () => {
      if (contextId) {
        searchStoreManager.removeStore(contextId);
      }
    };
  }, [contextId]);

  return (
    <div className="flex flex-col gap-4 min-h-screen w-full">
      <main className="flex flex-row flex-nowrap items-start justify-between gap-4">
        <SearchFilters
          query={query as TypeOf<typeof formSchema>}
          setField={setField}
          loading={isLoading}
          results={results}
          tags={tags ?? []}
          tagTypes={tagTypes}
          priceRange={priceRange}
          offerTypeCounts={offerTypeCounts}
          tagCounts={tagCounts}
          developerCounts={developerCounts}
          publisherCounts={publisherCounts}
          controls={mergedControls}
        />
        <div className="flex flex-col gap-4 w-full justify-start items-start relative">
          <SearchHeader
            query={query as TypeOf<typeof formSchema>}
            setField={setField}
            loading={isFetching}
            title={title}
            showSort={true}
            showViewToggle={true}
          />
          <SearchResults
            query={query as TypeOf<typeof formSchema>}
            setField={setField}
            loading={isLoading}
            results={results}
          />
        </div>
      </main>
    </div>
  );
}
