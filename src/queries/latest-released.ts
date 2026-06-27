import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export async function getLatestReleased({ country }: { country: string }) {
  const data = await httpClient.get<{
    elements: SingleOffer[];
  } | null>("/offers/latest-released", {
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
