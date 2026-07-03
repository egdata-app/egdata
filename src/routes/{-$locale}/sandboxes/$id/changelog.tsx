import { ChangeTracker } from "@/components/app/changelog/item";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileClock } from "lucide-react";
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
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["changelog", { id: params.id, page: 1, limit: 20 }],
      queryFn: () =>
        httpClient
          .get<ChangelogResponse>(`/sandboxes/${params.id}/changelog`, {
            params: { page: 1, limit: 20 },
          })
          .catch(() => null),
    });

    return {
      params,
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
      meta: generateSandboxMeta(sandbox, offer, i18n.t("sandboxes.metaChangelogTitle")),
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["changelog", { id, page, limit: 20 }],
    queryFn: () =>
      httpClient
        .get<ChangelogResponse>(`/sandboxes/${id}/changelog`, {
          params: { page, limit: 20 },
        })
        .catch(() => null),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <SandboxPageHeader
          icon={FileClock}
          eyebrow={t("sandboxes.changelogEyebrow")}
          title={t("sandboxes.changelogTitle")}
          description={t("sandboxes.changelogDescription")}
          stats={[
            { label: t("sandboxes.totalChangesLabel"), value: "Loading" },
            { label: t("sandboxes.queryTimeLabel"), value: "Loading" },
          ]}
        />
        <div className="grid grid-cols-1 gap-4 w-full">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
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
          { label: t("sandboxes.queryTimeLabel"), value: `${data?.processingTimeMs ?? 0} ms` },
        ]}
      />
      <div className="grid grid-cols-1 gap-4 w-full">
        {data?.hits
          // Filter out hits without metadata
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
      {data?.hits?.length === 0 && (
        <div className="text-center">{t("sandboxes.noChangelogFound")}</div>
      )}
      {(data?.hits?.length ?? 0) > 0 && (
        <DynamicPagination
          totalPages={data ? Math.ceil(data.estimatedTotalHits / data.limit) : 0}
          currentPage={page}
          setPage={setPage}
        />
      )}
    </div>
  );
}
