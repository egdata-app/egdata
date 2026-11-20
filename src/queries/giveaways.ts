import { httpClient } from "@/lib/http-client";
import { pickKeyImages, slimPrice, slimTags, toArray } from "@/lib/offer-projections";
import type { Price } from "@/types/price";
import type { KeyImage, Tag } from "@/types/single-offer";
import { mergeFreebies } from "@/utils/merge-freebies";
import { queryOptions } from "@tanstack/react-query";

/**
 * Freebie/giveaway queries return slim projections.
 *
 * `/free-games` responds with full store documents (descriptions, every key
 * image, item metadata, promotion rules), but the homepage table, the freebies
 * carousel and the redeem dialog only read a handful of fields.
 *
 * There are two projections because the pages need different things:
 * - the homepage table only paints title, art, platforms and dates;
 * - the freebies cards also need the price and the giveaway history tooltip.
 */

/** One preference list per rendering variant: tall art for rows, wide for cards. */
const TALL_IMAGES = ["DieselGameBoxTall", "OfferImageTall"];
const WIDE_IMAGES = [
  "DieselGameBoxWide",
  "OfferImageWide",
  "Featured",
  "DieselStoreFrontWide",
  "VaultClosed",
];

type GiveawayDates = {
  startDate: string | null;
  endDate: string | null;
};

export type GiveawayCardBase = {
  _id: string;
  id: string;
  namespace: string;
  title: string;
  keyImages: KeyImage[];
  items: Array<{ releaseInfo: Array<{ platform: string[] }> }>;
  giveaway: GiveawayDates;
};

/** Repeated freebie on the homepage: no price or history needed. */
export type HomeGiveaway = GiveawayCardBase & {
  platforms: string[];
  offers: GiveawayCardBase[];
};

/** Freebies carousel card: adds price and the repeated-giveaway history. */
export type GiveawayCardOffer = GiveawayCardBase & {
  price: Price | null;
  giveaway: GiveawayDates & {
    historical: Array<{ id: string; startDate: string; endDate: string }>;
  };
};

export type GiveawayCard = GiveawayCardOffer & {
  platforms: string[];
  offers: GiveawayCardBase[];
};

/** Mobile freebies render platform tags next to the title. */
export type MobileGiveawayOffer = GiveawayCardBase & {
  price: Price | null;
  tags: Tag[];
};

type RawGiveawayOffer = {
  _id?: string;
  id: string;
  namespace: string;
  title: string;
  keyImages?: KeyImage[] | null;
  price?: Price | null;
  tags?: Array<Partial<Tag> | null> | null;
  items?: Array<{
    releaseInfo?: Array<{ platform?: string[] | null } | null> | null;
  } | null> | null;
  giveaway?: {
    startDate?: string | null;
    endDate?: string | null;
    historical?: Array<{ id?: string; startDate?: string; endDate?: string } | null> | null;
  } | null;
};

function projectGiveawayBase(offer: RawGiveawayOffer, imageLists: string[][]) {
  return {
    _id: offer._id ?? offer.id,
    id: offer.id,
    namespace: offer.namespace,
    title: offer.title,
    keyImages: pickKeyImages(offer.keyImages, imageLists),
    items: toArray(offer.items).map((item) => ({
      releaseInfo: toArray(item?.releaseInfo).map((info) => ({
        platform: toArray(info?.platform).filter((platform): platform is string =>
          Boolean(platform),
        ),
      })),
    })),
    giveaway: {
      startDate: offer.giveaway?.startDate ?? null,
      endDate: offer.giveaway?.endDate ?? null,
    },
  };
}

function projectGiveawayCardOffer(offer: RawGiveawayOffer): GiveawayCardOffer {
  return {
    ...projectGiveawayBase(offer, [TALL_IMAGES, WIDE_IMAGES]),
    price: slimPrice(offer.price),
    giveaway: {
      startDate: offer.giveaway?.startDate ?? null,
      endDate: offer.giveaway?.endDate ?? null,
      historical: toArray(offer.giveaway?.historical).flatMap((entry) =>
        entry?.id && entry.startDate && entry.endDate
          ? [{ id: entry.id, startDate: entry.startDate, endDate: entry.endDate }]
          : [],
      ),
    },
  };
}

function projectHomeGiveaway(offer: RawGiveawayOffer): GiveawayCardBase {
  return projectGiveawayBase(offer, [TALL_IMAGES]);
}

export const giveawaysQueryOptions = (country?: string | null) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["giveaways", { country: resolvedCountry }] as const,
    queryFn: async (): Promise<GiveawayCard[]> => {
      const offers = await httpClient.v1Get<RawGiveawayOffer[]>("/free-games", {
        params: { country: resolvedCountry },
      });

      return mergeFreebies(toArray(offers).map(projectGiveawayCardOffer)).map((card) => ({
        ...card,
        // The redeem dialog only needs identity, art and dates per offer.
        offers: card.offers.map((offer) => ({
          _id: offer._id,
          id: offer.id,
          namespace: offer.namespace,
          title: offer.title,
          keyImages: offer.keyImages,
          items: offer.items,
          giveaway: offer.giveaway,
        })),
      }));
    },
  });
};

export const homeGiveawaysQueryOptions = (country?: string | null) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["home", "giveaways", { country: resolvedCountry }] as const,
    queryFn: async (): Promise<HomeGiveaway[]> => {
      const offers = await httpClient.v1Get<RawGiveawayOffer[]>("/free-games", {
        params: { country: resolvedCountry },
      });

      return mergeFreebies(toArray(offers).map(projectHomeGiveaway));
    },
  });
};

/** Mobile freebies are listed per offer, so they are projected but not merged. */
export const mobileGiveawaysQueryOptions = () =>
  queryOptions({
    queryKey: ["mobile-freebies"] as const,
    queryFn: async (): Promise<MobileGiveawayOffer[]> => {
      const offers = await httpClient.v1Get<RawGiveawayOffer[]>("/free-games/mobile");

      return toArray(offers).map((offer) => ({
        ...projectGiveawayBase(offer, [WIDE_IMAGES]),
        price: slimPrice(offer.price),
        tags: slimTags(offer.tags),
      }));
    },
  });
