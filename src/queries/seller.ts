import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export const getSeller = async (id: string, country: string, limit?: number) => {
  const response = await httpClient.v1Get<SingleOffer[]>(`/sellers/${id}`, {
    params: {
      country,
      limit: limit || undefined,
    },
  });

  return response;
};
