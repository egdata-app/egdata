import { RegionalPricing } from "@/components/app/regional-pricing";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/offers/$id/price")({
  component: () => {
    const { id } = Route.useParams();

    return (
      <section id="offer-information" className="w-full h-full mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Price</h2>
        <RegionalPricing id={id} />
      </section>
    );
  },

  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient } = context;

    const offer = await queryClient.ensureQueryData({
      queryKey: ["offer", { id }],
      queryFn: () => httpClient.get<SingleOffer>(`/offers/${id}`),
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
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    const { offer } = ctx.loaderData;

    if (!offer) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, "Price"),
    };
  },
});
