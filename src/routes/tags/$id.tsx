import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { DehydratedState } from "@tanstack/react-query";
import {
  dehydrate,
  HydrationBoundary,
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import type { SingleOffer } from "@/types/single-offer";
import { z } from "zod";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { httpClient } from "@/lib/http-client";
import { useCountry } from "@/hooks/use-country";
import { usePreferences } from "@/hooks/use-preferences";
import debounce from "lodash.debounce";
import { getImage } from "@/lib/get-image";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GridIcon, ListBulletIcon } from "@radix-ui/react-icons";
import { OfferCard } from "@/components/app/offer-card";
import { OfferListItem } from "@/components/app/game-card";

type SortBy =
  | "releaseDate"
  | "lastModifiedDate"
  | "effectiveDate"
  | "creationDate"
  | "viewableDate"
  | "pcReleaseDate"
  | "upcoming"
  | "price";

const sortByDisplay: Record<SortBy, string> = {
  releaseDate: "Release Date",
  lastModifiedDate: "Modified Date",
  effectiveDate: "Effective Date",
  creationDate: "Creation Date",
  viewableDate: "Viewable Date",
  pcReleaseDate: "PC Release Date",
  upcoming: "Upcoming",
  price: "Price",
};

const fetchPromotionData = async ({
  id,
  country,
  page,
  sortBy,
  sortDir,
  query,
}: {
  id: string;
  country: string;
  page: number;
  sortBy: SortBy | null;
  sortDir: "asc" | "desc" | null;
  query: "" | string;
}) => {
  const data = await httpClient.get<{
    elements: SingleOffer[];
    title: string;
    start: number;
    page: number;
    count: number;
  }>(`/promotions/${id}`, {
    params: {
      country,
      page,
      limit: 20,
      sortBy: sortBy || undefined,
      sortDir: sortDir || undefined,
      q: query !== "" ? query : undefined,
    },
  });
  return data;
};

const searchParamsSchema = z.object({
  page: z.number().optional(),
  sortBy: z
    .enum([
      "releaseDate",
      "lastModifiedDate",
      "effectiveDate",
      "creationDate",
      "viewableDate",
      "pcReleaseDate",
      "upcoming",
      "price",
    ])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  q: z.string().optional(),
  country: z.string().optional(),
});

export const Route = createFileRoute("/tags/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      cover: Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages"> | null;
      promotion: { elements: SingleOffer[]; title: string; start: number; page: number; count: number } | null;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <RouteComponent />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ context, params, search }) => {
    const { queryClient, country } = context;
    const { id } = params;

    // const { page, sortBy, sortDir, q } = search;
    const page = search?.page ?? 1;
    const sortBy = search?.sortBy ?? "lastModifiedDate";
    const sortDir = search?.sortDir ?? "desc";
    const q = search?.q ?? "";

    const [coverData, initialData] = await Promise.allSettled([
      queryClient.fetchQuery({
        queryKey: ["promotion-cover", { id }],
        queryFn: () =>
          httpClient.get<Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages">>(
            `/promotions/${id}/cover`,
          ),
      }),
      queryClient.fetchQuery({
        queryKey: [
          "promotion-meta",
          { id, country, limit: 20, sortBy, sortDir, query: q, page: 1 },
        ],
        queryFn: () =>
          fetchPromotionData({
            id,
            country: country ?? "US",
            page: 1,
            sortBy,
            sortDir,
            query: q,
          }),
      }),
      queryClient.prefetchInfiniteQuery({
        queryKey: ["promotion", { id, country, sortBy, sortDir, query: q, limit: 20 }],
        queryFn: ({ pageParam }) =>
          fetchPromotionData({
            id,
            country: country ?? "US",
            page: pageParam as number,
            sortBy,
            sortDir,
            query: q,
          }),
        initialPageParam: page,
        getNextPageParam: (
          lastPage: { elements: SingleOffer[]; start: number; count: number },
          allPages: { elements: SingleOffer[]; start: number; count: number }[],
        ) => {
          // If the start is greater than the count, we have reached the end
          if (lastPage.start + 20 > lastPage.count) {
            return undefined;
          }

          return allPages?.length + 1;
        },
      }),
    ]);

    const cover = coverData.status === "fulfilled" ? coverData.value : null;

    return {
      cover,
      id,
      promotion: initialData.status === "fulfilled" ? initialData.value : null,
      dehydratedState: dehydrate(queryClient),
    };
  },

  validateSearch: zodSearchValidator(searchParamsSchema),

  head: (ctx) => {
    const { params, loaderData } = ctx;

    if (!loaderData) {
      return {
        meta: [
          {
            title: "Promotion not found",
            description: "Promotion not found",
          },
        ],
      };
    }

    const { promotion, cover } = loaderData;

    if (!promotion || !cover) {
      return {
        meta: [
          {
            title: "Promotion not found",
            description: "Promotion not found",
          },
        ],
      };
    }

    const { title, count } = promotion;

    const coverImage =
      getImage(cover?.keyImages || [], [
        "OfferImageWide",
        "featuredMedia",
        "DieselGameBoxWide",
        "DieselStoreFrontWide",
      ])?.url ?? "https://egdata.app/placeholder.webp";

    return {
      meta: [
        {
          title: `${title} | egdata.app`,
        },
        {
          name: "description",
          content: `Checkout ${count} available offers for ${title} on egdata.app.`,
        },
        {
          name: "og:title",
          content: `${title} - egdata.app`,
        },
        {
          name: "og:description",
          content: `Checkout ${count} available offers for ${title} on egdata.app.`,
        },
        {
          name: "twitter:title",
          content: `${title} - egdata.app`,
        },
        {
          name: "twitter:description",
          content: `Checkout ${count} available offers for ${title} on egdata.app.`,
        },
        {
          name: "og:image",
          content: coverImage,
        },
        {
          name: "twitter:image",
          content: coverImage,
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          name: "og:site_name",
          content: "egdata.app",
        },
        {
          name: "og:url",
          content: `https://egdata.app/promotions/${params.id}`,
        },
        //   {
        //     'script:ld+json': {
        //       '@context': 'https://schema.org',
        //       '@type': 'Event',
        //       name: title,
        //       description: `Checkout ${count} available offers for ${title} on egdata.app.`,
        //       image: coverImage,
        //       url: `https://egdata.app/promotions/${params.id}`,
        //       location: {
        //         url: `https://egdata.app/promotions/${params.id}`,
        //         name: title,
        //         image: coverImage,
        //       },
        //       organizer: {
        //         '@type': 'Organization',
        //         name: 'Epic Games',
        //         url: 'https://store.epicgames.com',
        //       },
        //       startDate:
        //         promotion.elements
        //           .find((game) =>
        //             game.price?.appliedRules.find((rule) => rule.startDate)
        //           )
        //           ?.price?.appliedRules.find((rule) => rule.startDate)?.startDate ??
        //         new Date(Date.now() - 86400000).toISOString(),
        //       offers: {
        //         '@type': 'AggregateOffer',
        //         availability: 'https://schema.org/InStock',
        //         priceCurrency:
        //           promotion.elements[0]?.price?.price.currencyCode ?? 'USD',
        //         lowPrice:
        //           Math.min(
        //             ...promotion.elements.map(
        //               (game) => game.price?.price.originalPrice ?? 0
        //             )
        //           ) / 100,
        //         highPrice:
        //           Math.max(
        //             ...promotion.elements.map(
        //               (game) => game.price?.price.originalPrice ?? 0
        //             )
        //           ) / 100,
        //         offerCount: count,
        //         offers: promotion.elements.map((game) => ({
        //           '@type': 'Offer',
        //           url: `https://egdata.app/offers/${game.id}`,
        //         })),
        //       },
        //     },
        //   },
      ],
    };
  },
});

