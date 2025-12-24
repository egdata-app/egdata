import { ChangeTracker } from "@/components/app/changelog/item";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { SandboxHeader } from "@/components/app/sandbox-header";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { dehydrate, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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

export const Route = createFileRoute("/sandboxes/$id/changelog")({
  component: RouteComponent,

  loader: async ({ params, context }) => {
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["changelog", { id: params.id, page: 1, limit: 20 }],
      queryFn: () =>
        httpClient.get<ChangelogResponse>(`/sandboxes/${params.id}/changelog`, {
          params: { page: 1, limit: 20 },
        }),
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
            title: "Sandbox not found",
            description: "Sandbox not found",
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
            title: "Sandbox not found",
            description: "Sandbox not found",
          },
        ],
      };

    return {
      meta: generateSandboxMeta(sandbox, offer, "Changelog"),
    };
  },
});

function RouteComponent() {
  const { id } = Route.useParams();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["changelog", { id, page, limit: 20 }],
    queryFn: () =>
      httpClient.get<ChangelogResponse>(`/sandboxes/${id}/changelog`, {
        params: { page, limit: 20 },
      }),
  });
  const { data: baseGame } = useQuery({
    queryKey: ["sandbox", "base-game", { id }],
    queryFn: () => httpClient.get<SingleOffer>(`/sandboxes/${id}/base-game`),
    retry: false,
  });
  const { data: sandbox } = useQuery({
    queryKey: ["sandbox", { id }],
    queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${id}`),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex flex-col items-start justify-start h-full gap-4 px-4 w-full">
      <SandboxHeader
        title={baseGame?.title ?? sandbox?.displayName ?? (sandbox?.name as string)}
        section="changelog"
        id={id}
        sandbox={id}
      />
      <div className="grid grid-cols-1 gap-4 w-full">
        {data?.hits
          // Filter out hits without metadata
          .filter((hit) => hit.metadata)
          .map((hit) => (
            <ChangeTracker
              key={hit._id}
              _id={hit._id}
              document={hit.document}
              metadata={hit.metadata}
              timestamp={hit.timestamp}
            />
          ))}
      </div>
      {data?.hits.length === 0 && <div className="text-center">No changelog found</div>}
      {data?.hits?.length > 0 && (
        <DynamicPagination
          totalPages={data ? Math.ceil(data.estimatedTotalHits / data.limit) : 0}
          currentPage={page}
          setPage={setPage}
        />
      )}
    </main>
  );
}
