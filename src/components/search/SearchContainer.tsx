import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/lib/paraglide-react";
import { useDebounce } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { httpClient } from "@/lib/http-client";
import {
  fetchV1CursorPageAt,
  normalizeV1SearchResponse,
  toV1SearchParams,
  type NormalizedV1SearchResponse,
  type SearchFacetSection,
  type V1SearchMeta,
} from "@/lib/v1-adapters";
import { useSearchFacets } from "@/queries/search-facets";
import { DEFAULT_LIMIT, getSearchStore, searchStoreManager } from "@/stores/searchStore";
import type { formSchema, SearchState } from "@/stores/searchStore";
import { useCountry } from "@/hooks/use-country";
import type { TypeOf } from "zod";
import type { FullTag } from "@/types/tags";
import type { AggregationBuckets, Aggregations } from "@/types/search-v2";
import type { SingleOfferWithPrice } from "@/types/single-offer-price";
import { keepPreviousData } from "@tanstack/react-query";
import { SearchFilters } from "./SearchFilters";
import { SearchHeader } from "./SearchHeader";
import { SearchResults } from "./SearchResults";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";

export interface SearchContainerProps {
  contextId?: string; // Unique identifier for this search context
  initialSearch?: Partial<TypeOf<typeof formSchema>>;
  controls?: Partial<{
    showTitle: boolean;
    showTags: boolean;
    showTechnologies: boolean;
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
  showTechnologies: true,
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
  showLowestPriceEver: true,
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
  title,
}: SearchContainerProps) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Get the appropriate store for this context with initial state
  const store = getSearchStore(contextId, mergeSearchStates(initialSearch, fixedParams));

  // Set up state
  const query = useStore(store, (state) => state) as TypeOf<typeof formSchema>;
  const setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void = (field, value) => {
    // Scroll to the top when filters, sorting, or pagination change.
    // Skip "title" so typing in the search box doesn't yank the scroll position.
    if (field !== "title") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

  // Debounce query for search
  const mergedQuery = useMemo(
    () => ({ ...query, ...fixedParams }) as Partial<SearchState>,
    [query, fixedParams],
  );
  const debouncedQuery = useDebounce(mergedQuery, 300);
  const { country } = useCountry();

  // Facets are requested per accordion section instead of with every result page.
  const showPrice = controls.showPrice ?? true;
  const [facetSections, setFacetSections] = useState<SearchFacetSection[]>([]);
  const requestFacetSection = useCallback((section: SearchFacetSection) => {
    setFacetSections((prev) => (prev.includes(section) ? prev : [...prev, section]));
  }, []);

  useEffect(() => {
    if (showPrice) {
      requestFacetSection("price");
    }
  }, [showPrice, requestFacetSection]);

  const { aggregations: facetAggregations, pendingSections: pendingFacetSections } =
    useSearchFacets({
      query: debouncedQuery,
      country,
      sections: facetSections,
    });

  // Fetch search results
  const {
    data: results,
    isFetching,
    isLoading,
  } = useQuery<NormalizedV1SearchResponse>({
    queryKey: ["search", contextId, country, debouncedQuery],
    queryFn: async ({ signal }) => {
      const targetPage = debouncedQuery.page ?? 1;
      const limit = debouncedQuery.limit ?? DEFAULT_LIMIT;
      const { page: _ignoredPage, ...filterKey } = debouncedQuery;
      const scopeKey = `search:${contextId ?? "default"}:${country}:${JSON.stringify(filterKey)}`;
      const { envelope, resolvedPage } = await fetchV1CursorPageAt<
        SingleOfferWithPrice[],
        V1SearchMeta
      >(
        (cursor) =>
          httpClient.v1GetEnvelope<SingleOfferWithPrice[], V1SearchMeta>("/search", {
            params: toV1SearchParams(debouncedQuery, {
              country,
              cursor,
              facets: "none",
              fields: "card",
            }),
            signal,
          }),
        targetPage,
        scopeKey,
      );
      return normalizeV1SearchResponse(envelope, resolvedPage, limit);
    },
    placeholderData: keepPreviousData,
  });
  // Fetch tags
  const { data: tags } = useQuery({
    queryKey: ["all-tags"],
    queryFn: () => httpClient.v1Get<FullTag[]>("/search/tags"),
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });

  // Compute tagTypes from tags
  const tagTypesDictionary = {
    event: t("search.tagGroups.event"),
    genre: t("search.tagGroups.genre"),
    epicfeature: t("search.tagGroups.epicfeature"),
    accessibility: t("search.tagGroups.accessibility"),
    feature: t("search.tagGroups.feature"),
    usersay: t("search.tagGroups.usersay"),
    subscription: t("search.tagGroups.subscription"),
    platform: t("search.tagGroups.platform"),
  };
  const tagTypes = Array.from(
    new Map(
      tags
        ?.filter((tag) => tag.groupName)
        .map((tag) => [
          tag.groupName,
          {
            name: tag.groupName,
            label:
              tagTypesDictionary[tag.groupName as keyof typeof tagTypesDictionary] ?? tag.groupName,
          },
        ]),
    ).values(),
  );

  // Search responses no longer carry aggregations; facet sections hydrate this.
  const mergedAggregations = {
    ...results?.aggregations,
    ...facetAggregations,
  } as Aggregations;

  // Helper type guard for priceAgg
  function isPriceStats(obj: unknown): obj is { min: number; max: number; count?: number } {
    if (typeof obj !== "object" || obj === null) return false;
    return (
      Object.prototype.hasOwnProperty.call(obj, "min") &&
      typeof (obj as { min?: unknown }).min === "number" &&
      Object.prototype.hasOwnProperty.call(obj, "max") &&
      typeof (obj as { max?: unknown }).max === "number"
    );
  }

  const priceAgg = mergedAggregations.price_stats;
  const priceRange =
    isPriceStats(priceAgg) && (priceAgg.count ?? 0) > 0
      ? {
          ...priceAgg,
          currency: results?.offers?.[0]?.price?.price?.currencyCode ?? "USD",
        }
      : {
          min: 0,
          max: 1000,
          currency: "USD",
        };

  const parseAggregationBuckets = (
    aggregation?: AggregationBuckets,
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
    mergedAggregations.offerType as AggregationBuckets,
  );
  // Tag counts
  const tagCounts: Record<string, number> = parseAggregationBuckets(
    mergedAggregations.tags as AggregationBuckets,
    (key) => tags?.find((t) => t.name === key)?.id ?? key,
  );
  // Technology counts
  const technologyCounts: Record<string, number> = parseAggregationBuckets(
    mergedAggregations.technologies,
  );
  // Developer counts
  const developerCounts: Record<string, number> = parseAggregationBuckets(
    mergedAggregations.developer as AggregationBuckets,
  );
  // Publisher counts
  const publisherCounts: Record<string, number> = parseAggregationBuckets(
    mergedAggregations.publisher as AggregationBuckets,
  );

  // Controls (merge defaults with overrides)
  const mergedControls = { ...defaultControls, ...controls };
  const editableFilterValues: Array<[boolean, unknown]> = [
    [mergedControls.showTags, query.tags],
    [mergedControls.showTechnologies, query.technologies],
    [mergedControls.showDeveloper, query.developerDisplayName],
    [mergedControls.showPublisher, query.publisherDisplayName],
    [mergedControls.showOfferType, query.offerType],
    [mergedControls.showOnSale, query.onSale],
    [mergedControls.showCodeRedemption, query.isCodeRedemptionOnly],
    [mergedControls.showBlockchain, query.excludeBlockchain],
    [mergedControls.showPastGiveaways, query.pastGiveaways],
    [mergedControls.showSeller, query.seller],
    [mergedControls.showPrice, query.price],
    [mergedControls.showLowestPrice, query.isLowestPrice],
    [mergedControls.showLowestPriceEver, query.isLowestPriceEver],
  ];
  const activeFilterCount = editableFilterValues.reduce((count, [editable, value]) => {
    if (!editable) return count;
    if (Array.isArray(value)) {
      return count + value.length;
    }

    return value === undefined || value === false || value === null ? count : count + 1;
  }, 0);

  const filtersPanel = (
    <SearchFilters
      query={query as TypeOf<typeof formSchema>}
      setField={setField}
      loading={isLoading}
      tags={tags ?? []}
      tagTypes={tagTypes}
      priceRange={priceRange}
      offerTypeCounts={offerTypeCounts}
      tagCounts={tagCounts}
      technologyCounts={technologyCounts}
      developerCounts={developerCounts}
      publisherCounts={publisherCounts}
      controls={mergedControls}
      onFacetSectionOpen={requestFacetSection}
      pendingFacetSections={pendingFacetSections}
    />
  );

  // Notify parent of search changes - only when search actually changes and after initialization
  useEffect(() => {
    if (!onSearchChange) return;

    const currentSearch = { ...query, ...fixedParams };
    const prevSearch = prevSearchRef.current;

    if (!prevSearch) {
      prevSearchRef.current = currentSearch;
      return;
    }

    // Only call onSearchChange if the search has actually changed
    if (JSON.stringify(currentSearch) !== JSON.stringify(prevSearch)) {
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
    <div className="flex min-h-screen w-full flex-col gap-4 px-4 md:px-0">
      <main className="flex flex-col items-stretch gap-4 md:flex-row md:flex-nowrap md:items-start md:justify-between">
        <div className="hidden md:block">{filtersPanel}</div>
        <div className="flex w-full min-w-0 flex-col items-start justify-start gap-4 relative">
          <SearchHeader
            query={query as TypeOf<typeof formSchema>}
            setField={setField}
            loading={isFetching}
            title={title ?? t("search.defaultTitle")}
            showSort={true}
            showViewToggle={true}
            mobileFilterButton={
              <SheetTrigger isOpen={filtersOpen} onOpenChange={setFiltersOpen}>
                <Button variant="outline" size="sm" className="gap-2 md:hidden">
                  <SlidersHorizontal className="size-4" />
                  <span>{t("search.filters")}</span>
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <SheetContent side="left" className="w-[min(92vw,24rem)] overflow-y-auto p-4">
                  <SheetHeader className="mb-4 border-b border-border/50 pb-4 text-left">
                    <SheetTitle>{t("search.filters")}</SheetTitle>
                  </SheetHeader>
                  {filtersPanel}
                </SheetContent>
              </SheetTrigger>
            }
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
