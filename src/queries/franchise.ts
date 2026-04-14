import { httpClient } from "@/lib/http-client";
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
}

export const getFranchise = async ({
  slug,
  limit,
  page,
  country,
}: {
  slug: string;
  limit: number;
  page: number;
  country: string;
}) => {
  const data = await httpClient.get<FranchiseResponse>(`/franchises/${slug}`, {
    params: { country, page, limit },
  });

  return data;
};
