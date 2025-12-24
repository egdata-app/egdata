import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export const getSeller = async (id: string, country: string, limit?: number) => {
  const response = await httpClient.get<SingleOffer[]>(`/sellers/${id}`, {
    params: {
      country,
      limit: limit || undefined,
    },
  });

  return response;
};
