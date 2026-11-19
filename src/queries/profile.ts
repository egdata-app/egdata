import { getImage } from "@/lib/get-image";
import { httpClient, type HttpError } from "@/lib/http-client";
import {
  fetchV1CursorPageAt,
  getV1TotalPages,
  type V1CursorPaginationMeta,
} from "@/lib/v1-adapters";
import { getUserInformation, type Profile } from "@/queries/profiles";
import type { KeyImage } from "@/types/single-offer";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";

export const PROFILE_LIBRARY_LIMIT = 12;
export const PROFILE_ACTIVITY_LIMIT = 25;
export const PROFILE_FEATURED_GAMES_LIMIT = 6;
export const PROFILE_FEATURED_ACHIEVEMENTS_LIMIT = 8;
export const PROFILE_RECENT_ACTIVITY_LIMIT = 12;

export const profileSearchFilters = [
  "all",
  "completed",
  "near-platinum",
  "in-progress",
  "platinum",
] as const;

export const profileSearchSorts = ["completion", "alphabetical", "xp", "achievements"] as const;

export type ProfileSearchFilter = (typeof profileSearchFilters)[number];
export type ProfileSearchSort = (typeof profileSearchSorts)[number];

export type ProfileAchievement = {
  name: string;
  displayName: string | null;
  description: string | null;
  iconUrl: string | null;
  rarityPercent: number | null;
  xp: number | null;
  sandboxId: string | null;
  gameTitle: string | null;
  unlockedAt: string | null;
};

export type ProfileGame = {
  sandboxId: string;
  title: string;
  imageUrl: string | null;
  completionPercent: number;
  unlocked: number;
  total: number;
  earnedXP: number;
  totalXP: number;
  hasPlatinum: boolean;
  rarestAchievements: ProfileAchievement[];
};

export type ProfileActivityItem = {
  type: "ACHIEVEMENT_UNLOCKED" | "PLATINUM_EARNED";
  sandboxId: string | null;
  gameTitle: string | null;
  achievementName: string | null;
  achievementIconUrl: string | null;
  occurredAt: string | null;
};

export type ProfileInformation = Profile;

type V1ProfileGameEntry = {
  playerAwards?: Array<{
    awardType?: string;
    unlockedDateTime?: string;
    achievementSetId?: string;
  }>;
  totalXP?: number;
  totalUnlocked?: number;
  sandboxId: string;
  completionPercentage?: number;
  baseOfferForSandbox?: {
    id?: string;
    namespace?: string;
    keyImages?: KeyImage[];
  } | null;
  product?: {
    name?: string;
    slug?: string;
  } | null;
  productAchievements?: {
    totalAchievements?: number;
    totalProductXP?: number;
  } | null;
};

type V1ProfileAchievementEntry = {
  name: string;
  unlockedDisplayName?: string | null;
  lockedDisplayName?: string | null;
  unlockedDescription?: string | null;
  lockedDescription?: string | null;
  unlockedIconLink?: string | null;
  lockedIconLink?: string | null;
  completedPercent?: number | null;
  xp?: number | null;
  sandboxId?: string | null;
  unlockDate?: string | null;
  offer?: {
    id?: string;
    namespace?: string | null;
    title?: string | null;
  } | null;
};

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as HttpError).status === 404);
}

function mapProfileGame(entry: V1ProfileGameEntry): ProfileGame {
  const total = entry.productAchievements?.totalAchievements ?? 0;
  const unlocked = entry.totalUnlocked ?? 0;
  const completionPercent =
    total > 0
      ? Math.min(100, (unlocked / total) * 100)
      : typeof entry.completionPercentage === "number"
        ? entry.completionPercentage <= 1
          ? entry.completionPercentage * 100
          : entry.completionPercentage
        : 0;

  const imageUrl =
    getImage(entry.baseOfferForSandbox?.keyImages ?? [], [
      "DieselGameBoxWide",
      "OfferImageWide",
      "DieselStoreFrontWide",
      "TakeoverWide",
      "DieselGameBox",
      "DieselGameBoxTall",
      "Thumbnail",
    ])?.url ?? null;

  return {
    sandboxId: entry.sandboxId,
    title: entry.product?.name ?? entry.sandboxId,
    imageUrl,
    completionPercent,
    unlocked,
    total,
    earnedXP: entry.totalXP ?? 0,
    totalXP: entry.productAchievements?.totalProductXP ?? 0,
    hasPlatinum: (entry.playerAwards?.length ?? 0) > 0,
    rarestAchievements: [],
  };
}

function mapProfileAchievement(entry: V1ProfileAchievementEntry): ProfileAchievement {
  const sandboxId = entry.sandboxId ?? entry.offer?.namespace ?? null;
  return {
    name: entry.name,
    displayName: entry.unlockedDisplayName ?? entry.lockedDisplayName ?? entry.name ?? null,
    description: entry.unlockedDescription ?? entry.lockedDescription ?? null,
    iconUrl: entry.unlockedIconLink ?? entry.lockedIconLink ?? null,
    rarityPercent: typeof entry.completedPercent === "number" ? entry.completedPercent : null,
    xp: typeof entry.xp === "number" ? entry.xp : null,
    sandboxId,
    gameTitle: entry.offer?.title ?? sandboxId,
    unlockedAt: entry.unlockDate ?? null,
  };
}

export function selectHeroGame(games: ProfileGame[]): ProfileGame | null {
  return games.find((game) => Boolean(game.imageUrl)) ?? games[0] ?? null;
}

