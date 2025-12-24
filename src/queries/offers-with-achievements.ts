import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import type { AchievementSet } from "./offer-achievements";

type OfferWithAchievements = SingleOffer & {
  achievements: AchievementSet;
};

export const getOffersWithAchievements = async (country: string) => {
  return httpClient.get<OfferWithAchievements[]>("/offers/latest-achievements", {
    params: {
      country,
    },
  });
};
