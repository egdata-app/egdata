import { columns } from "@/components/tables/items/columns";
import { DataTable } from "@/components/tables/items/table";
import { httpClient } from "@/lib/http-client";
import { fetchAllV1CursorPages, type V1CursorPaginationMeta } from "@/lib/v1-adapters";
import { buildItemsQueryOptions } from "@/queries/build-details";
import type { SingleItem } from "@/types/single-item";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/builds/$id/items")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };
    return (
      <HydrationBoundary state={dehydratedState}>
        <ItemsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery(buildItemsQueryOptions(id, 1, 25));

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

function matchesItemFilters(item: SingleItem, filters: ColumnFiltersState): boolean {
  for (const filter of filters) {
    if (filter.id === "title") {
      const term = String(filter.value ?? "")
        .trim()
        .toLowerCase();
      if (term && !(item.title ?? "").toLowerCase().includes(term)) return false;
    } else if (filter.id === "status") {
      const selected = Array.isArray(filter.value) ? filter.value : [];
      if (selected.length > 0 && !selected.includes(item.status)) return false;
    } else if (filter.id === "entitlementType") {
      const selected = Array.isArray(filter.value) ? filter.value : [];
      if (selected.length > 0 && !selected.includes(item.entitlementType)) return false;
    } else if (filter.id === "platforms") {
      const selected = Array.isArray(filter.value) ? filter.value : [];
      if (selected.length > 0) {
        const itemPlatforms = (item.releaseInfo ?? []).flatMap((release) => release.platform ?? []);
        if (!selected.some((platform) => itemPlatforms.includes(String(platform)))) return false;
      }
    }
  }
  return true;
}

function ItemsPage() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as { dehydratedState: DehydratedState; id: string };
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 25 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const hasFilters = filters.length > 0;

  const pagedQuery = useQuery({
    ...buildItemsQueryOptions(id, page.pageIndex + 1, page.pageSize),
    enabled: !hasFilters,
    placeholderData: keepPreviousData,
  });

  const allItemsQuery = useQuery({
    queryKey: ["build-items-all", { id }],
    queryFn: () =>
      fetchAllV1CursorPages((cursor) =>
        httpClient.v1GetEnvelope<SingleItem[], V1CursorPaginationMeta>(`/builds/${id}/items`, {
          params: { cursor, limit: 100 },
        }),
      ),
    enabled: hasFilters,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const filteredItems = useMemo(() => {
    if (!hasFilters) return null;
    return (allItemsQuery.data ?? []).filter((item) => matchesItemFilters(item, filters));
  }, [allItemsQuery.data, filters, hasFilters]);

  const updateFilters: typeof setFilters = (next) => {
    setFilters(next);
    setPage((current) => ({ ...current, pageIndex: 0 }));
  };

  useEffect(() => {
    if (
      !hasFilters &&
      pagedQuery.data &&
      !pagedQuery.isPlaceholderData &&
      pagedQuery.data.page - 1 !== page.pageIndex
    ) {
      setPage((current) => ({ ...current, pageIndex: pagedQuery.data.page - 1 }));
    }
  }, [hasFilters, page.pageIndex, pagedQuery.data, pagedQuery.isPlaceholderData]);

  const offset = page.pageIndex * page.pageSize;
  const rows = hasFilters
    ? (filteredItems ?? []).slice(offset, offset + page.pageSize)
    : (pagedQuery.data?.data ?? []);
  const total = hasFilters ? (filteredItems?.length ?? 0) : (pagedQuery.data?.total ?? null);
  const hasMore = hasFilters
    ? offset + page.pageSize < (filteredItems?.length ?? 0)
    : pagedQuery.data?.hasMore;

  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <p className="text-lg font-semibold">{t("builds.items.title")}</p>
      <DataTable
        columns={columns}
        data={rows}
        page={page}
        setPage={setPage}
        total={total}
        hasMore={hasMore}
        cursorMode
        isPlaceholderData={hasFilters ? false : pagedQuery.isPlaceholderData}
        filters={filters}
        setFilters={updateFilters}
      />
    </main>
  );
}
