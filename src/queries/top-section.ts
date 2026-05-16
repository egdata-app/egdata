import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

type TopSection = {
  elements: SingleOffer[];
  page: number;
  limit: number;
  total: number;
};

export const getTopSection = async (slug: string) => {
  // API off-by-one: `limit=N` returns N-1 elements, so `limit=1` returns 0.
  return httpClient.get<TopSection>(`/offers/${slug}`, {
    params: {
      limit: 2,
    },
  });
};
