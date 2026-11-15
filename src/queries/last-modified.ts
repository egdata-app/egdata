import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export const getLastModified = async (country: string) => {
  return httpClient
    .v1Get<SingleOffer[]>("/offers?limit=25", {
      params: {
        country,
      },
    })
    .then((res) => (Array.isArray(res) ? res : []));
};
