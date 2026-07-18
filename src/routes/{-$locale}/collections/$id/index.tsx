import { Image } from "@/components/app/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { calculatePrice } from "@/lib/calculate-price";
import { getEffectivePrice } from "@/lib/effective-price";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getImage } from "@/lib/get-image";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { type Collections, getCollection, type OfferWithTops } from "@/queries/collection";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/collections/$id/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      country: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <CollectionPage />
      </HydrationBoundary>
    );
  },

  headers: () => ({
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  }),

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient, country } = context;

    await queryClient.prefetchInfiniteQuery({
      queryKey: [
        "collection",
        {
          id,
          country,
          limit: 20,
        },
      ],
      queryFn: ({ pageParam }) =>
        getCollection({
          slug: id,
          limit: 20,
          page: pageParam as number,
          country: country ?? "US",
        }).catch(() => null),
      initialPageParam: 1,
      getNextPageParam: (lastPage: Collections | null, allPages: (Collections | null)[]) => {
        if (!lastPage) return undefined;
        if (lastPage.page * lastPage.limit + 20 > lastPage.total) {
          return undefined;
        }

        return allPages?.length + 1;
      },
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      country,
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("collections.errors.notFound"),
            description: i18n.t("collections.errors.notFound"),
          },
        ],
      };
    }

    const collectionPages = getFetchedQuery<{
      pages: Collections[];
    }>(queryClient, ctx.loaderData.dehydratedState, [
      "collection",
      { id: params.id, country: ctx.loaderData.country, limit: 20 },
    ]);

    const collection = collectionPages?.pages[0];

    if (!collection) {
      return {
        meta: [
          {
            title: i18n.t("collections.errors.notFound"),
            description: i18n.t("collections.errors.notFound"),
          },
        ],
      };
    }

    return {
      meta: [
        {
          title: i18n.t("collections.meta.title", { title: collection.title }),
        },
        {
          name: "description",
          content: i18n.t("collections.meta.description", { title: collection.title }),
        },
        {
          name: "og:title",
          content: i18n.t("collections.meta.title", { title: collection.title }),
        },
        {
          name: "og:description",
          content: i18n.t("collections.meta.description", { title: collection.title }),
        },
        {
          property: "twitter:title",
          content: i18n.t("collections.meta.title", { title: collection.title }),
        },
        {
          property: "twitter:description",
          content: i18n.t("collections.meta.description", { title: collection.title }),
        },
      ],
    };
  },
});

function CollectionPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const { country } = useCountry();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["collection", { id, country, limit: 20 }],
    queryFn: ({ pageParam }) =>
      getCollection({
        slug: id,
        limit: 20,
        page: pageParam as number,
        country,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Collections, allPages: Collections[]) => {
      if (lastPage.page * lastPage.limit + 20 > lastPage.total) {
        return undefined;
      }

      return allPages?.length + 1;
    },
  });

  if (isLoading) {
    return (
      <main className="container mx-auto flex flex-col items-center justify-center gap-4 min-h-screen">
        <div className="relative h-96 overflow-hidden rounded-2xl flex items-center bg-cover bg-center w-full">
          <div className="h-full w-full flex flex-col justify-center items-start text-foreground p-8 bg-gradient-to-r from-black/80 to-black/30">
            <span className="text-5xl font-bold">{t("collections.status.loading")}</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <main className="flex flex-col items-start justify-start h-full gap-1 px-4 w-full">
        <h1 className="text-3xl font-semibold md:text-4xl">{data?.pages[0]?.title}</h1>

        <div className="hidden h-12 w-full flex-row items-center px-5 font-thin text-muted-foreground md:flex">
          <span className="w-10">{t("collections.table.position")}</span>
          <span className="w-24" />
          <span className="flex-grow pl-4" />
          <span className="w-32 text-right" />
          <span className="w-16 text-center">
            <Tooltip>
              <TooltipTrigger className="underline decoration-dotted decoration-border/60 underline-offset-4 cursor-help">
                {t("collections.table.variance")}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{t("collections.tooltips.variance")}</p>
              </TooltipContent>
            </Tooltip>
          </span>
          <span className="w-16 text-center">
            <Tooltip>
              <TooltipTrigger className="underline decoration-dotted decoration-border/60 underline-offset-4 cursor-help">
                {t("collections.table.weeks")}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  {t("collections.tooltips.weeks", {
                    title: data?.pages[0]?.title?.toLowerCase(),
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </span>
        </div>

        {/* Offers List */}
        <div className="flex flex-col gap-2 w-full">
          {data?.pages
            .flatMap((page) => (Array.isArray(page?.elements) ? page.elements : []))
            .map((offer) => (
              <OfferInTop key={offer.id} offer={offer} />
            ))}
        </div>

        {hasNextPage && (
          <div className="flex justify-center items-center mt-4 w-full">
            <Button
              onClick={() => fetchNextPage()}
              variant="outline"
              disabled={isFetchingNextPage || isLoading}
            >
              {isFetchingNextPage ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground"
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
                  {t("collections.status.loading")}
                </>
              ) : (
                t("collections.buttons.loadMore")
              )}
            </Button>
          </div>
        )}
      </main>
    </TooltipProvider>
  );
}

function OfferInTop({ offer }: { offer: OfferWithTops }) {
  const { locale } = useLocale();
  const price = getEffectivePrice(offer.price);
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: price?.price.currencyCode || "USD",
  });

  const weeksInTop100 = Math.floor(offer.metadata.timesInTop100 / 7);

  return (
    <Link to="/{-$locale}/offers/$id" params={{ id: offer.id }} preload="viewport">
      <Card className="flex h-auto min-h-20 w-full flex-wrap items-center gap-3 overflow-hidden rounded-xl px-4 py-3 md:h-16 md:min-h-0 md:flex-nowrap md:gap-0 md:px-5 md:py-0">
        <span className="text-xl font-bold w-10 flex-shrink-0">{offer.position}</span>

        <div className="flex h-14 w-24 flex-shrink-0 flex-col items-center justify-center md:h-full">
          <Image
            src={
              getImage(offer.keyImages, [
                "DieselGameBoxWide",
                "DieselStoreFrontWide",
                "Featured",
                "OfferImageWide",
              ])?.url ?? "/placeholder.webp"
            }
            alt={offer.title}
            className="w-full h-full object-cover rounded-md"
            width={200}
            height={100}
            quality="low"
          />
        </div>

        <div className="min-w-0 flex flex-1 flex-col justify-center md:px-4">
          <h3 className="truncate text-lg font-light md:text-xl">{offer.title}</h3>
        </div>

        <div className="inline-flex w-full shrink-0 items-center justify-start gap-2 text-left md:w-40 md:justify-end md:pr-5 md:text-right">
          <span
            className={cn(
              "text-lg font-semibold",
              price?.price.discountPrice !== price?.price.originalPrice && "text-badge",
            )}
          >
            {fmt.format(calculatePrice(price?.price.discountPrice ?? 0, price?.price.currencyCode))}
          </span>
          {price?.price.discountPrice !== price?.price.originalPrice && (
            <span className="text-lg font-medium text-muted-foreground line-through">
              {fmt.format(
                calculatePrice(price?.price.originalPrice ?? 0, price?.price.currencyCode),
              )}
            </span>
          )}
        </div>

        <div
          className={cn(
            "flex flex-row gap-1 items-center text-badge w-16 justify-center",
            offer.previousPosition && offer.position > offer.previousPosition ? "text-red-500" : "",
          )}
        >
          {offer.previousPosition && offer.position !== offer.previousPosition ? (
            <>
              <ChevronDown
                className={cn(
                  "h-4 w-4",
                  offer.position < offer.previousPosition ? "rotate-180" : "",
                )}
              />
              <span className="text-md">{Math.abs(offer.position - offer.previousPosition)}</span>
            </>
          ) : (
            <span className="text-md">-</span>
          )}
        </div>

        <div className="w-16 text-center">
          <Tooltip>
            <TooltipTrigger className="text-md">{weeksInTop100}</TooltipTrigger>
            <TooltipContent className="max-w-xs bg-transparent" side="right">
              <div className="flex flex-col gap-1 p-3 bg-muted/50 rounded-md shadow-md w-36">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Top 1:</span>
                  <span className="text-foreground font-semibold">
                    {offer.metadata.timesInTop1} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Top 5:</span>
                  <span className="text-foreground font-semibold">
                    {offer.metadata.timesInTop5} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Top 10:</span>
                  <span className="text-foreground font-semibold">
                    {offer.metadata.timesInTop10} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Top 50:</span>
                  <span className="text-foreground font-semibold">
                    {offer.metadata.timesInTop50} days
                  </span>
                </div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Top 100:</span>
                  <span className="text-foreground font-semibold">
                    {offer.metadata.timesInTop100} days
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </Card>
    </Link>
  );
}
