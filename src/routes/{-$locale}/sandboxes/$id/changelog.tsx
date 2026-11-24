import { SandboxQueryState } from "@/components/app/sandbox-catalog";
import { ChangeTracker } from "@/components/app/changelog/item";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import {
  sandboxBaseGameQueryOptions,
  sandboxQueryOptions,
  type SandboxBaseGame,
  type SandboxIdentity,
} from "@/queries/sandbox";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import {
  fetchV1CursorPageAt,
  getV1TotalPages,
  type V1CursorPaginationMeta,
} from "@/lib/v1-adapters";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileClock, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

interface ChangelogResponse {
  hits: (OfferHit | ItemHit | AssetHit | Hit)[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
  hasMore?: boolean;
  totalPages?: number | null;
}

async function fetchSandboxChangelogPage(id: string, page: number): Promise<ChangelogResponse> {
  const { envelope, hasMore, total } = await fetchV1CursorPageAt<
    { hits: ChangelogResponse["hits"] },
    V1CursorPaginationMeta
  >(
    (cursor) =>
      httpClient.v1GetEnvelope<{ hits: ChangelogResponse["hits"] }, V1CursorPaginationMeta>(
        `/sandboxes/${id}/changelog`,
        { params: { cursor, limit: 20 } },
      ),
    page,
    `sandbox-changelog:${id}:20`,
  );
  const hits = Array.isArray(envelope?.data?.hits) ? envelope.data.hits : [];
  return {
    hits,
    query: "",
    processingTimeMs: 0,
    limit: envelope?.meta?.pagination?.limit ?? 20,
    offset: 0,
    estimatedTotalHits: total ?? hits.length,
    hasMore,
    totalPages: getV1TotalPages(envelope?.meta?.pagination, 20),
  };
}

interface DefaultHit {
  _id: string;
  timestamp: string;
  metadata: Metadata;
}

interface Metadata {
  changes: Change[];
  contextId: string;
  contextType: string;
}

interface Change {
  changeType: "insert" | "update" | "delete";
  field: string;
  newValue: unknown;
  oldValue: unknown;
}

interface OfferHit extends DefaultHit {
  metadata: Metadata & { contextType: "offer" };
  document: SingleOffer;
}

interface ItemHit extends DefaultHit {
  metadata: Metadata & { contextType: "item" };
  document: SingleItem;
}

interface AssetHit extends DefaultHit {
  metadata: Metadata & { contextType: "asset" };
  document: SingleItem;
}

interface Hit {
  _id: string;
  timestamp: string;
  metadata: Metadata;
  document: null;
}

export const Route = createFileRoute("/{-$locale}/sandboxes/$id/changelog")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      params: { id: string };
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <RouteComponent />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { country, queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["changelog", { id: params.id, page: 1, limit: 20 }],
      queryFn: () => fetchSandboxChangelogPage(params.id, 1),
    });

    return {
      params,
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
      meta: generateSandboxMeta(sandbox, offer, i18n.t("sandboxes.metaChangelogTitle")),
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [page, setPage] = useState(1);
  const {
    data,
    isPending: isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    placeholderData: keepPreviousData,
    queryKey: ["changelog", { id, page, limit: 20 }],
    queryFn: () => fetchSandboxChangelogPage(id, page),
  });

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <SandboxPageHeader
          icon={FileClock}
          eyebrow={t("sandboxes.changelogEyebrow")}
          title={t("sandboxes.changelogTitle")}
          description={t("sandboxes.changelogDescription")}
          stats={[{ label: t("sandboxes.totalChangesLabel"), value: "—" }]}
        />
        <div className="grid w-full grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
              key={index}
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-card/60 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) return <SandboxQueryState error retry={() => void refetch()} />;

  return (
    <div className="flex w-full flex-col gap-6">
      <SandboxPageHeader
        icon={FileClock}
        eyebrow={t("sandboxes.changelogEyebrow")}
        title={t("sandboxes.changelogTitle")}
        description={t("sandboxes.changelogDescription")}
        stats={[
          {
            label: t("sandboxes.totalChangesLabel"),
            value: formatSandboxCount(data?.estimatedTotalHits),
          },
        ]}
      >
        {isFetching && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-card/80 px-3 py-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="size-3 animate-spin" />
            {t("sandboxCatalog.refreshing")}
          </span>
        )}
      </SandboxPageHeader>

      <div className="flex w-full flex-col gap-4 [&>[data-slot=card]]:rounded-xl [&>[data-slot=card]]:border [&>[data-slot=card]]:border-white/10 [&>[data-slot=card]]:bg-card/80 [&>[data-slot=card]]:transition-[box-shadow,border-color,background-color] [&>[data-slot=card]]:duration-200 [&>[data-slot=card]]:ease-out [&>[data-slot=card]:hover]:border-primary/60 [&>[data-slot=card]:hover]:bg-card [&>[data-slot=card]:hover]:shadow-lg [&>[data-slot=card]:hover]:shadow-black/35">
        {data?.hits
          .filter((hit) => hit.metadata)
          .map((hit) => (
            <ChangeTracker
              key={hit._id}
              {...({
                _id: hit._id,
                document: hit.document,
                metadata: hit.metadata,
                timestamp: hit.timestamp,
              } as Parameters<typeof ChangeTracker>[0])}
            />
          ))}
      </div>

      {data?.hits?.length === 0 && <SandboxQueryState empty />}

      {(data?.hits?.length ?? 0) > 0 && (
        <div className="[&_button]:transition-colors [&_button]:duration-150">
          <DynamicPagination
            cursorMode
            totalPages={data?.totalPages ?? null}
            hasMore={data?.hasMore}
            currentPage={page}
            setPage={setPage}
          />
        </div>
      )}
    </div>
  );
}
