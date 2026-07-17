import { httpClient } from "@/lib/http-client";
import { historicalLowsQueryKey, historicalLowsSearch } from "@/lib/historical-lows";
import type { SearchV2Response } from "@/types/search-v2";

export { historicalLowsSearch } from "@/lib/historical-lows";

export function historicalLowsQueryOptions(country: string) {
  return {
    queryKey: historicalLowsQueryKey(country),
    queryFn: () =>
      httpClient.post<SearchV2Response>("/search/v2/search", historicalLowsSearch, {
        params: { country },
      }),
    staleTime: 60_000,
  };
}