function RouteComponent() {
  const { country } = useCountry();
  const { view, setView } = usePreferences();
  const [sortBy, setSortBy] = React.useState<SortBy>("lastModifiedDate");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [inputValue, setInputValue] = React.useState("");
  const [query, setQuery] = React.useState("");
  const debouncedSetQuery = debounce(setQuery, 500);
  const { cover, id } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    cover: Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages"> | null;
    promotion: { elements: SingleOffer[]; title: string; start: number; page: number; count: number } | null;
  };
  const {
    data: promotion,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["promotion", { id, country, sortBy, sortDir, query, limit: 20 }],
    queryFn: ({ pageParam }) =>
      fetchPromotionData({
        id,
        country,
        page: pageParam as number,
        sortBy,
        sortDir,
        query,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.start + 20 > lastPage.count) {
        return undefined;
      }

      return allPages?.length + 1;
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!promotion) {
    return null;
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    debouncedSetQuery(event.target.value);
  };

  return (
    <main className="container mx-auto">
      <div
        className="relative h-96 overflow-hidden rounded-2xl flex items-center bg-cover bg-center"
        style={{
          backgroundImage: `url(${
            getImage(cover?.keyImages ?? [], [
              "OfferImageWide",
              "featuredMedia",
              "DieselGameBoxWide",
              "DieselStoreFrontWide",
            ])?.url ?? "/placeholder.webp"
          })`,
        }}
      >
        <div className="h-full w-full flex flex-col justify-center items-start text-white p-8 bg-gradient-to-r from-black/80 to-black/30">
          <h1 className="text-5xl font-bold">{promotion.pages[0].title}</h1>
          <p className="mt-4 text-lg">{promotion.pages[0]?.count} offers available in this event</p>
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mt-5">
        <div className="inline-flex items-center gap-2">
          <h2 className="text-2xl">Results</h2>
          <span className="text-sm text-gray-500">
            ({promotion.pages.reduce((acc, page) => acc + page.elements.length, 0)} results)
          </span>
          {isFetching && (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </div>
        <div className="flex :flex-row gap-2">
          <Input
            type="search"
            placeholder="Search..."
            className="w-[200px] cursor-text"
            onChange={handleInputChange}
            value={inputValue}
          />
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue className="text-sm">{sortByDisplay[sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortByDisplay).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          >
            <ArrowDownIcon
              className={cn(
                "h-5 w-5 transform transition-transform",
                sortDir === "asc" ? "-rotate-180" : "rotate-0",
              )}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={() => setView(view === "grid" ? "list" : "grid")}
          >
            {view === "grid" ? (
              <ListBulletIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <GridIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>
      <div
        className={cn(
          "mt-8 grid gap-4",
          view === "grid" ? "grid-cols-1 lg:grid-cols-3 xl:grid-cols-5" : "grid-cols-1",
        )}
      >
        {promotion.pages
          .flatMap((page) => page.elements)
          .map((game) =>
            view === "grid" ? (
              <OfferCard offer={game} key={game.id} size="md" />
            ) : (
              <OfferListItem game={game} key={game.id} />
            ),
          )}
      </div>
      <div className="flex justify-center mt-8">
        <Button disabled={!hasNextPage} onClick={() => fetchNextPage()}>
          {isFetchingNextPage && (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          Load More
        </Button>
      </div>
    </main>
  );
}
