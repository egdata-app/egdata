import { Image } from "@/components/app/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { calculatePrice } from "@/lib/calculate-price";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getImage } from "@/lib/get-image";
import { cn } from "@/lib/utils";
import { type FranchiseResponse, getFranchise } from "@/queries/franchise";
import type { SingleOffer } from "@/types/single-offer";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { Clock, Trophy } from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/franchises/$id/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      country: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <FranchisePage />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient, country } = context;

    await queryClient.prefetchInfiniteQuery({
      queryKey: ["franchise", { id, country, limit: 20 }],
      queryFn: ({ pageParam }) =>
        getFranchise({
          slug: id,
          limit: 20,
          page: pageParam as number,
          country: country ?? "US",
        }).catch(() => null),
      initialPageParam: 1,
      getNextPageParam: (
        lastPage: FranchiseResponse | null,
        allPages: (FranchiseResponse | null)[],
      ) => {
        if (!lastPage) return undefined;
        if (lastPage.page * lastPage.limit >= lastPage.total) {
          return undefined;
        }
        return allPages.length + 1;
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
            title: i18n.t("franchises.meta.notFoundTitle"),
            description: i18n.t("franchises.meta.notFoundDescription"),
          },
        ],
      };
    }

    const franchisePages = getFetchedQuery<{
      pages: FranchiseResponse[];
    }>(queryClient, ctx.loaderData.dehydratedState, [
      "franchise",
      { id: params.id, country: ctx.loaderData.country, limit: 20 },
    ]);

    const franchise = franchisePages?.pages[0];

    if (!franchise) {
      return {
        meta: [
          {
            title: i18n.t("franchises.meta.notFoundTitle"),
            description: i18n.t("franchises.meta.notFoundDescription"),
          },
        ],
      };
    }

    return {
      meta: [
        {
          title: i18n.t("franchises.meta.title", { name: franchise.name }),
        },
        {
          name: "description",
          content: i18n.t("franchises.meta.description", { name: franchise.name }),
        },
        {
          name: "og:title",
          content: i18n.t("franchises.meta.title", { name: franchise.name }),
        },
        {
          name: "og:description",
          content: i18n.t("franchises.meta.description", { name: franchise.name }),
        },
        {
          property: "twitter:title",
          content: i18n.t("franchises.meta.title", { name: franchise.name }),
        },
        {
          property: "twitter:description",
          content: i18n.t("franchises.meta.description", { name: franchise.name }),
        },
      ],
    };
  },
});

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  if (hours < 1) return "< 1h";
  return `${hours}h`;
}

function FranchisePage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const { country } = useCountry();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["franchise", { id, country, limit: 20 }],
    queryFn: ({ pageParam }) =>
      getFranchise({
        slug: id,
        limit: 20,
        page: pageParam as number,
        country,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: FranchiseResponse, allPages: FranchiseResponse[]) => {
      if (lastPage.page * lastPage.limit >= lastPage.total) {
        return undefined;
      }
      return allPages.length + 1;
    },
  });

  if (isLoading) {
    return (
      <main className="container mx-auto flex flex-col items-center justify-center gap-4 min-h-screen">
        <div className="relative h-96 overflow-hidden rounded-2xl flex items-center bg-cover bg-center w-full">
          <div className="h-full w-full flex flex-col justify-center items-start text-foreground p-8 bg-gradient-to-r from-black/80 to-black/30">
            <span className="text-5xl font-bold">{t("franchises.loading")}</span>
          </div>
        </div>
      </main>
    );
  }

  const pages = data?.pages?.filter(Boolean) ?? [];
  const franchise = pages[0];
  const stats = franchise?.stats;
  const allOffers = pages.flatMap((page) => (Array.isArray(page.elements) ? page.elements : []));

  return (
    <main className="flex flex-col items-start justify-start h-full gap-6 px-4 w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">{franchise?.name}</h1>
        <span className="text-muted-foreground">
          {t("franchises.gamesCount", { count: franchise?.total ?? 0 })}
        </span>
      </div>

      {stats && (stats.totalAchievements > 0 || stats.totalTimeNormally > 0) && (
        <div className="flex flex-wrap gap-4">
          {stats.totalTimeNormally > 0 && (
            <div className="flex items-center gap-2 bg-card rounded-lg px-4 py-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t("franchises.timeToBeat")}</span>
                <span className="text-sm font-medium">
                  {formatTime(stats.totalTimeHastily)} - {formatTime(stats.totalTimeCompletely)}
                </span>
              </div>
            </div>
          )}
          {stats.totalAchievements > 0 && (
            <div className="flex items-center gap-2 bg-card rounded-lg px-4 py-3">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {t("franchises.achievements")}
                </span>
                <span className="text-sm font-medium">
                  {stats.totalAchievements} ({stats.totalXp} XP)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {allOffers.map((offer) => (
          <FranchiseOfferCard key={offer.id} offer={offer} />
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
                {t("franchises.loading")}
              </>
            ) : (
              t("franchises.loadMore")
            )}
          </Button>
        </div>
      )}
    </main>
  );
}

function FranchiseOfferCard({ offer }: { offer: SingleOffer }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: offer.price?.price.currencyCode || "USD",
  });

  const imageUrl =
    getImage(offer.keyImages, [
      "DieselGameBoxWide",
      "DieselStoreFrontWide",
      "Featured",
      "OfferImageWide",
    ])?.url ?? "/placeholder.webp";

  const isFree = offer.price?.price.discountPrice === 0;
  const hasDiscount =
    offer.price && offer.price.price.discountPrice !== offer.price.price.originalPrice;

  return (
    <Link to="/{-$locale}/offers/$id" params={{ id: offer.id }} preload="viewport">
      <Card className="w-full rounded-xl overflow-hidden hover:ring-1 hover:ring-primary/50 transition-all">
        <div className="relative aspect-video">
          <Image
            src={imageUrl}
            alt={offer.title}
            className="w-full h-full object-cover"
            width={400}
            height={225}
            quality="medium"
            loading="lazy"
          />
        </div>
        <div className="p-4 flex flex-col gap-2">
          <h3 className="text-lg font-semibold truncate">{offer.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground truncate">{offer.seller?.name}</span>
            {offer.price && (
              <div className="flex items-center gap-2">
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">
                    {fmt.format(
                      calculatePrice(
                        offer.price.price.originalPrice,
                        offer.price.price.currencyCode,
                      ),
                    )}
                  </span>
                )}
                <span className={cn("text-sm font-semibold", hasDiscount && "text-badge")}>
                  {isFree
                    ? t("franchises.free")
                    : fmt.format(
                        calculatePrice(
                          offer.price.price.discountPrice,
                          offer.price.price.currencyCode,
                        ),
                      )}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
