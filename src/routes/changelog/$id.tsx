import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { dehydrate, HydrationBoundary, queryOptions, useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { ChangeTracker } from "@/components/app/changelog/item";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import { OfferCard } from "@/components/app/offer-card";

type ChangeResponse = OfferHit | ItemHit | AssetHit | Hit;

interface DefaultHit {
  _id: string;
  timestamp: string;
  metadata: Metadata;
}

interface Metadata {
  changes: Change[];
  contextId: string;
  contextType: string;
  context: SingleOffer | SingleItem | null;
}

interface Change {
  changeType: "insert" | "update" | "delete";
  field: string;
  newValue: unknown;
  oldValue: unknown;
}

interface OfferHit extends DefaultHit {
  metadata: Metadata & { contextType: "offer"; context: SingleOffer };
}

interface ItemHit extends DefaultHit {
  metadata: Metadata & { contextType: "item"; context: SingleItem };
}

interface AssetHit extends DefaultHit {
  metadata: Metadata & { contextType: "asset"; context: SingleItem };
}

interface Hit {
  _id: string;
  timestamp: string;
  metadata: Metadata;
}

const sandboxBaseGameQuery = (id: string | undefined) =>
  queryOptions({
    queryKey: ["sandbox", "base-game", { id }],
    queryFn: () =>
      httpClient.get<SingleOffer | (SingleItem & { isItem: true })>(`/sandboxes/${id}/base-game`),
    enabled: !!id,
  });

export const Route = createFileRoute("/changelog/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <ChangeDetailPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const { id } = params;

    const data = await queryClient.ensureQueryData({
      queryKey: ["changelog", id],
      queryFn: () => httpClient.get<ChangeResponse>(`/changelist/${id}`),
    });

    if (data?.metadata.context?.namespace) {
      await queryClient.prefetchQuery(sandboxBaseGameQuery(data.metadata.context.namespace));
    }

    return {
      dehydratedState: dehydrate(queryClient),
      id,
    };
  },

  head() {
    return {
      meta: [
        {
          title: "Change Detail | egdata.app",
        },
      ],
    };
  },
});

function ChangeDetailPage() {
  const { id } = Route.useLoaderData();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["changelog", id],
    queryFn: () => httpClient.get<ChangeResponse>(`/changelist/${id}`),
  });
  const { data: baseGame } = useQuery({
    ...sandboxBaseGameQuery(data?.metadata.context?.namespace),
    enabled: !!data?.metadata.context?.namespace,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div>Loading...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div>Error loading change details</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <div>Change not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
      <div className="grid gap-4">
        <ChangeTracker
          key={data._id}
          _id={data._id}
          document={data.metadata.context}
          metadata={data.metadata}
          timestamp={data.timestamp}
        />
      </div>
    </div>
  );
}
