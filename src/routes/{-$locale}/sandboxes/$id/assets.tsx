import { SandboxQueryState } from "@/components/app/sandbox-catalog";
import { httpClient } from "@/lib/http-client";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
import { DataTable } from "@/components/tables/assets/table";
import { columns } from "@/components/tables/assets/columns";
import type { SingleOffer } from "@/types/single-offer";
import type { Asset } from "@/types/asset";
import type { SingleSandbox } from "@/types/single-sandbox";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { Archive } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

interface PaginatedResponse<T> {
  elements: T[];
  page: number;
  limit: number;
  count: number;
}

export const Route = createFileRoute("/{-$locale}/sandboxes/$id/assets")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxAssetsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["sandbox", "assets", { id, page: 1, limit: 20, filters: [] }],
      queryFn: () =>
        httpClient.get<PaginatedResponse<Asset>>(`/sandboxes/${id}/assets`, {
          params: { page: 1, limit: 20 },
        }),
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
      meta: generateSandboxMeta(sandbox, offer, i18n.t("sandboxes.metaAssetsTitle")),
    };
  },
});

function SandboxAssetsPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const recordsQuery = useQuery({
    queryKey: [
      "sandbox",
      "assets",
      { id, page: page.pageIndex + 1, limit: page.pageSize, filters },
    ],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", (page.pageIndex + 1).toString());
      queryParams.set("limit", page.pageSize.toString());
      for (const filter of filters) {
        queryParams.set(filter.id, filter.value as string);
      }

      return httpClient.get<PaginatedResponse<Asset>>(`/sandboxes/${id}/assets`, {
        params: Object.fromEntries(queryParams),
      });
    },
    placeholderData: keepPreviousData,
  });

  const {
    data: assetsData,
    isPending,
    isError,
    isFetching,
    isPlaceholderData,
    refetch,
  } = recordsQuery;
  const updateFilters: typeof setFilters = (next) => {
    setFilters(next);
    setPage((current) => ({ ...current, pageIndex: 0 }));
  };

  return (
    <div className="flex min-w-0 flex-col gap-5 w-full">
      <SandboxPageHeader
        icon={Archive}
        eyebrow={t("sandboxes.assetsEyebrow")}
        title={t("sandboxes.assetsTitle")}
        description={t("sandboxes.assetsDescription")}
        stats={[
          { label: t("sandboxes.totalAssetsLabel"), value: formatSandboxCount(assetsData?.count) },
        ]}
      />
      {isFetching && !isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("sandboxCatalog.refreshing")}
        </p>
      )}
      {isPending ? (
        <SandboxQueryState loading />
      ) : isError ? (
        <SandboxQueryState error retry={() => void refetch()} />
      ) : (
        <div aria-busy={isFetching} className={isPlaceholderData ? "opacity-60" : ""}>
          <DataTable
            columns={columns}
            data={assetsData?.elements ?? []}
            setPage={setPage}
            page={page}
            total={assetsData?.count ?? 0}
            filters={filters}
            setFilters={updateFilters}
            emptyContent={
              <SandboxQueryState
                empty={!filters.length}
                reset={filters.length ? () => updateFilters([]) : undefined}
              />
            }
          />
        </div>
      )}
    </div>
  );
}
