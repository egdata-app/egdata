import { httpClient } from "@/lib/http-client";
import { pickKeyImages, slimPrice, toArray } from "@/lib/offer-projections";
import { getV1PaginationTotal, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import type { Price } from "@/types/price";
import type { KeyImage, SingleOffer } from "@/types/single-offer";

/** Raw `/collections/:slug` element: a full store document plus ranking data. */
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

/**
 * Projected collection row.
 *
 * Collection tables only render the rank, one wide image, the price and the
 * "weeks in top 100" tooltip counters, so the full offer document (description,
 * every key image, tags, items, …) never enters the React Query cache.
 */
export type CollectionRow = {
  id: string;
  title: string;
  position: number;
  previousPosition: number;
  keyImages: KeyImage[];
  price: Price | null;
  metadata: {
    position: number;
    timesInTop1: number;
    timesInTop5: number;
    timesInTop10: number;
    timesInTop50: number;
    timesInTop100: number;
  };
};

const ROW_IMAGES = ["DieselGameBoxWide", "DieselStoreFrontWide", "Featured", "OfferImageWide"];
/** Homepage top-seller rows render the tall box art from the same rows. */
const ROW_TALL_IMAGES = ["DieselGameBoxTall", "OfferImageTall"];

export interface Collections {
  elements: CollectionRow[];
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

function projectCollectionRow(offer: OfferWithTops): CollectionRow {
  return {
    id: offer.id,
    title: offer.title,
    position: offer.position,
    previousPosition: offer.previousPosition,
    keyImages: pickKeyImages(offer.keyImages, [ROW_IMAGES, ROW_TALL_IMAGES]),
    price: slimPrice(offer.price),
    metadata: {
      position: offer.metadata?.position ?? offer.position,
      timesInTop1: offer.metadata?.timesInTop1 ?? 0,
      timesInTop5: offer.metadata?.timesInTop5 ?? 0,
      timesInTop10: offer.metadata?.timesInTop10 ?? 0,
      timesInTop50: offer.metadata?.timesInTop50 ?? 0,
      timesInTop100: offer.metadata?.timesInTop100 ?? 0,
    },
  };
}

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

  const elements = toArray(envelope?.data).map(projectCollectionRow);
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
