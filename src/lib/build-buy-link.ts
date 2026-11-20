import type { SingleOffer } from "@/types/single-offer";

type PurchaseOffer = Pick<SingleOffer, "id" | "namespace">;

type GiveawayWindow = {
  giveaway: {
    startDate: string | null;
    endDate: string | null;
  };
};

type GiveawayGroup<T extends PurchaseOffer & GiveawayWindow> = T & {
  offers?: T[];
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

/**
 * Returns the offers that are currently claimable and not already covered by
 * the mobile freebies list.
 *
 * Structural typing keeps this working with projected giveaway rows: only the
 * purchase identity (`id`/`namespace`) and the claim window are read.
 */
export function getRedeemableOffers<T extends PurchaseOffer & GiveawayWindow>({
  giveaways,
  mobileOffers,
  now = new Date(),
}: {
  giveaways: Array<GiveawayGroup<T>>;
  mobileOffers: PurchaseOffer[];
  now?: Date;
}): T[] {
  const mobileOfferKeys = new Set(mobileOffers.map(getOfferKey));
  const nowTime = now.getTime();

  return giveaways
    .flatMap((giveaway) => giveaway.offers ?? [giveaway])
    .filter((offer) => {
      if (!offer.giveaway.startDate || !offer.giveaway.endDate) {
        return false;
      }

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
