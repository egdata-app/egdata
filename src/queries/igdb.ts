import { httpClient } from "@/lib/http-client";
import type { IgdbOffer } from "@/types/igdb";
import { queryOptions } from "@tanstack/react-query";

export const getOfferIgdb = (offerId: string) => {
  return queryOptions({
    queryKey: ["igdb", "offer", offerId],
    queryFn: () => httpClient.get<IgdbOffer>(`/offers/${offerId}/igdb`),
  });
};
