import { httpClient } from "@/lib/http-client";
import type { SingleBuild } from "@/types/builds";
import type { SingleItem } from "@/types/single-item";
import { queryOptions } from "@tanstack/react-query";

type BuildWithItem = SingleBuild & {
  item: SingleItem;
};

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
    queryFn: () =>
      httpClient.get<BuildWithItem[]>("/builds", {
        params: {
          sortDir,
          sortBy,
          limit: 10,
        },
      }),
  });
}
