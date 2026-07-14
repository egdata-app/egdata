import { httpClient } from "@/lib/http-client";
import type {
  BuildComparisonResponse,
  BuildFiles,
  BuildHistoryResponse,
  SingleBuild,
} from "@/types/builds";
import type { SingleItem } from "@/types/single-item";
import { queryOptions } from "@tanstack/react-query";

export interface BuildItemsResponse {
  data: SingleItem[];
  page: number;
  limit: number;
  total: number;
}

export const buildQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["build", { id }],
    queryFn: () => httpClient.get<SingleBuild>(`/builds/${id}`),
  });

export const buildItemsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["build-items", { id }],
    queryFn: () => httpClient.get<BuildItemsResponse>(`/builds/${id}/items`),
  });

export const buildHistoryQueryOptions = (id: string, scope: "stream" | "platform" = "stream") =>
  queryOptions({
    queryKey: ["build-history", { id, scope }],
    queryFn: () =>
      httpClient.get<BuildHistoryResponse>(`/builds/${id}/history`, {
        params: { scope, limit: 100 },
      }),
  });

export const buildFilesQueryOptions = (
  id: string,
  options: { page: number; q?: string; extension?: string },
) =>
  queryOptions({
    queryKey: ["build-files", { id, ...options }],
    queryFn: () => httpClient.get<BuildFiles>(`/builds/${id}/files`, { params: options }),
  });

export const buildComparisonQueryOptions = (
  targetId: string,
  baseId: string,
  options: { page: number; q?: string; extension?: string; status?: string },
) =>
  queryOptions({
    queryKey: ["build-comparison", { targetId, baseId, ...options }],
    queryFn: () =>
      httpClient.get<BuildComparisonResponse>(`/builds/${targetId}/compare/${baseId}`, {
        params: options,
      }),
    enabled: Boolean(baseId),
  });
