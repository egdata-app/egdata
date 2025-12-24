import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQueries } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { getSeller } from "@/queries/seller";
import { useCountry } from "@/hooks/use-country";
import { getImage } from "@/lib/get-image";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { SearchContainer } from "@/components/search/SearchContainer";

export const Route = createFileRoute("/sellers/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      country: string;
    };
    return (
      <HydrationBoundary state={dehydratedState}>
        <RouteComponent />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ context, params }) => {
    const { queryClient, country } = context;
    const { id } = params;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["seller", { id, country }],
        queryFn: async () => getSeller(id, country ?? "US"),
      }),
      queryClient.prefetchQuery({
        queryKey: ["seller:cover", { id, country }],
        queryFn: async () =>
          httpClient.get<SingleOffer[]>(`/sellers/${id}/cover`, {
            params: { country },
          }),
      }),
    ]);

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      country,
    };
  },

  head: (ctx) => {
    const { params, loaderData } = ctx;
    const queryClient = getQueryClient();

    if (!loaderData) {
      return {
        meta: [
          {
            title: "Seller not found",
            description: "Seller not found",
          },
        ],
      };
    }

    const seller = getFetchedQuery<SingleOffer[]>(queryClient, loaderData?.dehydratedState, [
      "seller",
      { id: params.id, country: loaderData.country },
    ]);

    if (!seller)
      return {
        meta: [
          {
            title: "Seller not found",
            description: "Seller not found",
          },
        ],
      };

    return {
      meta: [
        {
          title: `${seller[0].seller.name} | egdata.app`,
        },
      ],
    };
  },
});

function RouteComponent() {
  const { id } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    country: string;
  };
  const { country } = useCountry();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const [sellerData, coverData] = useQueries({
    queries: [
      {
        queryKey: ["seller", { id, country }],
        queryFn: () => getSeller(id, country),
      },
      {
        queryKey: ["seller:cover", { id, country }],
        queryFn: () =>
          httpClient.get<SingleOffer[]>(`/sellers/${id}/cover`, {
            params: { country },
          }),
      },
    ],
  });

  const randomCoverIndex = React.useMemo(() => Math.floor(Math.random() * 5 || 0), []);

  const { data, isLoading } = sellerData;
  const { data: cover } = coverData;

  if (!data || isLoading) {
    return <SellerPageSkeleton />;
  }

  const featuredCover = cover?.[randomCoverIndex] ?? cover?.[0] ?? data[0];

  return (
    <div className="min-h-[85vh]">
      <h1 className="text-4xl font-bold text-left">{data[0].seller.name}</h1>
      {featuredCover && (
        <section className="w-full bg-card rounded-xl mt-10 relative group min-h-[500px]">
          <div className="grid gap-8 md:grid-cols-2 lg:gap-16 py-24 px-10 z-[1] relative rounded-xl">
            <span className="hidden md:block" />
            <div className="space-y-4">
              <div className="inline-block rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">
                Featured Game
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                {featuredCover.title}
              </h2>
              <p className="text-gray-300 md:text-xl">{featuredCover.description}</p>
            </div>
          </div>
          <div
            id="cover-bg-image"
            className="absolute top-0 left-0 w-full h-full bg-cover bg-center rounded-xl z-0"
            style={{
              backgroundImage: `url(${getImage(featuredCover.keyImages, [
                "DieselGameBoxWide",
                "DieselStoreFrontWide",
                "OfferImageWide",
              ])?.url.replaceAll(" ", "%20")})`,
            }}
          />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-card/65 to-card z-0 rounded-xl" />
        </section>
      )}

      <section className="mt-16">
        <SearchContainer
          contextId={`seller-${id}`}
          fixedParams={{ seller: id }}
          controls={{ showSeller: false }}
          title={`${data[0].seller.name} Offers`}
          initialSearch={search}
          onSearchChange={(search) => {
            navigate({
              search: {
                ...search,
                seller: undefined,
              },
            });
          }}
        />
      </section>
    </div>
  );
}

function SellerPageSkeleton() {
  return (
    <div className="min-h-[85vh]">
      <h1 className="text-4xl font-bold text-left">
        <Skeleton className=" w-[200px]" />
      </h1>
      <Skeleton className="w-full h-[500px] mt-10" />

      <section className="mt-16">
        <h2 className="text-2xl font-bold">Offers</h2>
        <div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-2 lg:grid-cols-5">
          <OfferCardSkeleton />
          <OfferCardSkeleton />
          <OfferCardSkeleton />
          <OfferCardSkeleton />
          <OfferCardSkeleton />
        </div>
      </section>
    </div>
  );
}

function OfferCardSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div>
            <Skeleton className="w-[200px]" />
            <Skeleton className="w-[100px]" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div>
            <Skeleton className="w-[200px]" />
            <Skeleton className="w-[100px]" />
          </div>
        </div>
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
    </div>
  );
}
