import { httpClient } from "@/lib/http-client";
import type { SingleBuild } from "@/types/builds";
import type { SingleItem } from "@/types/single-item";
import { queryOptions } from "@tanstack/react-query";

export function getBuilds({
  sortDir = "desc",
  sortBy = "createdAt",
}: {
  sortDir: "asc" | "desc";
  sortBy: "updatedAt" | "createdAt";
}) {
  return queryOptions({
    queryKey: [
      "builds",
      {
        sortDir,
        sortBy,
      },
    ],
    queryFn: async () => {
      const builds = await httpClient.get<Array<SingleBuild & { item: SingleItem }>>("/builds", {
        params: {
          sortDir,
          sortBy,
          limit: 10,
        },
      });
      return builds.map((build) => ({
        ...build,
        downloadSizeBytes: build.downloadSizeBytes ?? 0,
        createdAt: build.createdAt ?? build.firstSeenAt ?? new Date(0).toISOString(),
      }));
    },
  });
}
