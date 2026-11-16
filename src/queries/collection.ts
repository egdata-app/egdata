import { httpClient } from "@/lib/http-client";
import { getV1PaginationTotal, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import type { SingleOffer } from "@/types/single-offer";

export interface OfferWithTops extends SingleOffer {
  position: number;
  previousPosition: number;
  metadata: {
    _id: string;
    position: number;
    timesInTop1: number;
    timesInTop5: number;
    timesInTop10: number;
    timesInTop20: number;
    timesInTop50: number;
    timesInTop100: number;
    previous: number;
  };
}

export interface Collections {
  elements: OfferWithTops[];
  limit: number;
  page: number;
  total: number;
  title: string;
  start?: string;
  end?: string;
  hasMore: boolean;
  nextCursor: string | null;
}

type CollectionMeta = V1CursorPaginationMeta & {
  title?: string;
  start?: string;
  end?: string;
};

export const getCollection = async ({
  slug,
  limit,
  page = 1,
  cursor,
  country,
  week,
}: {
  slug: string;
  limit: number;
  page?: number;
  cursor?: string;
  country: string;
  week?: string;
}): Promise<Collections> => {
  const envelope = await httpClient.v1GetEnvelope<OfferWithTops[], CollectionMeta>(
    !week ? `/collections/${slug}` : `/collections/${slug}/${week}`,
    {
      params: {
        country,
        cursor,
        limit,
      },
    },
  );

  const elements = Array.isArray(envelope?.data) ? envelope.data : [];
  const pagination = envelope?.meta?.pagination;

  return {
    elements,
    limit: pagination?.limit ?? limit,
    page,
    total: getV1PaginationTotal(pagination, elements.length),
    title: envelope?.meta?.title ?? slug,
    start: envelope?.meta?.start,
    end: envelope?.meta?.end,
    hasMore: Boolean(pagination?.hasMore),
    nextCursor: pagination?.nextCursor ?? null,
  };
};
