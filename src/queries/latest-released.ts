import { httpClient } from "@/lib/http-client";
import { normalizeV1OfferElements } from "@/lib/v1-adapters";
import type { SingleOffer } from "@/types/single-offer";

export async function getLatestReleased({ country }: { country: string }) {
  const data = await httpClient.v1Get<SingleOffer[] | null>("/offers/latest-released", {
    params: {
      country,
      limit: 25,
    },
  });

  return normalizeV1OfferElements(data);
}
