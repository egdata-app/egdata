import { httpClient } from "@/lib/http-client";
import { historicalLowsQueryKey, historicalLowsSearch } from "@/lib/historical-lows";
import { normalizeV1SearchResponse, toV1SearchParams, type V1SearchMeta } from "@/lib/v1-adapters";
import type { SingleOfferWithPrice } from "@/types/single-offer-price";

export { historicalLowsSearch } from "@/lib/historical-lows";

export function historicalLowsQueryOptions(country: string) {
  return {
    queryKey: historicalLowsQueryKey(country),
    queryFn: async () => {
      const envelope = await httpClient.v1GetEnvelope<SingleOfferWithPrice[], V1SearchMeta>(
        "/search",
        {
          params: toV1SearchParams(historicalLowsSearch, { country, facets: "none" }),
        },
      );
      return normalizeV1SearchResponse(envelope, 1, historicalLowsSearch.limit);
    },
    staleTime: 60_000,
  };
}
