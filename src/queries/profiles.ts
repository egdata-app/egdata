import { httpClient } from '@/lib/http-client';
import { queryOptions } from '@tanstack/react-query';

export type Profile = {
  epicAccountId: string;
  displayName: string;
  avatar: {
    small: string;
    medium: string;
    large: string;
  };
  stats: {
    totalGames: number;
    totalAchievements: number;
    totalPlayerAwards: number;
    totalXP: number;
    reviewsCount: number;
  };
  linkedAccounts: Array<{
    identityProviderId: string;
    displayName: string;
  }>;
  creationDate: string;
  donations: {
    itemId: string;
    namespace: string;
  }[];
  discord: boolean;
};

export const getUserInformation = async (id: string | null) => {
  if (!id) {
    return null;
  }

  const res = await httpClient.get<Profile>(`/profiles/${id}/information`);
  return res;
};

export const getUserGames = async (
  id: string,
  page: number,
  limit: number,
  platinum?: boolean,
  sort?: string,
) => {
  const res = await httpClient.get<{
    achievements: Array<{
      playerAwards: Array<{
        awardType: string;
        unlockedDateTime: string;
        achievementSetId: string;
      }>;
      totalXP: number;
      totalUnlocked: number;
      sandboxId: string;
      baseOfferForSandbox: {
        id: string;
        namespace: string;
        keyImages: Array<{
          type: string;
          url: string;
          md5: string;
        }>;
      };
      product: {
        name: string;
        slug?: string;
      };
      productAchievements: {
        totalAchievements: number;
        totalProductXP: number;
      };
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>(`/profiles/${id}/games`, {
    params: {
      page,
      limit,
      platinum,
      sort,
    },
  });
  return res;
};

export const getRefreshStatus = (id: string) =>
  queryOptions({
    queryKey: ['profiles', id, 'refresh-status'],
    queryFn: () =>
      httpClient
        .get<{
          canRefresh: boolean;
          // in seconds
          remainingTime: number;
        }>(`/profiles/${id}/refresh-status`)
        .then((res) => {
          return {
            ...res,
            refreshAvailableAt: new Date(Date.now() + res.remainingTime * 1000),
          };
        }),
    refetchInterval: 15_000, // 15 seconds
  });
