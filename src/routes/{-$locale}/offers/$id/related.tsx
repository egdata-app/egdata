import { OfferCard } from "@/components/app/offer-card";
import { useCountry } from "@/hooks/use-country";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import { offersDictionary } from "@/lib/offers-dictionary";
import { offerOnlyQueryOptions, resolveQueryLocale } from "@/queries/offer";
import type { SingleOffer } from "@/types/single-offer";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/offers/$id/related")({
  component: RelatedOffersPage,

  loader: async ({ params, context }) => {
    const { queryClient, country, locale, cookies } = context;
    const { id } = params;
    const resolvedCountry = country || "US";
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);
    const relatedQuery = {
      queryKey: ["related-offers", { id, country: resolvedCountry }],
      queryFn: () =>
        httpClient
          .v1Get<SingleOffer[]>(`/offers/${id}/related`, {
            params: {
              country: resolvedCountry,
            },
          })
          .catch(() => []),
    };

    if (import.meta.env.SSR) {
      const [offer] = await Promise.all([
        queryClient.ensureQueryData(offerQuery).catch(() => null),
        queryClient.prefetchQuery(relatedQuery),
      ]);

      return {
        id,
        offer,
        country: resolvedCountry,
        locale: resolvedLocale,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(relatedQuery);

    return {
      id,
      offer: cachedOffer ?? null,
      country: resolvedCountry,
      locale: resolvedLocale,
      isOfferLoaded: cachedOffer !== undefined,
    };
  },

  head: (ctx) => {
    if (!ctx.loaderData) {
      return {
        meta: [],
      };
    }

    const { offer, isOfferLoaded } = ctx.loaderData;

    if (!offer) {
      if (!isOfferLoaded) {
        return {
          meta: [],
        };
      }

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
  const { id } = Route.useParams();
  const { country } = useCountry();
  const resolvedCountry = country || "US";
  const {
    data: offers,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["related-offers", { id, country: resolvedCountry }],
    queryFn: () =>
      httpClient.v1Get<SingleOffer[]>(`/offers/${id}/related`, {
        params: {
          country: resolvedCountry,
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
    <section id="offer-related-offers" className="flex h-full w-full flex-col gap-4">
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
