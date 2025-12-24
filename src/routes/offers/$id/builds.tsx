import { columns } from "@/components/tables/builds/columns";
import { DataTable } from "@/components/tables/builds/table";
import { getQueryClient } from "@/lib/client";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate, HydrationBoundary, queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { Build } from "@/types/builds";

const getOfferBuilds = (id: string) =>
  queryOptions({
    queryKey: ["offer-builds", { id }],
    queryFn: () => httpClient.get<Build[]>(`/offers/${id}/builds`),
  });

export const Route = createFileRoute("/offers/$id/builds")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();
    return (
      <HydrationBoundary state={dehydratedState}>
        <BuildsPage />
      </HydrationBoundary>
    );
  },
  loader: async ({ params, context }) => {
    const { queryClient } = context;

    const offer = getFetchedQuery<SingleOffer>(queryClient, dehydrate(queryClient), [
      "offer",
      { id: params.id },
    ]);

    await queryClient.prefetchQuery(getOfferBuilds(params.id));

    return {
      id: params.id,
      dehydratedState: dehydrate(queryClient),
      offer,
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "offer",
      { id: params.id },
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, "Builds"),
    };
  },
});

function BuildsPage() {
  const { id } = Route.useLoaderData();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const {
    data: builds,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["offer-builds", { id }],
    queryFn: () => httpClient.get<Build[]>(`/offers/${id}/builds`),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <section id="offer-builds" className="w-full h-full max-w-7xl mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Builds</h2>
        <div>Something went wrong</div>
      </section>
    );
  }

  // Filter builds based on the current filters
  const filteredBuilds =
    builds?.filter((build) => {
      return filters.every((filter) => {
        if (filter.id === "labelName" && Array.isArray(filter.value)) {
          const platform = build.labelName.split("-")[1];
          return filter.value.includes(platform);
        }
        const value = build[filter.id as keyof Build];
        if (Array.isArray(filter.value)) {
          return filter.value.includes(value);
        }
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      });
    }) ?? [];

  return (
    <section id="offer-builds" className="w-full h-full max-w-7xl mx-auto px-4">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Builds</h2>
      <DataTable<Build, unknown>
        columns={columns}
        data={filteredBuilds}
        setPage={setPage}
        page={page}
        total={filteredBuilds.length}
        filters={filters}
        setFilters={setFilters}
      />
    </section>
  );
}
