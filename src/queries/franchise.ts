import { httpClient } from "@/lib/http-client";
import { getV1PaginationTotal, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import type { SingleOffer } from "@/types/single-offer";

export interface FranchiseStats {
  totalTimeHastily: number;
  totalTimeNormally: number;
  totalTimeCompletely: number;
  totalAchievements: number;
  totalXp: number;
  gamesCount: number;
}

export interface FranchiseResponse {
  id: string;
  name: string;
  lastUpdated: string;
  elements: SingleOffer[];
  stats: FranchiseStats;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

type V1FranchiseData = {
  id: string | null;
  name: string;
  lastUpdated: string | null;
  elements: SingleOffer[];
  stats: FranchiseStats;
};

export const getFranchise = async ({
  slug,
  limit,
  page = 1,
  cursor,
  country,
}: {
  slug: string;
  limit: number;
  page?: number;
  cursor?: string;
  country: string;
}): Promise<FranchiseResponse> => {
  const envelope = await httpClient.v1GetEnvelope<V1FranchiseData, V1CursorPaginationMeta>(
    `/franchises/${slug}`,
    {
      params: { country, cursor, limit },
    },
  );
  const data = envelope?.data;
  const pagination = envelope?.meta?.pagination;
  const elements = Array.isArray(data?.elements) ? data.elements : [];

  return {
    id: data?.id ?? slug,
    name: data?.name ?? slug,
    lastUpdated: data?.lastUpdated ?? "",
    elements,
    stats: data?.stats ?? {
      totalTimeHastily: 0,
      totalTimeNormally: 0,
      totalTimeCompletely: 0,
      totalAchievements: 0,
      totalXp: 0,
      gamesCount: 0,
    },
    page,
    limit: pagination?.limit ?? limit,
    total: getV1PaginationTotal(pagination, elements.length),
    hasMore: Boolean(pagination?.hasMore),
    nextCursor: pagination?.nextCursor ?? null,
  };
};
