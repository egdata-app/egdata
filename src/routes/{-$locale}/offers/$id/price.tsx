import { RegionalPricing } from "@/components/app/regional-pricing";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import { offerOnlyQueryOptions, resolveQueryLocale } from "@/queries/offer";
import type { RegionalPrice } from "@/types/regional-pricing";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/offers/$id/price")({
  component: () => {
    const { t } = useTranslation();
    const { id } = Route.useParams();

    return (
      <section id="offer-information" className="h-full w-full">
        <h2 className="text-xl md:text-2xl font-bold mb-4">{t("offerDetail.price.title")}</h2>
        <RegionalPricing id={id} />
      </section>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient, locale, cookies } = context;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);
    const regionalPricingQuery = {
      queryKey: ["regional-pricing", { id }],
      queryFn: () => httpClient.v1Get<RegionalPrice>(`/offers/${id}/regional-price`),
    };

    if (import.meta.env.SSR) {
      const [offer] = await Promise.all([
        queryClient.ensureQueryData(offerQuery).catch(() => null),
        queryClient.prefetchQuery(regionalPricingQuery),
      ]);

      return {
        id,
        offer,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(regionalPricingQuery);

    return {
      id,
      offer: cachedOffer ?? null,
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
      meta: generateOfferMeta(offer, i18n.t("offerDetail.price.title")),
    };
  },
});
