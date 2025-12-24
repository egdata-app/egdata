import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export const getFeaturedDiscounts = async ({
  country,
  limit = 25,
}: {
  country: string;
  limit?: number;
}) => {
  return httpClient
    .get<SingleOffer[]>("/offers/featured-discounts", {
      params: { country, limit },
    })
    .then((res) => {
      return res.sort((a, b) => {
        if (a.seller.id === "o-a35dvzm78dwpda2nm962epmnrnll3e") {
          return 1;
        }
        if (b.seller.id === "o-a35dvzm78dwpda2nm962epmnrnll3e") {
          return -1;
        }
        return 0;
      });
    });
};
