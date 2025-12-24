import { columns } from "@/components/tables/items/columns";
import { DataTable } from "@/components/tables/items/table";
import { getQueryClient } from "@/lib/client";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate, type DehydratedState, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer | undefined;
};

export const Route = createFileRoute("/offers/$id/items")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;
    return (
      <HydrationBoundary state={dehydratedState}>
        <ItemsPage />
      </HydrationBoundary>
    );
  },
  // @ts-expect-error - loader return type
  loader: async ({ params, context }) => {
    const { queryClient } = context;

    const offer = getFetchedQuery<SingleOffer>(queryClient, dehydrate(queryClient), [
      "offer",
      { id: params.id },
    ]);

    await queryClient.prefetchQuery({
      queryKey: ["offer-items", { id: params.id }],
      queryFn: () => httpClient.get<SingleItem[]>(`/offers/${params.id}/items`),
    });

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
      meta: generateOfferMeta(offer, "Items"),
    };
  },
});

function ItemsPage() {
  const { id } = Route.useLoaderData() as LoaderData;
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const {
    data: items,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["offer-items", { id }],
    queryFn: () => httpClient.get<SingleItem[]>(`/offers/${id}/items`),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <section id="offer-items" className="w-full h-full">
        <h2 className="text-2xl font-bold">Items</h2>
        <div>Something went wrong</div>
      </section>
    );
  }

  return (
    <section id="offer-items" className="w-full h-full max-w-7xl mx-auto px-4">
      <h2 className="text-xl md:text-2xl font-bold mb-4">Items</h2>
      <DataTable<SingleItem, unknown>
        columns={columns}
        data={items ?? []}
        setPage={setPage}
        page={page}
        total={items?.length ?? 0}
        filters={filters}
        setFilters={setFilters}
      />
    </section>
  );
}
