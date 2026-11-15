import { httpClient } from "@/lib/http-client";
import type { GiveawayOffer } from "@/types/giveaways";
import { queryOptions } from "@tanstack/react-query";

export const mobileFreebiesQuery = queryOptions({
  queryKey: ["mobile-freebies"],
  queryFn: () => httpClient.v1Get<GiveawayOffer[]>("/free-games/mobile"),
});
