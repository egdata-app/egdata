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
import buildImageUrl, { buildSrcSet } from "@/lib/build-image-url";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

interface SellerStats {
  offers: number;
  items: number;
  games: number;
  freegames: number;
  seller: {
    _id: string;
    name: string;
    igdb_id?: number;
    logo?: {
      _id: string;
      url: string;
      height: number;
      width: number;
      checksum: string;
      animated: boolean;
      alpha_channel: boolean;
    };
    createdAt?: string;
    updatedAt?: string;
  };
}

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

  headers: () => ({
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  }),

  loader: async ({ context, params }) => {
    const { queryClient, country } = context;
    const { id } = params;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["seller", { id, country }],
        queryFn: async () => getSeller(id, country ?? "US").catch(() => []),
      }),
      queryClient.prefetchQuery({
        queryKey: ["seller:cover", { id, country }],
        queryFn: async () =>
          httpClient
            .get<SingleOffer[]>(`/sellers/${id}/cover`, {
              params: { country },
            })
            .catch(() => []),
      }),
      queryClient.prefetchQuery({
        queryKey: ["seller:stats", { id }],
        queryFn: async () => httpClient.get<SellerStats>(`/sellers/${id}/stats`).catch(() => null),
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
            title: i18n.t("sellers.meta.notFoundTitle"),
            description: i18n.t("sellers.meta.notFoundDescription"),
          },
        ],
      };
    }

    const seller = getFetchedQuery<SingleOffer[]>(queryClient, loaderData?.dehydratedState, [
      "seller",
      { id: params.id, country: loaderData.country },
    ]);

    const stats = getFetchedQuery<SellerStats | null>(queryClient, loaderData?.dehydratedState, [
      "seller:stats",
      { id: params.id },
    ]);

    const sellerName = seller?.[0]?.seller?.name ?? stats?.seller.name;

    if (!sellerName)
      return {
        meta: [
          {
            title: i18n.t("sellers.meta.notFoundTitle"),
            description: i18n.t("sellers.meta.notFoundDescription"),
          },
        ],
      };

    return {
      meta: [
        {
          title: i18n.t("sellers.meta.title", { name: sellerName }),
        },
      ],
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    country: string;
  };
  const { country } = useCountry();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const [sellerData, coverData, statsData] = useQueries({
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
      {
        queryKey: ["seller:stats", { id }],
        queryFn: () => httpClient.get<SellerStats>(`/sellers/${id}/stats`),
      },
    ],
  });

  const { data, isLoading } = sellerData;
  const { data: cover } = coverData;
  const { data: stats } = statsData;

  if (isLoading || !data) {
    return <SellerPageSkeleton />;
  }

  const sellerName = data[0]?.seller?.name ?? stats?.seller.name;

  if (!sellerName) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center">
        <h1 className="text-4xl font-display font-bold">{t("sellers.notFound")}</h1>
      </div>
    );
  }

  const featuredCover = cover?.[0] ?? data[0];
  const bannerImage = featuredCover
    ? getImage(featuredCover.keyImages, [
        "DieselGameBoxWide",
        "DieselStoreFrontWide",
        "OfferImageWide",
      ])?.url
    : null;

  const logoUrl = stats?.seller?.logo?.url
    ? stats.seller.logo.url.startsWith("//")
      ? `https:${stats.seller.logo.url}`
      : stats.seller.logo.url
    : null;

  const statsItems = [
    stats ? { label: t("sellers.stats.offers"), value: stats.offers } : null,
    stats ? { label: t("sellers.stats.games"), value: stats.games } : null,
    stats ? { label: t("sellers.stats.items"), value: stats.items } : null,
    stats && stats.freegames > 0
      ? { label: t("sellers.stats.freeGames"), value: stats.freegames }
      : null,
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div className="min-h-[85vh]">
      {/* Cinematic Banner */}
      <section className="relative w-full h-[42vh] max-h-[440px] min-h-[280px] overflow-hidden rounded-lg">
        {bannerImage ? (
          <img
            src={buildImageUrl(bannerImage, 1280, "high")}
            srcSet={buildSrcSet(bannerImage, 1280)}
            sizes="100vw"
            alt={featuredCover?.title ?? t("sellers.bannerAlt", { name: sellerName })}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-card" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, hsl(240 11% 7%) 0%, hsl(240 11% 7% / 0.6) 40%, hsl(240 11% 7% / 0.35) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <div className="flex items-end gap-4">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={t("sellers.logoAlt", { name: sellerName })}
                className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-contain bg-background/60 backdrop-blur-sm p-2 border border-border/40 shrink-0"
                loading="eager"
              />
            )}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-foreground drop-shadow-lg">
                {sellerName}
              </h1>
              {statsItems.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {statsItems.map((s) => (
                    <span
                      key={s.label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-background/60 backdrop-blur-sm border border-border/40 px-3 py-1 text-xs"
                    >
                      <span className="font-semibold tabular-nums text-foreground">
                        {s.value.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">{s.label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Offers */}
      <section className="mt-10">
        <SearchContainer
          contextId={`seller-${id}`}
          fixedParams={{ seller: id }}
          controls={{ showSeller: false }}
          title={t("sellers.offersTitle", { name: sellerName })}
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
      <Skeleton className="w-full h-[440px] rounded-lg" />
      <section className="mt-10">
        <Skeleton className="w-48 h-7 mb-4" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-md" />
          ))}
        </div>
      </section>
    </div>
  );
}
