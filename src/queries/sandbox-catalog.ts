import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { sandboxCatalogTypes, type SandboxCatalogSearch } from "@/lib/sandbox-catalog";
import type { SingleOffer } from "@/types/single-offer";

export type SandboxCatalogResponse = {
  elements: SingleOffer[];
  count: number;
  page: number;
  limit: number;
};

export function sandboxCatalogQueryOptions(
  id: string,
  search: Pick<SandboxCatalogSearch, "q" | "group" | "types" | "page" | "pageSize">,
  country: string,
) {
  const params = {
    page: search.page,
    limit: search.pageSize,
    title: search.q.trim() || undefined,
    offerType: sandboxCatalogTypes(search),
    country,
  };
  return queryOptions({
    queryKey: ["sandbox", "catalog", id, params],
    queryFn: ({ signal }) =>
      httpClient.get<SandboxCatalogResponse>(`/sandboxes/${id}/offers`, { params, signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
