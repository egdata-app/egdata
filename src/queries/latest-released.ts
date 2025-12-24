import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";

export async function getLatestReleased({ country }: { country: string }) {
  return httpClient.get<{
    elements: SingleOffer[];
  }>("/offers/latest-released", {
    params: {
      country,
      limit: 25,
    },
  });
}
