import type { SingleOffer } from "@/types/single-offer";

export function getBuyLink({ offers }: { offers: SingleOffer[] }): string {
  const offerList: {
    offerId: string;
    namespace: string;
    quantity: number;
  }[] = offers.map((offer) => ({
    offerId: offer.id,
    namespace: offer.namespace,
    quantity: 1,
  }));

  const url = new URL("https://store.epicgames.com/purchase");
  url.searchParams.set("showNavigation", "false");
  url.searchParams.set("highlightColor", "4ade80");

  for (const offer of offerList) {
    url.searchParams.append("offers", `${offer.quantity}-${offer.namespace}-${offer.offerId}-`);
  }

  return url.toString();
}
