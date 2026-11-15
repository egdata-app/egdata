import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export const getLatestOffers = (country: string) => {
  return httpClient.v1Get<SingleOffer[]>("/latest-games", {
    params: {
      country,
    },
  });
};
