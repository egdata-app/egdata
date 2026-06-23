import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { queryOptions } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";

export const sandboxQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["sandbox", { id }],
    queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${id}`).catch(() => null),
    staleTime: 5 * 60_000,
    retry: false,
  });

export const sandboxBaseGameQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["sandbox", "base-game", { id }],
    queryFn: () =>
      httpClient
        .get<SingleOffer | (SingleItem & { isItem: true })>(`/sandboxes/${id}/base-game`)
        .catch(() => null),
    staleTime: 5 * 60_000,
    retry: false,
  });
