import { httpClient } from "@/lib/http-client";
import { slimPrice, toArray } from "@/lib/offer-projections";
import {
  sandboxBaseGameQueryOptions,
  sandboxQueryOptions,
  type SandboxBaseGame,
} from "@/queries/sandbox";
import type { Price } from "@/types/price";
import type { KeyImage } from "@/types/single-offer";
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
  metadata: {
    contextId: string;
    contextType: string;
    changes: Array<{ changeType: string; field: string }>;
  };
};

export type SandboxHubGenre = {
  id: string;
  name: string;
};

export type SandboxHubBuild = {
  _id: string;
  appName: string;
  labelName: string;
  buildVersion: string;
  downloadSizeBytes: number | null;
  updatedAt: string | null;
  createdAt: string;
};

/**
 * Hub payload is fully derived: it no longer nests copies of the sandbox or
 * base-game documents (the shell queries those separately), and list sections
 * keep only the fields the hub renders.
 */
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
  seller: SandboxBaseGame["seller"];
  price: Price | null;
  keyImages: KeyImage[];
  genres: SandboxHubGenre[];
  stats: SandboxHubStats | null;
  recentBuilds: SandboxHubBuild[];
  recentChanges: SandboxHubChangelogEntry[];
};

const PLATFORM_TAG_NAMES: Record<string, string> = {
  "9547": "Windows",
  "10719": "Mac",
  "39070": "iOS",
  "39071": "Android",
};

type RawBuild = {
  _id?: string;
  appName?: string;
  labelName?: string;
  buildVersion?: string;
  downloadSizeBytes?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type RawChangelogEntry = {
  _id?: string;
  timestamp?: string;
  metadata?: {
    contextId?: string | null;
    contextType?: string | null;
    changes?: Array<{ changeType?: string | null; field?: string | null } | null> | null;
  } | null;
};

type RawGenre = {
  id?: string;
  name?: string;
};

function extractPlatforms(baseGame: SandboxBaseGame | null): string[] {
  if (!baseGame) return [];

  if (baseGame.isItem) {
    return Array.from(new Set(baseGame.releaseInfo.flatMap((info) => info.platform ?? [])));
  }

  const platforms = new Set<string>();
  for (const tag of baseGame.tags) {
    const mapped = PLATFORM_TAG_NAMES[tag.id];
    if (mapped) platforms.add(mapped);
  }

  return Array.from(platforms);
}

function projectBuild(build: RawBuild): SandboxHubBuild {
  return {
    _id: build._id ?? build.appName ?? build.buildVersion ?? "",
    appName: build.appName ?? "",
    labelName: build.labelName ?? "",
    buildVersion: build.buildVersion ?? "",
    downloadSizeBytes: build.downloadSizeBytes ?? null,
    updatedAt: build.updatedAt ?? build.createdAt ?? null,
    createdAt: build.createdAt ?? build.updatedAt ?? "",
  };
}

function projectChangelogEntry(entry: RawChangelogEntry): SandboxHubChangelogEntry {
  return {
    _id: entry._id ?? "",
    timestamp: entry.timestamp ?? "",
    metadata: {
      contextId: entry.metadata?.contextId ?? "",
      contextType: entry.metadata?.contextType ?? "",
      changes: toArray(entry.metadata?.changes).map((change) => ({
        changeType: change?.changeType ?? "update",
        field: change?.field ?? "record",
      })),
    },
  };
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
    queryFn: async ({ client }): Promise<SandboxHubData | null> => {
      const [sandbox, baseGame, stats, recentBuilds, changelog] = await Promise.all([
        client.ensureQueryData(sandboxQueryOptions(id)).catch(() => null),
        client.ensureQueryData(sandboxBaseGameQueryOptions(id, resolvedCountry)).catch(() => null),
        httpClient.v1Get<SandboxHubStats>(`/sandboxes/${id}/stats`).catch(() => null),
        httpClient
          .v1Get<RawBuild[]>(`/sandboxes/${id}/builds`, {
            params: { limit: updateLimit },
          })
          .catch((): RawBuild[] => []),
        httpClient
          .v1Get<{ hits?: RawChangelogEntry[] }>(`/sandboxes/${id}/changelog`, {
            params: { limit: updateLimit },
          })
          .catch((): { hits?: RawChangelogEntry[] } => ({ hits: [] })),
      ]);

      if (!sandbox && !baseGame && !stats) {
        return null;
      }

      const genres =
        baseGame && !baseGame.isItem
          ? await httpClient
              .v1Get<RawGenre[]>(`/offers/${baseGame.id}/genres`)
              .then((rows) =>
                toArray(rows)
                  .filter((genre): genre is RawGenre & { id: string; name: string } =>
                    Boolean(genre?.id && genre?.name),
                  )
                  .map((genre) => ({ id: genre.id, name: genre.name })),
              )
              .catch(() => [])
          : [];

      const title = baseGame?.title || sandbox?.displayName || sandbox?.name || id;
      const description = baseGame?.description || baseGame?.longDescription || null;
      const primaryKind = baseGame ? (baseGame.isItem ? "item" : "offer") : null;

      return {
        id,
        namespace: id,
        title,
        description,
        primaryKind,
        developer: baseGame?.developerDisplayName ?? baseGame?.developer ?? null,
        publisher: baseGame?.publisherDisplayName ?? null,
        platforms: extractPlatforms(baseGame),
        created: sandbox?.created ?? baseGame?.creationDate ?? null,
        updated: sandbox?.updated ?? baseGame?.lastModifiedDate ?? null,
        seller: baseGame?.seller ?? null,
        price: baseGame ? slimPrice(baseGame.price) : null,
        keyImages: baseGame?.keyImages ?? [],
        genres: Array.isArray(genres) ? genres : [],
        stats,
        recentBuilds: toArray(recentBuilds).map(projectBuild),
        recentChanges: toArray(changelog?.hits).map(projectChangelogEntry),
      };
    },
    staleTime: 60_000,
  });
};
