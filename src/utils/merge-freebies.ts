import type { GiveawayOffer } from "@/types/giveaways";

interface MergedFreebie extends GiveawayOffer {
  platforms: string[];
  offers: GiveawayOffer[];
}

export function mergeFreebies(data: GiveawayOffer[]): MergedFreebie[] {
  const groupedOffers = new Map<string, GiveawayOffer[]>();
  for (const offer of data) {
    const key = `${offer.namespace}:${offer.title}`;
    if (groupedOffers.has(key)) {
      groupedOffers.get(key)?.push(offer);
    } else {
      groupedOffers.set(key, [offer]);
    }
  }

  const mergedFreebies: MergedFreebie[] = [];
  for (const [, offers] of groupedOffers) {
    const mergedFreebie: MergedFreebie = {
      ...offers[0],
      platforms: offers.flatMap((offer) =>
        offer.items.flatMap((item) => item.releaseInfo.flatMap((info) => info.platform)),
      ),
      offers,
    };
    mergedFreebies.push(mergedFreebie);
  }

  return mergedFreebies;
}
