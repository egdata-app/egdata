import { httpClient } from "@/lib/http-client";
import type { Price } from "@/types/price";

interface PriceHistory {
  [key: string]: Price[];
}

export async function fetchOfferPrice({ id }: { id: string }) {
  return httpClient.get<PriceHistory>(`/offers/${id}/price-history`);
}
