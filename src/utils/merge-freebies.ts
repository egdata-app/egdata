import type { GiveawayOffer } from "@/types/giveaways";

interface MergedFreebie extends GiveawayOffer {
  platforms: string[];
  offers: GiveawayOffer[];
}

export function mergeFreebies(data: GiveawayOffer[]): MergedFreebie[] {
  const namespacesMap = new Map<string, GiveawayOffer[]>();
  for (const offer of data) {
    if (namespacesMap.has(offer.namespace)) {
      namespacesMap.get(offer.namespace)?.push(offer);
    } else {
      namespacesMap.set(offer.namespace, [offer]);
    }
  }

  const mergedFreebies: MergedFreebie[] = [];
  for (const [, offers] of namespacesMap) {
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
