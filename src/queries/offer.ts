import { httpClient, type HttpError } from "@/lib/http-client";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/supported-locales";
import { unwrapV1Poll } from "@/lib/v1-adapters";
import type { AchievementsSets } from "@/queries/offer-achievements";
import type { Asset } from "@/types/asset";
import type { Technology } from "@/types/builds";
import type { OfferPosition } from "@/types/collections";
import type { Franchise } from "@/types/franchise";
import type { Media } from "@/types/media";
import type { SinglePoll } from "@/types/polls";
import type { Price } from "@/types/price";
import type { SingleOffer, Tag } from "@/types/single-offer";
import { queryOptions } from "@tanstack/react-query";

export function resolveQueryLocale(locale?: string | null): string {
  return locale && isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
}

export type OfferPageFranchise = Franchise & { namespaces?: string[] };

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as HttpError).status === 404);
}

export async function fetchOffer(
  id: string,
  options?: { country?: string; locale?: string | null },
): Promise<SingleOffer | null> {
  const resolvedLocale = resolveQueryLocale(options?.locale);

  try {
    return await httpClient.v1Get<SingleOffer>(`/offers/${id}`, {
      params: {
        ...(options?.country ? { country: options.country } : {}),
        locale: resolvedLocale,
      },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export const offerOnlyQueryOptions = (id: string, locale?: string | null) => {
  const resolvedLocale = resolveQueryLocale(locale);

  return queryOptions({
    queryKey: ["offer", { id, locale: resolvedLocale }],
    queryFn: () => fetchOffer(id, { locale: resolvedLocale }),
    staleTime: 60_000,
  });
};

export const offerTechnologiesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["offer", "technologies", { id }],
    queryFn: () => httpClient.v1Get<Technology[]>(`/offers/${id}/technologies`).catch(() => []),
    staleTime: 60_000,
  });

export const offerFranchisesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["offer", "franchises", { id }],
    queryFn: () =>
      httpClient.v1Get<OfferPageFranchise[]>(`/offers/${id}/franchises`).catch(() => []),
    staleTime: 60_000,
  });

export const offerAssetsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["offer-assets", { id }],
    queryFn: () => httpClient.v1Get<Asset[]>(`/offers/${id}/assets`).catch(() => []),
    staleTime: 60_000,
  });

export const offerGenresQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["offer", "genres", { id }],
    queryFn: () => httpClient.v1Get<Tag[]>(`/offers/${id}/genres`).catch(() => []),
  });

export const offerPriceStatsQueryOptions = (id: string, country?: string | null) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["price-stats", { id, country: resolvedCountry }],
    queryFn: () =>
      httpClient
        .v1Get<{
          current: Price | null;
          lowest: Price | null;
          lastDiscount: Price | null;
        }>(`/offers/${id}/price-stats`, {
          params: { country: resolvedCountry },
        })
        .catch(() => ({
          current: null,
          lowest: null,
          lastDiscount: null,
        })),
  });
};

export const offerAchievementsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["offer", "achievements", { id }],
    queryFn: () => httpClient.v1Get<AchievementsSets>(`/offers/${id}/achievements`),
  });

export const offerPollsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["offer", "polls", { id }],
    queryFn: () =>
      httpClient
        .v1Get<SinglePoll | { poll: SinglePoll | null } | null>(`/offers/${id}/polls`)
        .then(unwrapV1Poll),
    retry: false,
  });

export const offerMediaQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["media", { id }],
    queryFn: () => httpClient.v1Get<Media>(`/offers/${id}/media`),
    retry: false,
  });

export const offerTopsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["offer", "tops", { id }],
    queryFn: () => httpClient.v1Get<Record<string, number>>(`/offers/${id}/tops`),
  });

export const offerCollectionPositionsQueryOptions = (
  id: string,
  collection: string,
  country?: string | null,
) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["collection", "positions", { id, collection, country: resolvedCountry }],
    queryFn: () =>
      httpClient.v1Get<OfferPosition>(`/offers/${id}/collections/${collection}`, {
        params: { country: resolvedCountry },
      }),
    retry: false,
  });
};
