import { httpClient } from "@/lib/http-client";
import type { RegionalPricingScore } from "@/types/regional-pricing-score";

export function getOfferPriceFairness(id: string, country: string) {
  return {
    queryKey: ["offer", "price-fairness", { id, country }],
    queryFn: () =>
      httpClient
        .get<RegionalPricingScore>(`/offers/${id}/price/fairness`, {
          params: { country },
        })
        .catch(() => null),
  };
}
