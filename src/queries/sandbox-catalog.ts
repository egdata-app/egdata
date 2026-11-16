import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { fetchV1CursorPageAt, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import { sandboxCatalogTypes, type SandboxCatalogSearch } from "@/lib/sandbox-catalog";
import type { SingleOffer } from "@/types/single-offer";

export type SandboxCatalogResponse = {
  elements: SingleOffer[];
  count: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export function sandboxCatalogQueryOptions(
  id: string,
  search: Pick<SandboxCatalogSearch, "q" | "group" | "types" | "page" | "pageSize">,
  country: string,
) {
  const title = search.q.trim() || undefined;
  const offerType = sandboxCatalogTypes(search);
  const limit = search.pageSize;
  const params = {
    page: search.page,
    limit,
    title,
    offerType,
    country,
  };
  const scopeKey = `sandbox-offers:${id}:${country}:${limit}:${title ?? ""}:${offerType ?? ""}`;

  return queryOptions({
    queryKey: ["sandbox", "catalog", id, params],
    queryFn: async ({ signal }) => {
      const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
        SingleOffer[],
        V1CursorPaginationMeta
      >(
        (cursor) =>
          httpClient.v1GetEnvelope<SingleOffer[], V1CursorPaginationMeta>(
            `/sandboxes/${id}/offers`,
            {
              params: {
                cursor,
                limit,
                title,
                offerType,
                country,
              },
              signal,
            },
          ),
        search.page,
        scopeKey,
      );
      const elements = Array.isArray(envelope?.data) ? envelope.data : [];
      return {
        elements,
        count: total ?? elements.length,
        page: resolvedPage,
        limit: envelope?.meta?.pagination?.limit ?? limit,
        hasMore,
      } satisfies SandboxCatalogResponse;
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
