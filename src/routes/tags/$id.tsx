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
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

type SortBy =
  | "releaseDate"
  | "lastModifiedDate"
  | "effectiveDate"
  | "creationDate"
  | "viewableDate"
  | "pcReleaseDate"
  | "upcoming"
  | "price";

const sortByKeys: SortBy[] = [
  "releaseDate",
  "lastModifiedDate",
  "effectiveDate",
  "creationDate",
  "viewableDate",
  "pcReleaseDate",
  "upcoming",
  "price",
];

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
      promotion: {
        elements: SingleOffer[];
        title: string;
        start: number;
        page: number;
        count: number;
      } | null;
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
          httpClient
            .get<Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages">>(
              `/promotions/${id}/cover`,
            )
            .catch(() => null),
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
          }).catch(() => null),
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
          }).catch(() => null),
        initialPageParam: page,
        getNextPageParam: (
          lastPage: { elements: SingleOffer[]; start: number; count: number } | null,
          allPages: ({ elements: SingleOffer[]; start: number; count: number } | null)[],
        ) => {
          if (!lastPage) return undefined;
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
            title: i18n.t("tags.meta.notFoundTitle"),
            description: i18n.t("tags.meta.notFoundDescription"),
          },
        ],
      };
    }

    const { promotion, cover } = loaderData;

    if (!promotion || !cover) {
      return {
        meta: [
          {
            title: i18n.t("tags.meta.notFoundTitle"),
            description: i18n.t("tags.meta.notFoundDescription"),
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
          title: i18n.t("tags.meta.title", { title }),
        },
        {
          name: "description",
          content: i18n.t("tags.meta.description", { count, title }),
        },
        {
          name: "og:title",
          content: i18n.t("tags.meta.socialTitle", { title }),
        },
        {
          name: "og:description",
          content: i18n.t("tags.meta.description", { count, title }),
        },
        {
          name: "twitter:title",
          content: i18n.t("tags.meta.socialTitle", { title }),
        },
        {
          name: "twitter:description",
          content: i18n.t("tags.meta.description", { count, title }),
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
  const { t } = useTranslation();
  const { country } = useCountry();
  const { view, setView } = usePreferences();
  const [sortBy, setSortBy] = React.useState<SortBy>("lastModifiedDate");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [inputValue, setInputValue] = React.useState("");
  const [query, setQuery] = React.useState("");
  const debouncedSetQuery = debounce(setQuery, 500);
  const sortByDisplay: Record<SortBy, string> = {
    releaseDate: t("tags.sortBy.releaseDate"),
    lastModifiedDate: t("tags.sortBy.lastModifiedDate"),
    effectiveDate: t("tags.sortBy.effectiveDate"),
    creationDate: t("tags.sortBy.creationDate"),
    viewableDate: t("tags.sortBy.viewableDate"),
    pcReleaseDate: t("tags.sortBy.pcReleaseDate"),
    upcoming: t("tags.sortBy.upcoming"),
    price: t("tags.sortBy.price"),
  };
  const { cover, id } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    cover: Pick<SingleOffer, "_id" | "id" | "namespace" | "title" | "keyImages"> | null;
    promotion: {
      elements: SingleOffer[];
      title: string;
      start: number;
      page: number;
      count: number;
    } | null;
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
    return <div>{t("tags.loading")}</div>;
  }

  if (!promotion) {
    return null;
  }
  const promotionPages = promotion.pages?.filter(Boolean) ?? [];
  const firstPromotionPage = promotionPages[0];

  if (!firstPromotionPage) {
    return null;
  }
  const promotionOffers = promotionPages.flatMap((page) =>
    Array.isArray(page.elements) ? page.elements : [],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    debouncedSetQuery(event.target.value);
  };

  return (
    <main className="container mx-auto">
      <div
        className="relative flex h-72 items-center overflow-hidden rounded-2xl bg-cover bg-center md:h-96"
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
        <div className="flex h-full w-full flex-col items-start justify-center bg-gradient-to-r from-black/80 to-black/30 p-5 text-foreground md:p-8">
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">
            {firstPromotionPage.title}
          </h1>
          <p className="mt-4 text-lg">
            {t("tags.offersCount", { count: firstPromotionPage.count })}
          </p>
        </div>
      </div>

      <header className="mt-5 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="inline-flex flex-wrap items-center gap-2">
          <h2 className="text-2xl">{t("tags.results")}</h2>
          <span className="text-sm text-muted-foreground">
            {t("tags.resultsCount", { count: promotionOffers.length })}
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
        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <Input
            type="search"
            placeholder={t("tags.searchPlaceholder")}
            className="w-full cursor-text sm:w-[200px]"
            onChange={handleInputChange}
            value={inputValue}
          />
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue className="text-sm">{sortByDisplay[sortBy]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sortByKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {sortByDisplay[key]}
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
        {promotionOffers.map((game) =>
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
          {t("tags.loadMore")}
        </Button>
      </div>
    </main>
  );
}
