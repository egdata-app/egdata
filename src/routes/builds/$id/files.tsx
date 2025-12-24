import { columns } from "@/components/tables/files/columns";
import { DataTable } from "@/components/tables/files/table";
import { httpClient } from "@/lib/http-client";
import type { BuildFiles } from "@/types/builds";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useState } from "react";

export const Route = createFileRoute("/builds/$id/files")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };
    return (
      <HydrationBoundary state={dehydratedState}>
        <FilesPage />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["build-files", { id, page: { pageIndex: 0, pageSize: 25 }, options: [] }],
      queryFn: () =>
        httpClient.get<BuildFiles>(`/builds/${id}/files`, {
          params: {
            page: 1,
          },
        }),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

function FilesPage() {
  const { id } = Route.useLoaderData() as { dehydratedState: DehydratedState; id: string };
  const [page, setPage] = useState<{
    pageIndex: number;
    pageSize: number;
  }>({ pageIndex: 0, pageSize: 25 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);

  const { data: files } = useQuery({
    queryKey: ["build-files", { id, page, options: filters }],
    queryFn: () =>
      httpClient.get<BuildFiles>(`/builds/${id}/files`, {
        params: {
          page: page.pageIndex + 1,
          q: (filters.find((f) => f.id === "fileName")?.value as string) ?? undefined,
          extension: (() => {
            const mimeTypeFilter = filters.find((f) => f.id === "mimeType");
            return mimeTypeFilter?.value ? (mimeTypeFilter.value as string[]).join(",") : undefined;
          })(),
        },
      }),
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
      <p className="text-lg font-semibold">Files</p>
      <DataTable
        columns={columns}
        data={files?.files ?? []}
        setPage={setPage}
        page={page}
        total={files?.total ?? 0}
        filters={filters}
        setFilters={setFilters}
      />
    </main>
  );
}
