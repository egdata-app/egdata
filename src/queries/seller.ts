import { httpClient } from "@/lib/http-client";
import { pickKeyImages, toArray } from "@/lib/offer-projections";
import type { KeyImage, Seller, SingleOffer } from "@/types/single-offer";
import { queryOptions } from "@tanstack/react-query";

/**
 * Seller landing queries return slim projections.
 *
 * `/sellers/:id` and `/sellers/:id/cover` respond with full store documents,
 * but the landing page only paints a banner and the seller name. Keeping the
 * first offer's banner fields turns ~150 KB of cached offers into a few
 * hundred bytes; the seller's offer grid is loaded by its own search query.
 */

const BANNER_IMAGES = ["DieselGameBoxWide", "DieselStoreFrontWide", "OfferImageWide"];

export type SellerBannerOffer = {
  id: string;
  title: string;
  keyImages: KeyImage[];
  seller: Seller | null;
};

type RawSellerOffer = Pick<SingleOffer, "id" | "title" | "keyImages" | "seller">;

function projectBannerOffer(offer: RawSellerOffer): SellerBannerOffer {
  return {
    id: offer.id,
    title: offer.title,
    keyImages: pickKeyImages(offer.keyImages, [BANNER_IMAGES]),
    seller: offer.seller ? { id: offer.seller.id, name: offer.seller.name } : null,
  };
}

export const sellerLandingQueryOptions = (id: string, country?: string | null) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["seller", { id, country: resolvedCountry }] as const,
    queryFn: async (): Promise<SellerBannerOffer[]> => {
      const offers = await httpClient.v1Get<RawSellerOffer[]>(`/sellers/${id}`, {
        params: { country: resolvedCountry },
      });

      return toArray(offers).slice(0, 1).map(projectBannerOffer);
    },
  });
};

export const sellerCoverQueryOptions = (id: string, country?: string | null) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["seller:cover", { id, country: resolvedCountry }] as const,
    queryFn: async (): Promise<SellerBannerOffer[]> => {
      const offers = await httpClient.v1Get<RawSellerOffer[]>(`/sellers/${id}/cover`, {
        params: { country: resolvedCountry },
      });

      return toArray(offers).slice(0, 1).map(projectBannerOffer);
    },
  });
};
