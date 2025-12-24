import { columns } from "@/components/tables/items/columns";
import { DataTable } from "@/components/tables/items/table";
import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export const Route = createFileRoute("/builds/$id/items")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();
    return (
      <HydrationBoundary state={dehydratedState}>
        <ItemsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["build-items", { id }],
      queryFn: () => httpClient.get<SingleItem[]>(`/builds/${id}/items`),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

function ItemsPage() {
  const { id } = Route.useLoaderData();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 25 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);

  const { data: items } = useQuery({
    queryKey: ["build-items", { id, page, filters }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: (page.pageIndex + 1).toString(),
        limit: page.pageSize.toString(),
      });

      // Add filters to params
      for (const filter of filters) {
        params.append(filter.id, filter.value as string);
      }

      return httpClient.get<PaginatedResponse<SingleItem>>(
        `/builds/${id}/items?${params.toString()}`,
      );
    },
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <p className="text-lg font-semibold">Items</p>
      <DataTable
        columns={columns}
        data={items?.data ?? []}
        page={page}
        setPage={setPage}
        total={items?.total ?? 0}
        filters={filters}
        setFilters={setFilters}
      />
    </main>
  );
}
