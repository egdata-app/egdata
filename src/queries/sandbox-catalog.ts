import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { pickKeyImages, slimPrice, toArray } from "@/lib/offer-projections";
import { fetchV1CursorPageAt, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import { sandboxCatalogTypes, type SandboxCatalogSearch } from "@/lib/sandbox-catalog";
import type { Price } from "@/types/price";
import type { KeyImage, Seller, SingleOffer } from "@/types/single-offer";

/**
 * Sandbox catalog rows are cards (and a compact table), so only identity,
 * classification, one image and the price are kept. The endpoint otherwise
 * returns full store documents (~9 KB per offer).
 */
export type SandboxCatalogOffer = {
  id: string;
  title: string;
  offerType: string | null;
  prePurchase: boolean | null;
  lastModifiedDate: string | null;
  seller: Seller | null;
  keyImages: KeyImage[];
  price: Price | null;
};

export type SandboxCatalogResponse = {
  elements: SandboxCatalogOffer[];
  count: number | null;
  page: number;
  limit: number;
  hasMore: boolean;
};

const CARD_IMAGES = [
  "OfferImageWide",
  "DieselStoreFrontWide",
  "DieselGameBoxWide",
  "Thumbnail",
  "OfferImageTall",
];

function projectCatalogOffer(offer: SingleOffer): SandboxCatalogOffer {
  return {
    id: offer.id,
    title: offer.title,
    offerType: offer.offerType ?? null,
    prePurchase: offer.prePurchase ?? null,
    lastModifiedDate: offer.lastModifiedDate ?? null,
    seller: offer.seller ? { id: offer.seller.id, name: offer.seller.name } : null,
    keyImages: pickKeyImages(offer.keyImages, [CARD_IMAGES]),
    price: slimPrice(offer.price),
  };
}

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

      return {
        elements: toArray(envelope?.data).map(projectCatalogOffer),
        count: total,
        page: resolvedPage,
        limit: envelope?.meta?.pagination?.limit ?? limit,
        hasMore,
      } satisfies SandboxCatalogResponse;
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
