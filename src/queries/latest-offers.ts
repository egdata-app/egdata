import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export const getLatestOffers = (country: string) => {
  return httpClient.get<SingleOffer[]>("/latest-games", {
    params: {
      country,
    },
  });
};
