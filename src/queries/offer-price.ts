import { httpClient, type V1Envelope } from "@/lib/http-client";
import { fetchAllV1CursorPages, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import type { Price } from "@/types/price";

interface PriceHistory {
  [key: string]: Price[];
}

export async function fetchOfferPrice({ id }: { id: string }) {
  return httpClient.v1Get<PriceHistory>(`/offers/${id}/price-history`);
}

export async function getOfferPriceHistoryByRegion({
  id,
  region,
  since,
}: {
  id: string;
  region: string;
  since?: string;
}): Promise<Price[]> {
  return fetchAllV1CursorPages((cursor) =>
    httpClient.get<V1Envelope<Price[], V1CursorPaginationMeta>>(`/v1/offers/${id}/price-history`, {
      params: {
        region,
        since,
        limit: 100,
        cursor,
      },
    }),
  );
}
