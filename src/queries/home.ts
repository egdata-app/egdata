import { httpClient } from "@/lib/http-client";
import { historicalLowsSearch } from "@/lib/historical-lows";
import { pickKeyImages, slimPrice } from "@/lib/offer-projections";
import { shouldRetryQueryWithLimit } from "@/lib/pow/query-retry";
import {
  normalizeV1OfferElements,
  normalizeV1SearchResponse,
  toV1SearchParams,
  type V1SearchMeta,
} from "@/lib/v1-adapters";
import type { AchievementSet } from "@/queries/offer-achievements";
import { getCollection } from "@/queries/collection";
import type { SingleBuild } from "@/types/builds";
import type { KeyImage, SingleOffer } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import type { SingleOfferWithPrice } from "@/types/single-offer-price";
import type { Price } from "@/types/price";

/**
 * Homepage queries intentionally return slim projections.
 *
 * The homepage only renders a handful of fields per row, so keeping the raw
 * API documents in the React Query cache would serialize hundreds of kilobytes
 * of unused data (long descriptions, every key image, tags, custom attributes,
 * …) into the SSR payload. These options cache only what the homepage reads.
 *
 * They also use dedicated `["home", …]` query keys so other pages that need the
 * full documents keep their own cache entries untouched.
 */

const ROW_IMAGES = ["DieselGameBoxTall", "OfferImageTall"];
const HISTORICAL_LOW_IMAGES = [
  "OfferImageWide",
  "DieselGameBoxWide",
  "Thumbnail",
  "OfferImageTall",
  "DieselGameBoxTall",
];
const BUILD_HOVER_IMAGES = [
  "OfferImageWide",
  "DieselStoreFrontWide",
  "horizontal",
  "DieselGameBoxWide",
  "DieselGameBox",
  "Thumbnail",
];
const PULSE_IMAGES = [
  "Thumbnail",
  "OfferImageTall",
  "DieselGameBoxTall",
  "OfferImageWide",
  "DieselStoreFrontWide",
];

const HOME_ROW_LIMIT = 10;
const HOME_PULSE_LIMIT = 8;

export type HomeOfferRow = {
  id: string;
  title: string;
  keyImages: KeyImage[];
  releaseDate?: string | null;
  creationDate?: string | null;
  price?: Price | null;
};

export type HomeAchievementsRow = {
  id: string;
  title: string;
  keyImages: KeyImage[];
  achievements: { achievements: Array<{ xp: number }> };
};

export type HomeTopSellerRow = {
  id: string;
  title: string;
  keyImages: KeyImage[];
  position: number;
  previousPosition: number;
};

export type HomeHistoricalLowOffer = {
  id: string;
  title: string;
  offerType: string;
  keyImages: KeyImage[];
  price: Price;
};

export type HomeBuild = {
  _id: string;
  buildVersion?: string;
  downloadSizeBytes: number;
  createdAt: string;
  item: {
    title: string;
    developer: string | null;
    keyImages: KeyImage[];
  } | null;
};

export type HomePulseDelta = {
  changeType: string;
  field: string;
};

export type HomePulseContext = {
  id?: string;
  name?: string;
  title?: string;
  appName?: string;
  buildVersion?: string;
  keyImages?: KeyImage[];
};

export type HomePulseChange = {
  _id: string;
  timestamp: string;
  metadata: {
    contextId: string;
    contextType: string;
    changes: HomePulseDelta[];
    context?: HomePulseContext | null;
  };
};

function toOfferRow(
  offer: SingleOffer,
  fields: Pick<HomeOfferRow, "releaseDate" | "creationDate" | "price">,
): HomeOfferRow {
  return {
    id: offer.id,
    title: offer.title,
    keyImages: pickKeyImages(offer.keyImages, [ROW_IMAGES]),
    ...fields,
  };
}

export function homeUpcomingQueryOptions(country: string) {
  return {
    queryKey: ["home", "upcoming", { country }] as const,
    queryFn: async (): Promise<HomeOfferRow[]> => {
      const data = await httpClient.v1Get<SingleOffer[] | null>("/offers/upcoming", {
        params: { country, limit: HOME_ROW_LIMIT },
      });

      return normalizeV1OfferElements(data)
        .elements.slice(0, HOME_ROW_LIMIT)
        .map((offer) => toOfferRow(offer, { releaseDate: offer.releaseDate ?? null }));
    },
    staleTime: 6_000,
  };
}

export function homeLatestOffersQueryOptions(country: string) {
  return {
    queryKey: ["home", "latest-games", { country }] as const,
    queryFn: async (): Promise<HomeOfferRow[]> => {
      const data = await httpClient.v1Get<SingleOffer[]>("/latest-games", {
        params: { country },
      });

      return (Array.isArray(data) ? data : []).slice(0, HOME_ROW_LIMIT).map((offer) =>
        toOfferRow(offer, {
          creationDate: offer.creationDate ?? null,
          price: slimPrice(offer.price),
        }),
      );
    },
  };
}

export function homeLatestReleasedQueryOptions(country: string) {
  return {
    queryKey: ["home", "latest-released", { country }] as const,
    queryFn: async (): Promise<HomeOfferRow[]> => {
      const data = await httpClient.v1Get<SingleOffer[] | null>("/offers/latest-released", {
        params: { country, limit: HOME_ROW_LIMIT },
      });

      return normalizeV1OfferElements(data)
        .elements.slice(0, HOME_ROW_LIMIT)
        .map((offer) =>
          toOfferRow(offer, {
            releaseDate: offer.releaseDate ?? null,
            price: slimPrice(offer.price),
          }),
        );
    },
  };
}

