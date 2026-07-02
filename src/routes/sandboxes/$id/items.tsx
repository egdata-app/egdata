import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
import { DataTable } from "@/components/tables/items/table";
import { columns } from "@/components/tables/items/columns";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { DehydratedState } from "@tanstack/react-query";
import { LibrarySquareIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

interface PaginatedResponse<T> {
  elements: T[];
  page: number;
  limit: number;
  count: number;
}

export const Route = createFileRoute("/sandboxes/$id/items")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxItemsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["sandbox", "items", { id, page: 1, limit: 20, filters: [] }],
      queryFn: () =>
        httpClient
          .get<PaginatedResponse<SingleItem>>(`/sandboxes/${id}/items`, {
            params: { page: 1, limit: 20 },
          })
          .catch(() => null),
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
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
          },
        ],
      };
    }

    const { id } = params;

    const sandbox = getFetchedQuery<SingleSandbox>(queryClient, ctx.loaderData?.dehydratedState, [
      "sandbox",
      { id },
    ]);
    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "sandbox",
      "base-game",
      { id },
    ]);

    if (!sandbox)
      return {
        meta: [
          {
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
          },
        ],
      };

    return {
      meta: generateSandboxMeta(sandbox, offer, i18n.t("sandboxes.metaItemsTitle")),
    };
  },
});

function SandboxItemsPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const itemsQuery = useQuery({
    queryKey: ["sandbox", "items", { id, page: page.pageIndex + 1, limit: page.pageSize, filters }],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", (page.pageIndex + 1).toString());
      queryParams.set("limit", page.pageSize.toString());
      for (const filter of filters) {
        queryParams.set(filter.id, filter.value as string);
      }
      return httpClient.get<PaginatedResponse<SingleItem>>(`/sandboxes/${id}/items`, {
        params: Object.fromEntries(queryParams),
      });
    },
    placeholderData: keepPreviousData,
  });

  const { data: itemsData } = itemsQuery;

  return (
    <div className="flex flex-col gap-6 w-full">
      <SandboxPageHeader
        icon={LibrarySquareIcon}
        eyebrow={t("sandboxes.itemsEyebrow")}
        title={t("sandboxes.itemsTitle")}
        description={t("sandboxes.itemsDescription")}
        stats={[
          { label: t("sandboxes.totalItemsLabel"), value: formatSandboxCount(itemsData?.count) },
        ]}
      />
      <DataTable
        columns={columns}
        data={itemsData?.elements ?? []}
        setPage={setPage}
        page={page}
        total={itemsData?.count ?? 0}
        filters={filters}
        setFilters={setFilters}
      />
    </div>
  );
}
