import { httpClient } from "@/lib/http-client";

export const getStats = async ({ country }: { country: string }) => {
  return httpClient.v1Get<{
    offers: number;
    trackedPriceChanges: number;
    activeDiscounts: number;
    giveaways: number;
  }>("/stats/homepage", {
    params: {
      country,
    },
  });
};
