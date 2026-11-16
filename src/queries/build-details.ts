import { httpClient } from "@/lib/http-client";
import {
  fetchV1CursorPageAt,
  getV1PaginationTotal,
  type V1CursorPaginationMeta,
} from "@/lib/v1-adapters";
import type {
  BuildComparisonResponse,
  BuildFileTreeNode,
  BuildFileTreeResponse,
  BuildHistoryEntry,
  BuildHistoryResponse,
  ManifestStatus,
  SingleBuild,
} from "@/types/builds";
import type { SingleItem } from "@/types/single-item";
import { queryOptions } from "@tanstack/react-query";

export interface BuildItemsResponse {
  data: SingleItem[];
  page: number;
  limit: number;
  total: number | null;
  hasMore?: boolean;
}

export const buildQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["build", { id }],
    queryFn: () => httpClient.v1Get<SingleBuild>(`/builds/${id}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const buildItemsQueryOptions = (id: string, page = 1, limit = 20) =>
  queryOptions({
    queryKey: ["build-items", { id, page, limit }],
    queryFn: async () => {
      const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
        SingleItem[],
        V1CursorPaginationMeta
      >(
        (cursor) =>
          httpClient.v1GetEnvelope<SingleItem[], V1CursorPaginationMeta>(`/builds/${id}/items`, {
            params: { cursor, limit },
          }),
        page,
        `build-items:${id}:${limit}`,
      );
      const data = Array.isArray(envelope?.data) ? envelope.data : [];
      return {
        data,
        page: resolvedPage,
        limit: envelope?.meta?.pagination?.limit ?? limit,
        total,
        hasMore,
      } satisfies BuildItemsResponse;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const buildHistoryQueryOptions = (id: string, scope: "stream" | "platform" = "stream") =>
  queryOptions({
    queryKey: ["build-history", { id, scope }],
    queryFn: async () => {
      const envelope = await httpClient.v1GetEnvelope<
        BuildHistoryEntry[],
        V1CursorPaginationMeta & { previousComparableBuildId?: string | null }
      >(`/builds/${id}/history`, {
        params: { scope, limit: 100 },
      });
      const data = Array.isArray(envelope?.data) ? envelope.data : [];
      return {
        data,
        previousComparableBuildId: envelope?.meta?.previousComparableBuildId ?? null,
        page: 1,
        limit: envelope?.meta?.pagination?.limit ?? 100,
        total: getV1PaginationTotal(envelope?.meta?.pagination, data.length),
      } satisfies BuildHistoryResponse;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const buildFileTreeQueryOptions = (
  id: string,
  options: { path?: string; page: number; limit?: number },
) =>
  queryOptions({
    queryKey: ["build-file-tree", { id, ...options }],
    queryFn: async () => {
      const limit = options.limit ?? 100;
      const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
        BuildFileTreeNode[],
        V1CursorPaginationMeta & { path?: string; manifestStatus?: ManifestStatus }
      >(
        (cursor) =>
          httpClient.v1GetEnvelope<
            BuildFileTreeNode[],
            V1CursorPaginationMeta & { path?: string; manifestStatus?: ManifestStatus }
          >(`/builds/${id}/tree`, {
            params: {
              path: options.path,
              limit,
              cursor,
            },
          }),
        options.page,
        `build-tree:${id}:${options.path ?? ""}:${limit}`,
      );
      const nodes = Array.isArray(envelope?.data) ? envelope.data : [];
      return {
        path: envelope?.meta?.path ?? options.path ?? "",
        nodes,
        manifestStatus: envelope?.meta?.manifestStatus ?? "verified",
        page: resolvedPage,
        limit: envelope?.meta?.pagination?.limit ?? limit,
        total,
        hasMore,
      } satisfies BuildFileTreeResponse & { hasMore: boolean };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const buildComparisonQueryOptions = (
  targetId: string,
  baseId: string,
  options: { page: number; limit?: number; q?: string; extension?: string; status?: string },
) =>
  queryOptions({
    queryKey: ["build-comparison", { targetId, baseId, ...options }],
    queryFn: async () => {
      const limit = options.limit ?? 100;
      const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
        Omit<BuildComparisonResponse, "page" | "limit" | "total">,
        V1CursorPaginationMeta
      >(
        (cursor) =>
          httpClient.v1GetEnvelope<
            Omit<BuildComparisonResponse, "page" | "limit" | "total">,
            V1CursorPaginationMeta
          >(`/builds/${targetId}/compare/${baseId}`, {
            params: {
              cursor,
              limit,
              q: options.q,
              extension: options.extension,
              status: options.status,
            },
          }),
        options.page,
        `build-compare:${targetId}:${baseId}:${limit}:${options.q ?? ""}:${options.extension ?? ""}:${options.status ?? ""}`,
      );
      const data = envelope?.data;
      return {
        ...data,
        page: resolvedPage,
        limit: envelope?.meta?.pagination?.limit ?? limit,
        total,
        hasMore,
      } satisfies BuildComparisonResponse & { hasMore: boolean };
    },
    enabled: Boolean(baseId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
