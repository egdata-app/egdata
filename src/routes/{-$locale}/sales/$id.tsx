import { checkCountryCode } from "@/lib/check-country";
import i18n from "@/lib/i18n";
import buildImageUrl from "@/lib/build-image-url";
import { getImage } from "@/lib/get-image";
import { httpClient } from "@/lib/http-client";
import { pickKeyImages } from "@/lib/offer-projections";
import type { KeyImage, SingleOffer } from "@/types/single-offer";
import { dehydrate, type DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodSearchValidator } from "@tanstack/router-zod-adapter";
import { SearchContainer } from "@/components/search/SearchContainer";
import { formSchema } from "@/stores/searchStore";
import { useTranslation } from "@/lib/paraglide-react";

type SaleCover = { keyImages: KeyImage[] };
type SalePromotion = { title: string; count: number };

const SALE_COVER_IMAGES = ["OfferImageWide", "DieselGameBoxWide", "DieselStoreFrontWide"];

export const Route = createFileRoute("/{-$locale}/sales/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      cover: SaleCover | null;
      id: string;
      promotion: SalePromotion | null;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SalesPage />
      </HydrationBoundary>
    );
  },

  beforeLoad: async () => {},

  loader: async ({ params, context }) => {
    const { queryClient, country } = context;
    const { id } = params;

    if (!checkCountryCode(country ?? "US")) {
      console.warn(`Invalid country code: ${country}`);
      throw redirect({
        to: "/{-$locale}/sales/$id",
        params: {
          id,
        },
        search: {
          country: "US",
          page: 1,
        },
        code: 302,
      });
    }

    const [coverData, promotionData] = await Promise.allSettled([
      queryClient.fetchQuery({
        queryKey: ["promotion-cover", { id }],
        queryFn: () =>
          httpClient
            .v1Get<SingleOffer>(`/promotions/${id}/cover`)
            .then(
              (offer): SaleCover => ({
                keyImages: pickKeyImages(offer.keyImages, [SALE_COVER_IMAGES, ["featuredMedia"]]),
              }),
            )
            .catch(() => null),
      }),
      queryClient.fetchQuery({
        queryKey: ["promotion-meta", { id, country }],
        queryFn: () =>
          httpClient
            .get<{
              elements: SingleOffer[];
              title: string;
              start: number;
              page: number;
              count: number;
            }>(`/promotions/${id}`, {
              params: {
                country,
                page: 1,
                limit: 1,
              },
            })
            .then(
              (promotion): SalePromotion => ({
                title: promotion.title,
                count: promotion.count,
              }),
            )
            .catch(() => null),
      }),
    ]);

    const cover = coverData.status === "fulfilled" ? coverData.value : null;
    const promotion = promotionData.status === "fulfilled" ? promotionData.value : null;

    return {
      cover,
      id,
      promotion,
      dehydratedState: dehydrate(queryClient),
    };
  },

  validateSearch: zodSearchValidator(formSchema),

  head: (ctx) => {
    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("sales.errors.notFound"),
            description: i18n.t("sales.errors.notFound"),
          },
        ],
      };
    }

    const { promotion } = ctx.loaderData;

    if (!promotion)
      return {
        meta: [
          {
            title: i18n.t("sales.errors.notFound"),
            description: i18n.t("sales.errors.notFound"),
          },
        ],
      };

    return {
      meta: [
        {
          title: i18n.t("sales.meta.title", { title: promotion.title }),
        },
        {
          name: "description",
          content: i18n.t("sales.meta.description", { title: promotion.title }),
        },
        {
          name: "og:title",
          content: i18n.t("sales.meta.title", { title: promotion.title }),
        },
        {
          name: "og:description",
          content: i18n.t("sales.meta.description", { title: promotion.title }),
        },
        {
          property: "twitter:title",
          content: i18n.t("sales.meta.title", { title: promotion.title }),
        },
        {
          property: "twitter:description",
          content: i18n.t("sales.meta.description", { title: promotion.title }),
        },
        {
          name: "og:image",
          content:
            getImage(ctx.loaderData.cover?.keyImages ?? [], [
              "OfferImageWide",
              "DieselGameBoxWide",
              "DieselStoreFrontWide",
            ])?.url ?? "/placeholder.webp",
        },
        {
          name: "og:type",
          content: "website",
        },
        {
          name: "twitter:image",
          content:
            getImage(ctx.loaderData.cover?.keyImages ?? [], [
              "OfferImageWide",
              "DieselGameBoxWide",
              "DieselStoreFrontWide",
            ])?.url ?? "/placeholder.webp",
        },
      ],
    };
  },
});

function SalesPage() {
  const { t } = useTranslation();
  const { cover, id, promotion } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    cover: SaleCover | null;
    id: string;
    promotion: SalePromotion | null;
  };
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  if (!promotion) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div className="rounded-xl bg-card/80 p-6 text-sm text-muted-foreground ring-1 ring-white/10">
          {t("sales.status.loading")}
        </div>
      </main>
    );
  }

  const coverUrl =
    getImage(cover?.keyImages ?? [], [
      "OfferImageWide",
      "featuredMedia",
      "DieselGameBoxWide",
      "DieselStoreFrontWide",
    ])?.url ?? "/placeholder.webp";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6">
      <div className="group relative flex h-72 items-end overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-lg shadow-black/30 md:h-96">
        <img
          src={buildImageUrl(coverUrl, 1280, "high")}
          alt={promotion.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          loading="eager"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 via-45% to-background/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
        <div className="relative z-10 flex w-full flex-col items-start justify-end gap-3 p-6 text-foreground md:p-10">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            {promotion.title}
          </h1>
          <p className="inline-flex items-center rounded-full bg-card/80 px-3.5 py-1 text-sm font-medium text-muted-foreground ring-1 ring-white/10 backdrop-blur-sm tabular-nums">
            {t("sales.labels.offersCount", { count: promotion.count })}
          </p>
        </div>
      </div>

      <section className="border-t border-border/60 pt-8">
        <SearchContainer
          contextId={`promotion-${id}`}
          fixedParams={{
            tags: [id],
          }}
          title={t("sales.headings.offersList", { title: promotion.title })}
          initialSearch={search}
          onSearchChange={(search) => {
            navigate({
              search: {
                ...search,
                tags: search.tags ? search.tags.filter((tag) => tag === id) : undefined,
              },
            });
          }}
        />
      </section>
    </main>
  );
}
