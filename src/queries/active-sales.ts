import { httpClient } from "@/lib/http-client";
import { pickKeyImages, toArray } from "@/lib/offer-projections";
import type { KeyImage, SingleOffer } from "@/types/single-offer";
import { queryOptions } from "@tanstack/react-query";

/**
 * `/active-sales` embeds every offer of every promotion as a full store
 * document. The index only paints three stacked thumbnails per sale, so the
 * query keeps those previews and drops the rest (≈390 KB → ≈18 KB).
 */

const SALE_COVER_IMAGES = ["DieselGameBoxTall", "DieselStoreFrontTall", "OfferImageTall"];
const SALE_PREVIEW_OFFERS = 3;

export type ActiveSaleOfferPreview = {
  id: string;
  title: string;
  keyImages: KeyImage[];
};

export type ActiveSale = {
  id: string;
  name: string;
  active: boolean;
  offers: ActiveSaleOfferPreview[];
};

type RawActiveSale = {
  id: string;
  name?: string | null;
  active?: boolean | null;
  offers?: SingleOffer[] | null;
};

export const activeSalesQueryOptions = () =>
  queryOptions({
    queryKey: ["active-sales"] as const,
    queryFn: async (): Promise<ActiveSale[]> => {
      const sales = await httpClient.v1Get<RawActiveSale[]>("/active-sales");

      return toArray(sales)
        .filter((sale): sale is RawActiveSale => Boolean(sale?.id))
        .map((sale) => ({
          id: sale.id,
          name: sale.name ?? "",
          active: Boolean(sale.active),
          offers: toArray(sale.offers)
            .slice(0, SALE_PREVIEW_OFFERS)
            .map((offer) => ({
              id: offer.id,
              title: offer.title,
              keyImages: pickKeyImages(offer.keyImages, [SALE_COVER_IMAGES]),
            })),
        }));
    },
  });
