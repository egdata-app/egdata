import { OfferCard } from "@/components/app/offer-card";
import { useCountry } from "@/hooks/use-country";
import { getQueryClient } from "@/lib/client";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import { offersDictionary } from "@/lib/offers-dictionary";
import { offerOnlyQueryOptions } from "@/queries/offer-gql";
import type { SingleOffer } from "@/types/single-offer";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer | null;
  country: string;
  locale: string | undefined;
};

export const Route = createFileRoute("/{-$locale}/offers/$id/related")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;
    return (
      <HydrationBoundary state={dehydratedState}>
        <RelatedOffersPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { queryClient, country, locale } = context;
    const { id } = params;

    const offer = await queryClient.ensureQueryData(offerOnlyQueryOptions(id, locale));

    await queryClient.prefetchQuery({
      queryKey: ["related-offers", { id, country }],
      queryFn: () =>
        httpClient
          .get<SingleOffer[]>(`/offers/${id}/related`, {
            params: {
              country,
            },
          })
          .catch(() => []),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      offer,
      country,
      locale,
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      ...offerOnlyQueryOptions(params.id, ctx.loaderData?.locale).queryKey,
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, i18n.t("offerDetail.related.title")),
    };
  },
});

function RelatedOffersPage() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as LoaderData;
  const { country } = useCountry();
  const {
    data: offers,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["related-offers", { id, country }],
    queryFn: () =>
      httpClient.get<SingleOffer[]>(`/offers/${id}/related`, {
        params: {
          country,
        },
      }),
  });

  if (isLoading) {
    return <div>{t("offerDetail.common.loading")}</div>;
  }

  if (isError) {
    return (
      <section id="offer-related-offers" className="w-full h-full">
        <h2 className="text-2xl font-bold">{t("offerDetail.related.title")}</h2>
        <div>{t("offerDetail.common.somethingWentWrong")}</div>
      </section>
    );
  }

  const offersGroupedByOfferType = offers?.reduce<Record<string, SingleOffer[]>>((acc, offer) => {
    if (!acc[offer.offerType]) {
      acc[offer.offerType] = [];
    }
    acc[offer.offerType].push(offer);
    return acc;
  }, {});

  if (!offersGroupedByOfferType) {
    return null;
  }

  const offerTypeOrder = ["BASE_GAME", "DLC", "EDITION", "ADD_ON", "OTHERS"];

  return (
    <section
      id="offer-related-offers"
      className="w-full h-full flex flex-col gap-4 max-w-7xl mx-auto px-4"
    >
      <h2 className="text-xl md:text-2xl font-bold">{t("offerDetail.related.title")}</h2>
      <div className="flex flex-col gap-4">
        {Object.entries(offersGroupedByOfferType)
          .sort(([aType], [bType]) => {
            const aIndex = offerTypeOrder.indexOf(aType);
            const bIndex = offerTypeOrder.indexOf(bType);

            return (
              (aIndex === -1 ? Number.POSITIVE_INFINITY : aIndex) -
              (bIndex === -1 ? Number.POSITIVE_INFINITY : bIndex)
            );
          })
          .map(([offerType, offers]) => (
            <div key={offerType} className="flex flex-col gap-4">
              <h3 className="text-lg md:text-xl font-semibold inline-flex items-center gap-2">
                {offersDictionary[offerType as keyof typeof offersDictionary] ?? offerType}{" "}
                <span className="text-xs text-muted-foreground">({offers.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {offers?.map((offer) => (
                  <div key={offer.id} className="w-full">
                    <OfferCard offer={offer} size="md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
