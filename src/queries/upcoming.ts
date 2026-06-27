import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export async function getUpcoming({ country }: { country: string }) {
  const data = await httpClient.get<{
    elements: SingleOffer[];
  } | null>("/offers/upcoming", {
    params: {
      country,
      limit: 25,
    },
  });

  return {
    ...data,
    elements: Array.isArray(data?.elements) ? data.elements : [],
  };
}
