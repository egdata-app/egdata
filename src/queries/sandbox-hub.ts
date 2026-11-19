import { getPlatformsArray } from "@/components/app/platform-icons";
import { httpClient } from "@/lib/http-client";
import type { Build } from "@/types/builds";
import type { Price } from "@/types/price";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { queryOptions } from "@tanstack/react-query";

export type SandboxHubStats = {
  offers: number;
  items: number;
  assets: number;
  builds: number;
  achievements: number;
};

export type SandboxHubChangelogEntry = {
  _id: string;
  timestamp: string;
  metadata?: {
    contextId?: string | null;
    contextType?: string | null;
    changes?: Array<{
      changeType?: string | null;
      field?: string | null;
    } | null> | null;
  } | null;
};

export type SandboxHubGenre = {
  id: string;
  name: string;
  groupName?: string | null;
};

export type SandboxHubData = {
  id: string;
  namespace: string;
  title: string;
  description: string | null;
  primaryKind: "offer" | "item" | null;
  developer: string | null;
  publisher: string | null;
  platforms: string[];
  created: string | null;
  updated: string | null;
  seller: SingleOffer["seller"] | null;
  price: Price | null;
  keyImages: SingleOffer["keyImages"];
  genres: SandboxHubGenre[];
  stats: SandboxHubStats | null;
  sandbox: SingleSandbox | null;
  primaryItem: (SingleItem & { isItem: true }) | null;
  primaryOffer: SingleOffer | null;
  recentBuilds: Build[];
  recentChanges: SandboxHubChangelogEntry[];
};

const PLATFORM_TAG_NAMES: Record<string, string> = {
  "9547": "Windows",
  "10719": "Mac",
  "39070": "iOS",
  "39071": "Android",
};

function isItemBaseGame(
  baseGame: SingleOffer | (SingleItem & { isItem: true }) | null,
): baseGame is SingleItem & { isItem: true } {
  return Boolean(baseGame && "isItem" in baseGame && baseGame.isItem);
}

function extractPlatforms(
  primaryOffer: SingleOffer | null,
  primaryItem: (SingleItem & { isItem: true }) | null,
): string[] {
  if (primaryItem) {
    return getPlatformsArray(primaryItem.releaseInfo);
  }
  if (!primaryOffer) {
    return [];
  }
  const platforms = new Set<string>();
  for (const tag of primaryOffer.tags ?? []) {
    if (!tag) continue;
    const mapped = PLATFORM_TAG_NAMES[tag.id];
    if (mapped) {
      platforms.add(mapped);
    }
  }
  return Array.from(platforms);
}

export const sandboxHubQueryOptions = ({
  id,
  country,
  offerLimit = 8,
  updateLimit = 8,
}: {
  id: string;
  country: string;
  offerLimit?: number;
  updateLimit?: number;
}) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["sandbox-hub", { id, country: resolvedCountry, offerLimit, updateLimit }],
    queryFn: async (): Promise<SandboxHubData | null> => {
      const [sandbox, baseGame, stats, recentBuilds, changelog] = await Promise.all([
        httpClient.v1Get<SingleSandbox>(`/sandboxes/${id}`).catch(() => null),
        httpClient
          .v1Get<SingleOffer | (SingleItem & { isItem: true })>(`/sandboxes/${id}/base-game`, {
            params: { country: resolvedCountry },
          })
          .catch(() => null),
        httpClient.v1Get<SandboxHubStats>(`/sandboxes/${id}/stats`).catch(() => null),
        httpClient
          .v1Get<Build[]>(`/sandboxes/${id}/builds`, {
            params: { limit: updateLimit },
          })
          .catch(() => []),
        httpClient
          .v1Get<{ hits?: SandboxHubChangelogEntry[] }>(`/sandboxes/${id}/changelog`, {
            params: { limit: updateLimit },
          })
          .catch(() => ({ hits: [] })),
      ]);

      if (!sandbox && !baseGame && !stats) {
        return null;
      }

      const primaryItem = isItemBaseGame(baseGame) ? baseGame : null;
      const primaryOffer = !isItemBaseGame(baseGame) ? baseGame : null;

      const genres = primaryOffer
        ? await httpClient
            .v1Get<SandboxHubGenre[]>(`/offers/${primaryOffer.id}/genres`)
            .catch(() => [])
        : [];

      const title =
        primaryOffer?.title || primaryItem?.title || sandbox?.displayName || sandbox?.name || id;

      const description =
        primaryOffer?.description ||
        primaryOffer?.longDescription ||
        primaryItem?.description ||
        null;

      return {
        id,
        namespace: id,
        title,
        description,
        primaryKind: primaryOffer ? "offer" : primaryItem ? "item" : null,
        developer: primaryOffer?.developerDisplayName ?? primaryItem?.developer ?? null,
        publisher: primaryOffer?.publisherDisplayName ?? null,
        platforms: extractPlatforms(primaryOffer, primaryItem),
        created:
          sandbox?.created ?? primaryOffer?.creationDate ?? primaryItem?.creationDate ?? null,
        updated:
          sandbox?.updated ??
          primaryOffer?.lastModifiedDate ??
          primaryItem?.lastModifiedDate ??
          null,
        seller: primaryOffer?.seller ?? null,
        price: primaryOffer?.price ?? null,
        keyImages: primaryOffer?.keyImages ?? primaryItem?.keyImages ?? [],
        genres: Array.isArray(genres) ? genres : [],
        stats,
        sandbox,
        primaryItem,
        primaryOffer,
        recentBuilds: Array.isArray(recentBuilds) ? recentBuilds : [],
        recentChanges: Array.isArray(changelog?.hits) ? changelog.hits : [],
      };
    },
    staleTime: 60_000,
  });
};
