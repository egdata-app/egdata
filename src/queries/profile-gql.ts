import { graphql, type ResultOf } from "@/graphql";
import { httpClient } from "@/lib/http-client";
import { queryOptions } from "@tanstack/react-query";
import { print } from "graphql";

const GRAPHQL_URL = "/graphql";

export const PROFILE_LIBRARY_LIMIT = 12;
export const PROFILE_ACTIVITY_LIMIT = 25;

export const profileGameFilters = [
  "ALL",
  "COMPLETED",
  "NEAR_PLATINUM",
  "IN_PROGRESS",
  "PLATINUM",
] as const;

export const profileGameSorts = ["COMPLETION", "ALPHABETICAL", "XP", "ACHIEVEMENTS"] as const;

export type ProfileGameFilter = (typeof profileGameFilters)[number];
export type ProfileGameSort = (typeof profileGameSorts)[number];

const profilePageQuery = graphql(`
  query ProfilePage(
    $id: ID!
    $featuredAchievementLimit: Int!
    $featuredGameLimit: Int!
    $recentActivityLimit: Int!
    $recentActivityPage: Int!
    $gameLimit: Int!
    $gamePage: Int!
    $gameFilter: ProfileGameFilter!
    $gameSort: ProfileGameSort!
    $achievementLimit: Int!
    $achievementPage: Int!
  ) {
    profile(id: $id) {
      accountId
      displayName
      avatar {
        small
        medium
        large
      }
      linkedAccounts
      creationDate
      reviewsCount
      highlights {
        level
        totalXP
        totalGames
        totalAchievements
        totalPlatinums
        reviewsCount
      }
      heroGame {
        sandboxId
        title
        imageUrl
        completionPercent
      }
      featuredAchievements(limit: $featuredAchievementLimit) {
        name
        displayName
        description
        iconUrl
        rarityPercent
        xp
        sandboxId
        gameTitle
        unlockedAt
      }
      featuredGames(limit: $featuredGameLimit, filter: $gameFilter, sort: $gameSort) {
        sandboxId
        title
        imageUrl
        completionPercent
        unlocked
        total
        earnedXP
        totalXP
        hasPlatinum
        rarestAchievements {
          name
          displayName
          description
          iconUrl
          rarityPercent
          xp
          sandboxId
          gameTitle
          unlockedAt
        }
      }
      recentActivity(limit: $recentActivityLimit, page: $recentActivityPage) {
        type
        sandboxId
        gameTitle
        achievementName
        achievementIconUrl
        occurredAt
      }
      games(limit: $gameLimit, page: $gamePage, filter: $gameFilter, sort: $gameSort) {
        elements {
          sandboxId
          title
          imageUrl
          completionPercent
          unlocked
          total
          earnedXP
          totalXP
          hasPlatinum
          rarestAchievements {
            name
            displayName
            description
            iconUrl
            rarityPercent
            xp
            sandboxId
            gameTitle
            unlockedAt
          }
        }
        total
        page
        limit
      }
      achievements(limit: $achievementLimit, page: $achievementPage) {
        elements {
          name
          displayName
          description
          iconUrl
          rarityPercent
          xp
          sandboxId
          gameTitle
          unlockedAt
        }
        total
        page
        limit
      }
    }
  }
`);

export type ProfilePageResult = ResultOf<typeof profilePageQuery>;
export type ProfilePageProfile = NonNullable<ProfilePageResult["profile"]>;
export type ProfileAchievement = NonNullable<
  NonNullable<ProfilePageProfile["featuredAchievements"]>[number]
>;
export type ProfileGame = NonNullable<NonNullable<ProfilePageProfile["featuredGames"]>[number]>;
export type ProfileActivityItem = NonNullable<
  NonNullable<ProfilePageProfile["recentActivity"]>[number]
>;

export type ProfilePageVariables = {
  id: string;
  featuredAchievementLimit: number;
  featuredGameLimit: number;
  recentActivityLimit: number;
  recentActivityPage: number;
  gameLimit: number;
  gamePage: number;
  gameFilter: ProfileGameFilter;
  gameSort: ProfileGameSort;
  achievementLimit: number;
  achievementPage: number;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

export function getDefaultProfilePageVariables(id: string): ProfilePageVariables {
  return {
    id,
    featuredAchievementLimit: 8,
    featuredGameLimit: 6,
    recentActivityLimit: 12,
    recentActivityPage: 1,
    gameLimit: PROFILE_LIBRARY_LIMIT,
    gamePage: 1,
    gameFilter: "ALL",
    gameSort: "COMPLETION",
    achievementLimit: PROFILE_ACTIVITY_LIMIT,
    achievementPage: 1,
  };
}

export const profilePageQueryOptions = (variables: ProfilePageVariables) =>
  queryOptions({
    queryKey: ["profile-gql", variables],
    queryFn: async () => {
      const res = await httpClient.post<GraphQLResponse<ProfilePageResult>>(GRAPHQL_URL, {
        query: print(profilePageQuery),
        variables,
      });

      if (res.errors?.length) {
        throw new Error(
          res.errors
            .map((error) => error.message)
            .filter(Boolean)
            .join("\n"),
        );
      }

      return res.data?.profile ?? null;
    },
    staleTime: 60_000,
  });
