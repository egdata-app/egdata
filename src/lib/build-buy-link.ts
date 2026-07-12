import type { GiveawayOffer } from "@/types/giveaways";
import type { SingleOffer } from "@/types/single-offer";

type PurchaseOffer = Pick<SingleOffer, "id" | "namespace">;

type GiveawayGroup = GiveawayOffer & {
  offers?: GiveawayOffer[];
};

const getOfferKey = (offer: PurchaseOffer) => `${offer.namespace}:${offer.id}`;

export function getBuyLink({
  offers,
  locale,
}: {
  offers: PurchaseOffer[];
  locale: string;
}): string {
  const url = new URL("https://store.epicgames.com/purchase");
  url.searchParams.set("highlightColor", "0078f2");
  url.searchParams.set("lang", locale);

  for (const offer of offers) {
    url.searchParams.append("offers", `1-${offer.namespace}-${offer.id}--`);
  }

  url.searchParams.set("showNavigation", "true");

  return url.toString();
}

export function getRedeemableOffers({
  giveaways,
  mobileOffers,
  now = new Date(),
}: {
  giveaways: GiveawayGroup[];
  mobileOffers: GiveawayOffer[];
  now?: Date;
}): GiveawayOffer[] {
  const mobileOfferKeys = new Set(mobileOffers.map(getOfferKey));
  const nowTime = now.getTime();

  return giveaways
    .flatMap((giveaway) => giveaway.offers ?? [giveaway])
    .filter((offer) => {
      const startTime = new Date(offer.giveaway.startDate).getTime();
      const endTime = new Date(offer.giveaway.endDate).getTime();

      return (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        startTime <= nowTime &&
        nowTime < endTime &&
        !mobileOfferKeys.has(getOfferKey(offer))
      );
    });
}
