import { useQueries } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import {
  normalizeV1SearchFacetsResponse,
  toV1SearchFacetParams,
  type SearchFacetSection,
  type V1SearchFacetSectionsMeta,
  type V1SearchQueryInput,
} from "@/lib/v1-adapters";
import type { Aggregations } from "@/types/search-v2";

/** Search state accepted by the facets query; pagination is irrelevant and stripped. */
export type SearchFacetQuery = V1SearchQueryInput & {
  page?: number;
  limit?: number;
};

/**
 * Loads one `GET /v1/search/facets` request per requested section, so accordion
 * panels only pay for their own aggregation. Results are merged into the
 * `Aggregations` shape consumed by the search filters UI.
 */
export function useSearchFacets({
  query,
  country,
  sections,
}: {
  query: SearchFacetQuery;
  country?: string;
  sections: SearchFacetSection[];
}): {
  aggregations: Aggregations;
  isLoading: boolean;
  isFetching: boolean;
  pendingSections: SearchFacetSection[];
} {
  const { page: _page, limit: _limit, facets: _facets, cursor: _cursor, ...facetQuery } = query;

  const queries = useQueries({
    queries: sections.map((section) => ({
      queryKey: ["search-facets", country ?? "US", facetQuery, section],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const envelope = await httpClient.v1GetEnvelope<
          Record<string, unknown>,
          V1SearchFacetSectionsMeta
        >("/search/facets", {
          params: toV1SearchFacetParams(facetQuery, { country, sections: [section] }),
          signal,
        });
        return normalizeV1SearchFacetsResponse(envelope, [section]);
      },
      staleTime: 60_000,
      retry: false,
    })),
  });

  const aggregations: Aggregations = {
    price_stats: { count: 0, min: 0, max: 0, avg: 0, sum: 0 },
    technologies: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
  };
  for (const facetQueryResult of queries) {
    if (facetQueryResult.data) {
      Object.assign(aggregations, facetQueryResult.data.aggregations);
    }
  }

  return {
    aggregations,
    isLoading: queries.some((facetQueryResult) => facetQueryResult.isLoading),
    isFetching: queries.some((facetQueryResult) => facetQueryResult.isFetching),
    pendingSections: sections.filter((_section, index) => queries[index]?.isLoading === true),
  };
}