export function toProfileActivityItems(achievements: ProfileAchievement[]): ProfileActivityItem[] {
  return achievements.map((achievement) => ({
    type: "ACHIEVEMENT_UNLOCKED",
    sandboxId: achievement.sandboxId,
    gameTitle: achievement.gameTitle,
    achievementName: achievement.displayName ?? achievement.name,
    achievementIconUrl: achievement.iconUrl,
    occurredAt: achievement.unlockedAt,
  }));
}

export const profileInformationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["profile-information", { id }],
    queryFn: async (): Promise<ProfileInformation | null> => {
      try {
        return await getUserInformation(id);
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
    staleTime: 60_000,
  });

export const profileFeaturedAchievementsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["profile-rare-achievements", { id }],
    queryFn: async (): Promise<ProfileAchievement[]> => {
      try {
        const rows = await httpClient.v1Get<V1ProfileAchievementEntry[]>(
          `/profiles/${id}/rare-achievements`,
        );
        if (!Array.isArray(rows)) return [];
        return rows.slice(0, PROFILE_FEATURED_ACHIEVEMENTS_LIMIT).map(mapProfileAchievement);
      } catch (error) {
        if (isNotFoundError(error)) return [];
        throw error;
      }
    },
    staleTime: 60_000,
  });

export const profileFeaturedGamesQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["profile-featured-games", { id }],
    queryFn: async (): Promise<ProfileGame[]> => {
      try {
        const data = await httpClient.v1Get<{ achievements?: V1ProfileGameEntry[] }>(
          `/profiles/${id}/games`,
          {
            params: {
              limit: PROFILE_FEATURED_GAMES_LIMIT,
              sort: "completion",
            },
          },
        );
        const rows = Array.isArray(data?.achievements) ? data.achievements : [];
        return rows.map(mapProfileGame);
      } catch (error) {
        if (isNotFoundError(error)) return [];
        throw error;
      }
    },
    staleTime: 60_000,
  });

export type ProfileGamesPageResult = {
  elements: ProfileGame[];
  total: number | null;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number | null;
};

export const profileLibraryQueryOptions = ({
  id,
  page,
  filter,
  sort,
}: {
  id: string;
  page: number;
  filter: ProfileSearchFilter;
  sort: ProfileSearchSort;
}) => {
  const scopeKey = `profile-games:${id}:${PROFILE_LIBRARY_LIMIT}:${sort}:${filter}`;

  return queryOptions({
    queryKey: ["profile-games", { id, page, filter, sort, limit: PROFILE_LIBRARY_LIMIT }],
    queryFn: async ({ signal }): Promise<ProfileGamesPageResult> => {
      const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
        { achievements?: V1ProfileGameEntry[] },
        V1CursorPaginationMeta
      >(
        (cursor) =>
          httpClient.v1GetEnvelope<{ achievements?: V1ProfileGameEntry[] }, V1CursorPaginationMeta>(
            `/profiles/${id}/games`,
            {
              params: {
                cursor,
                limit: PROFILE_LIBRARY_LIMIT,
                sort,
                ...(filter === "platinum" ? { platinum: true } : {}),
                ...(filter === "completed" || filter === "near-platinum" || filter === "in-progress"
                  ? { filter }
                  : {}),
              },
              signal,
            },
          ),
        page,
        scopeKey,
      );

      const rows = Array.isArray(envelope?.data?.achievements) ? envelope.data.achievements : [];
      const limit = envelope?.meta?.pagination?.limit ?? PROFILE_LIBRARY_LIMIT;

      return {
        elements: rows.map(mapProfileGame),
        total,
        page: resolvedPage,
        limit,
        hasMore,
        totalPages: getV1TotalPages(envelope?.meta?.pagination, PROFILE_LIBRARY_LIMIT),
      };
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
};

export type ProfileActivityPageResult = {
  elements: ProfileAchievement[];
  total: number | null;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number | null;
};

export const profileActivityQueryOptions = ({ id, page }: { id: string; page: number }) => {
  const scopeKey = `profile-achievements:${id}:${PROFILE_ACTIVITY_LIMIT}`;

  return queryOptions({
    queryKey: ["profile-achievements", { id, page, limit: PROFILE_ACTIVITY_LIMIT }],
    queryFn: async ({ signal }): Promise<ProfileActivityPageResult> => {
      const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
        { achievements?: V1ProfileAchievementEntry[]; count?: number },
        V1CursorPaginationMeta
      >(
        (cursor) =>
          httpClient.v1GetEnvelope<
            { achievements?: V1ProfileAchievementEntry[]; count?: number },
            V1CursorPaginationMeta
          >(`/profiles/${id}/achievements`, {
            params: {
              cursor,
              limit: PROFILE_ACTIVITY_LIMIT,
            },
            signal,
          }),
        page,
        scopeKey,
      );

      const rows = Array.isArray(envelope?.data?.achievements) ? envelope.data.achievements : [];
      const limit = envelope?.meta?.pagination?.limit ?? PROFILE_ACTIVITY_LIMIT;
      const resolvedTotal =
        total ?? (typeof envelope?.data?.count === "number" ? envelope.data.count : null);
      const totalPages =
        resolvedTotal !== null ? Math.max(1, Math.ceil(resolvedTotal / Math.max(1, limit))) : null;

      return {
        elements: rows.map(mapProfileAchievement),
        total: resolvedTotal,
        page: resolvedPage,
        limit,
        hasMore,
        totalPages,
      };
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
};
