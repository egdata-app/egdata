import { columns } from "@/components/tables/items/columns";
import { DataTable } from "@/components/tables/items/table";
import { buildItemsQueryOptions } from "@/queries/build-details";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

function ItemsPage() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as { dehydratedState: DehydratedState; id: string };
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 25 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);

  const { data: items } = useQuery({
    ...buildItemsQueryOptions(id, page.pageIndex + 1, page.pageSize),
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <p className="text-lg font-semibold">{t("builds.items.title")}</p>
      <DataTable
        columns={columns}
        data={items?.data ?? []}
        page={page}
        setPage={setPage}
        total={items?.total ?? null}
        hasMore={items?.hasMore}
        cursorMode
        filters={filters}
        setFilters={setFilters}
      />
    </main>
  );
}
