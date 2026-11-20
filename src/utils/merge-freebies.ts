type MergeableGiveawayItem = {
  releaseInfo?: Array<{ platform?: string[] | null } | null> | null;
};

type MergeableGiveaway = {
  namespace: string;
  title: string;
  items?: MergeableGiveawayItem[] | null;
};

export type MergedFreebie<T extends MergeableGiveaway> = T & {
  offers: T[];
  platforms: string[];
};

/**
 * Groups repeated freebies (same namespace + title, different platform offers)
 * into one card, keeping the per-offer rows for redeem links.
 *
 * Generic over the offer shape so projected giveaway rows can be merged without
 * widening them back to the full API document.
 */
export function mergeFreebies<T extends MergeableGiveaway>(data: T[]): MergedFreebie<T>[] {
  const groupedOffers = new Map<string, T[]>();
  for (const offer of data) {
    const key = `${offer.namespace}:${offer.title}`;
    if (groupedOffers.has(key)) {
      groupedOffers.get(key)?.push(offer);
    } else {
      groupedOffers.set(key, [offer]);
    }
  }

  const mergedFreebies: MergedFreebie<T>[] = [];
  for (const [, offers] of groupedOffers) {
    const [first] = offers;
    mergedFreebies.push({
      ...first,
      platforms: offers.flatMap((offer) =>
        (offer.items ?? []).flatMap((item) =>
          (item?.releaseInfo ?? []).flatMap((info) =>
            (info?.platform ?? []).filter((platform): platform is string => Boolean(platform)),
          ),
        ),
      ),
      offers,
    });
  }

  return mergedFreebies;
}
