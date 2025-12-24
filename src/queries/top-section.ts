import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

type TopSection = {
  elements: SingleOffer[];
  page: number;
  limit: number;
  total: number;
};

export const getTopSection = async (slug: string) => {
  return httpClient.get<TopSection>(`/offers/${slug}`, {
    params: {
      limit: 1,
    },
  });
};
