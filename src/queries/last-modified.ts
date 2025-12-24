import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export const getLastModified = async (country: string) => {
  return httpClient
    .get<{ elements: SingleOffer[] }>("/offers?limit=25", {
      params: {
        country,
      },
    })
    .then((res) => res.elements);
};
