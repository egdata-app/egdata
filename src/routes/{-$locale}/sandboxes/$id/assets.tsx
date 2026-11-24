import { SandboxQueryState } from "@/components/app/sandbox-catalog";
import { fetchV1SandboxSectionPage } from "@/lib/v1-adapters";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
import { DataTable } from "@/components/tables/assets/table";
import { columns } from "@/components/tables/assets/columns";
import type { Asset } from "@/types/asset";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { cn } from "@/lib/utils";
import {
  sandboxBaseGameQueryOptions,
  sandboxQueryOptions,
  type SandboxBaseGame,
  type SandboxIdentity,
} from "@/queries/sandbox";
import { useEffect, useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { Archive, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

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
    const { country, queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["sandbox", "assets", { id, page: 1, limit: 20, filters: [] }],
      queryFn: () => fetchV1SandboxSectionPage<Asset>(id, "assets", 1, 20, []),
    });

    return {
      id,
      country,
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

    const sandbox = getFetchedQuery<SandboxIdentity>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      sandboxQueryOptions(id).queryKey,
    );
    const offer = getFetchedQuery<SandboxBaseGame>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      sandboxBaseGameQueryOptions(id, ctx.loaderData?.country).queryKey,
    );

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

const editorialTableSurface =
  "[&_.rounded-md.border]:rounded-xl [&_.rounded-md.border]:border-white/10 [&_.rounded-md.border]:bg-card/40 [&_thead_tr]:border-border/50 [&_tbody_tr]:border-border/30 [&_tbody_tr:hover]:bg-card/80";

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
    queryFn: () =>
      fetchV1SandboxSectionPage<Asset>(id, "assets", page.pageIndex + 1, page.pageSize, filters),
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

  useEffect(() => {
    if (assetsData && !isPlaceholderData && assetsData.page - 1 !== page.pageIndex) {
      setPage((current) => ({ ...current, pageIndex: assetsData.page - 1 }));
    }
  }, [assetsData, isPlaceholderData, page.pageIndex]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <SandboxPageHeader
        icon={Archive}
        eyebrow={t("sandboxes.assetsEyebrow")}
        title={t("sandboxes.assetsTitle")}
        description={t("sandboxes.assetsDescription")}
        stats={[
          { label: t("sandboxes.totalAssetsLabel"), value: formatSandboxCount(assetsData?.count) },
        ]}
      >
        {isFetching && !isPending && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/80 px-3 py-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="size-3 animate-spin" />
            {t("sandboxCatalog.refreshing")}
          </span>
        )}
      </SandboxPageHeader>
      {isPending ? (
        <SandboxQueryState loading />
      ) : isError ? (
        <SandboxQueryState error retry={() => void refetch()} />
      ) : (
        <div
          aria-busy={isFetching}
          className={cn(
            "transition-opacity duration-150",
            editorialTableSurface,
            isPlaceholderData && "opacity-60",
          )}
        >
          <DataTable
            columns={columns}
            data={assetsData?.elements ?? []}
            setPage={setPage}
            page={page}
            total={assetsData?.total ?? null}
            hasMore={assetsData?.hasMore}
            cursorMode
            isPlaceholderData={isPlaceholderData}
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
