import { RegionalPricing } from "@/components/app/regional-pricing";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/offers/$id/price")({
  component: () => {
    const { t } = useTranslation();
    const { id } = Route.useParams();

    return (
      <section id="offer-information" className="w-full h-full mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4">{t("offerDetail.price.title")}</h2>
        <RegionalPricing id={id} />
      </section>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient, locale } = context;

    const offer = await queryClient.ensureQueryData({
      queryKey: ["offer", { id, locale }],
      queryFn: () =>
        httpClient.get<SingleOffer>(`/offers/${id}`, { params: { locale } }).catch(() => null),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      offer,
    };
  },

  head: (ctx) => {
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

    const { offer } = ctx.loaderData;

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
      meta: generateOfferMeta(offer, i18n.t("offerDetail.price.title")),
    };
  },
});
