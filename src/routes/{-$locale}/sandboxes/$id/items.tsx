import { SandboxQueryState } from "@/components/app/sandbox-catalog";
import { fetchV1SandboxSectionPage } from "@/lib/v1-adapters";
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
import { useEffect, useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { DehydratedState } from "@tanstack/react-query";
import { LibrarySquareIcon } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/sandboxes/$id/items")({
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
      queryFn: () => fetchV1SandboxSectionPage<SingleItem>(id, "items", 1, 20, []),
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
  const recordsQuery = useQuery({
    queryKey: ["sandbox", "items", { id, page: page.pageIndex + 1, limit: page.pageSize, filters }],
    queryFn: () =>
      fetchV1SandboxSectionPage<SingleItem>(
        id,
        "items",
        page.pageIndex + 1,
        page.pageSize,
        filters,
      ),
    placeholderData: keepPreviousData,
  });

  const {
    data: itemsData,
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
    if (itemsData && !isPlaceholderData && itemsData.page - 1 !== page.pageIndex) {
      setPage((current) => ({ ...current, pageIndex: itemsData.page - 1 }));
    }
  }, [itemsData, isPlaceholderData, page.pageIndex]);

  return (
    <div className="flex min-w-0 flex-col gap-5 w-full">
      <SandboxPageHeader
        icon={LibrarySquareIcon}
        eyebrow={t("sandboxes.itemsEyebrow")}
        title={t("sandboxes.itemsTitle")}
        description={t("sandboxes.itemsDescription")}
        stats={[
          { label: t("sandboxes.totalItemsLabel"), value: formatSandboxCount(itemsData?.count) },
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
            data={itemsData?.elements ?? []}
            setPage={setPage}
            page={page}
            total={itemsData?.total ?? null}
            hasMore={itemsData?.hasMore}
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
