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
  const data = await httpClient.get<TopSection | null>(`/offers/${slug}`, {
    params: {
      limit: 2,
    },
  });

  return {
    ...data,
    elements: Array.isArray(data?.elements) ? data.elements : [],
    page: data?.page ?? 1,
    limit: data?.limit ?? 2,
    total: data?.total ?? 0,
  };
};
