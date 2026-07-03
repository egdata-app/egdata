import { columns } from "@/components/tables/builds/columns";
import { DataTable } from "@/components/tables/builds/table";
import { getQueryClient } from "@/lib/client";
import { generateItemMeta } from "@/lib/generate-item-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import type { Build } from "@/types/builds";
import type { SingleItem } from "@/types/single-item";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/items/$id/builds")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };
    return (
      <HydrationBoundary state={dehydratedState}>
        <ItemBuildsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["item", "builds", { id }],
      queryFn: () => httpClient.get<Build[]>(`/items/${id}/builds`).catch(() => []),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("items.notFound"),
            description: i18n.t("items.notFound"),
          },
        ],
      };
    }

    const item = getFetchedQuery<SingleItem>(queryClient, ctx.loaderData?.dehydratedState, [
      "item",
      { id: params.id },
    ]);

    if (!item) {
      return {
        meta: [
          {
            title: i18n.t("items.notFound"),
            description: i18n.t("items.notFound"),
          },
        ],
      };
    }

    return {
      meta: generateItemMeta(item, i18n.t("items.builds.title")),
    };
  },
});

function ItemBuildsPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const { data: builds } = useQuery({
    queryKey: ["item", "builds", { id }],
    queryFn: () => httpClient.get<Build[]>(`/items/${id}/builds`).catch(() => []),
  });

  if (!builds) {
    return null;
  }

  return (
    <div className="flex flex-col items-start justify-start h-full gap-4 w-full">
      <h2 className="text-xl font-bold">{t("items.builds.title")}</h2>
      <DataTable<Build, unknown>
        columns={columns}
        data={builds}
        setPage={setPage}
        page={page}
        total={builds.length}
        filters={filters}
        setFilters={setFilters}
      />
    </div>
  );
}