export function homeAchievementsQueryOptions(country: string) {
  return {
    queryKey: ["home", "offers-with-achievements", { country }] as const,
    queryFn: async (): Promise<HomeAchievementsRow[]> => {
      const data = await httpClient.v1Get<Array<SingleOffer & { achievements: AchievementSet }>>(
        "/offers/latest-achievements",
        {
          params: { country },
        },
      );

      return (Array.isArray(data) ? data : []).slice(0, HOME_ROW_LIMIT).map((offer) => ({
        id: offer.id,
        title: offer.title,
        keyImages: pickKeyImages(offer.keyImages, [ROW_IMAGES]),
        achievements: {
          achievements: (offer.achievements?.achievements ?? []).map((achievement) => ({
            xp: achievement.xp,
          })),
        },
      }));
    },
  };
}

export function homeTopSellersQueryOptions(country: string) {
  return {
    queryKey: ["home", "top-sellers", { country }] as const,
    queryFn: async (): Promise<HomeTopSellerRow[]> => {
      const collection = await getCollection({
        slug: "top-sellers",
        limit: HOME_ROW_LIMIT,
        page: 1,
        country,
      });

      return (Array.isArray(collection?.elements) ? collection.elements : [])
        .slice(0, HOME_ROW_LIMIT)
        .map((offer) => ({
          id: offer.id,
          title: offer.title,
          keyImages: pickKeyImages(offer.keyImages, [ROW_IMAGES]),
          position: offer.position,
          previousPosition: offer.previousPosition,
        }));
    },
  };
}

export function homeHistoricalLowsQueryOptions(country: string) {
  return {
    queryKey: ["home", "historical-lows", { country }] as const,
    queryFn: async (): Promise<HomeHistoricalLowOffer[]> => {
      const envelope = await httpClient.v1GetEnvelope<SingleOfferWithPrice[], V1SearchMeta>(
        "/search",
        {
          params: toV1SearchParams(historicalLowsSearch, {
            country,
            facets: "none",
            fields: "card",
          }),
        },
      );

      const normalized = normalizeV1SearchResponse(envelope, 1, historicalLowsSearch.limit);

      return normalized.offers.map((offer) => ({
        id: offer.id,
        title: offer.title,
        offerType: offer.offerType,
        keyImages: pickKeyImages(offer.keyImages, [HISTORICAL_LOW_IMAGES]),
        price: slimPrice(offer.price) ?? offer.price,
      }));
    },
    staleTime: 60_000,
  };
}

export function homeLatestBuildsQueryOptions() {
  return {
    queryKey: ["home", "builds", { sortDir: "desc", sortBy: "createdAt" }] as const,
    queryFn: async (): Promise<HomeBuild[]> => {
      const builds = await httpClient.v1Get<Array<SingleBuild & { item: SingleItem }>>("/builds", {
        params: {
          sortDir: "desc",
          sortBy: "createdAt",
          limit: HOME_ROW_LIMIT,
        },
      });

      return (Array.isArray(builds) ? builds : []).slice(0, HOME_ROW_LIMIT).map((build) => ({
        _id: build._id,
        buildVersion: build.buildVersion ?? undefined,
        downloadSizeBytes: build.downloadSizeBytes ?? 0,
        createdAt: build.createdAt ?? build.firstSeenAt ?? new Date(0).toISOString(),
        item: build.item
          ? {
              title: build.item.title,
              developer: build.item.developer ?? null,
              keyImages: pickKeyImages(build.item.keyImages, [ROW_IMAGES, BUILD_HOVER_IMAGES]),
            }
          : null,
      }));
    },
  };
}

type RawChangelistDelta = {
  changeType?: string;
  field?: string;
};

type RawChangelistContext = {
  id?: string;
  name?: string;
  title?: string;
  appName?: string;
  buildVersion?: string;
  keyImages?: KeyImage[];
};

type RawChangelistEvent = {
  _id: string;
  timestamp: string;
  metadata?: {
    changes?: RawChangelistDelta[];
    contextId?: string;
    contextType?: string;
    context?: RawChangelistContext | null;
  };
};

function projectPulseChange(change: RawChangelistEvent): HomePulseChange {
  const metadata = change.metadata;
  const context = metadata?.context;

  return {
    _id: change._id,
    timestamp: change.timestamp,
    metadata: {
      contextId: metadata?.contextId ?? "",
      contextType: metadata?.contextType ?? "",
      changes: (metadata?.changes ?? []).map((delta) => ({
        changeType: delta?.changeType ?? "update",
        field: delta?.field ?? "record",
      })),
      context: context
        ? {
            id: context.id,
            name: context.name,
            title: context.title,
            appName: context.appName,
            buildVersion: context.buildVersion,
            keyImages: pickKeyImages(context.keyImages, [PULSE_IMAGES]),
          }
        : null,
    },
  };
}

export const homePulseBaseQueryOptions = () => ({
  queryKey: ["home", "changelist"] as const,
  queryFn: async (): Promise<HomePulseChange[]> => {
    const changes = await httpClient.v1Get<RawChangelistEvent[]>("/changelist", {
      params: {
        limit: HOME_PULSE_LIMIT,
      },
    });

    return (Array.isArray(changes) ? changes : []).map(projectPulseChange);
  },
  staleTime: 10_000,
});

export const homePulseQueryOptions = () => ({
  ...homePulseBaseQueryOptions(),
  placeholderData: [] as HomePulseChange[],
  refetchInterval: 25_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  retry: shouldRetryQueryWithLimit(1),
});
