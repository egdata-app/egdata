import { httpClient } from "@/lib/http-client";
import { pickKeyImages, slimPrice, slimTags, toArray } from "@/lib/offer-projections";
import type { Price } from "@/types/price";
import type { KeyImage, Seller, SingleOffer, Tag } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import type { SingleSandbox } from "@/types/single-sandbox";
import { queryOptions } from "@tanstack/react-query";

/**
 * Sandbox queries return slim projections.
 *
 * `/sandboxes/:id` and `/sandboxes/:id/base-game` respond with full documents
 * (all age ratings, every key image, descriptions, custom attributes), while the
 * sandbox shell paints a hero and passes a title to page metadata. Projecting
 * here keeps those documents out of the SSR payload.
 */

/** Fields the shell, page headers and `generateSandboxMeta` read. */
export type SandboxIdentity = {
  _id: string;
  displayName: string | null;
  name: string | null;
  status: string | null;
  created: string | null;
  updated: string | null;
};

export type SandboxBaseGame = {
  isItem: boolean;
  id: string;
  namespace: string;
  title: string;
  description: string | null;
  longDescription: string | null;
  offerType: string | null;
  developer: string | null;
  developerDisplayName: string | null;
  publisherDisplayName: string | null;
  prePurchase: boolean | null;
  releaseDate: string | null;
  creationDate: string | null;
  lastModifiedDate: string | null;
  urlSlug: string | null;
  productSlug: string | null;
  seller: Seller | null;
  price: Price | null;
  keyImages: KeyImage[];
  tags: Tag[];
  releaseInfo: Array<{ platform: string[] }>;
  customAttributes: {
    FabListingId?: { value?: string };
    "com.epicgames.app.productSlug"?: { value?: string };
  };
  offerMappings: Array<{ pageSlug: string; pageType: string }>;
};

const HERO_IMAGES = [
  "DieselStoreFrontWide",
  "OfferImageWide",
  "DieselGameBoxWide",
  "TakeoverWide",
  "Screenshot",
  "DieselGameBox",
];

type BaseGameResponse = SingleOffer | (SingleItem & { isItem: true });

function projectSandboxIdentity(sandbox: SingleSandbox): SandboxIdentity {
  return {
    _id: sandbox._id,
    displayName: sandbox.displayName ?? null,
    name: sandbox.name ?? null,
    status: sandbox.status ?? null,
    created: sandbox.created ?? null,
    updated: sandbox.updated ?? null,
  };
}

function projectBaseGame(baseGame: BaseGameResponse): SandboxBaseGame {
  const offer = baseGame as Partial<SingleOffer>;
  const item = baseGame as Partial<SingleItem>;
  const isItem = "isItem" in baseGame && Boolean(baseGame.isItem);

  return {
    isItem,
    id: baseGame.id,
    namespace: baseGame.namespace ?? item.namespace ?? "",
    title: baseGame.title,
    description: offer.description ?? item.description ?? null,
    longDescription: offer.longDescription ?? null,
    offerType: offer.offerType ?? null,
    developer: item.developer ?? null,
    developerDisplayName: offer.developerDisplayName ?? null,
    publisherDisplayName: offer.publisherDisplayName ?? null,
    prePurchase: offer.prePurchase ?? null,
    releaseDate: offer.releaseDate ?? null,
    creationDate: baseGame.creationDate ?? null,
    lastModifiedDate: baseGame.lastModifiedDate ?? null,
    urlSlug: offer.urlSlug ?? null,
    productSlug: offer.productSlug ?? null,
    seller: offer.seller ? { id: offer.seller.id, name: offer.seller.name } : null,
    price: slimPrice(offer.price),
    keyImages: pickKeyImages(baseGame.keyImages, [HERO_IMAGES]),
    tags: slimTags(offer.tags),
    releaseInfo: toArray(item.releaseInfo).map((info) => ({
      platform: toArray(info?.platform).filter((platform): platform is string => Boolean(platform)),
    })),
    customAttributes: {
      ...(offer.customAttributes?.FabListingId
        ? { FabListingId: { value: offer.customAttributes.FabListingId.value } }
        : {}),
      ...(offer.customAttributes?.["com.epicgames.app.productSlug"]
        ? {
            "com.epicgames.app.productSlug": {
              value: offer.customAttributes["com.epicgames.app.productSlug"].value,
            },
          }
        : {}),
    },
    offerMappings: toArray(offer.offerMappings)
      .slice(0, 1)
      .map((mapping) => ({ pageSlug: mapping.pageSlug, pageType: mapping.pageType })),
  };
}

export const sandboxQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["sandbox", "identity", { id }] as const,
    queryFn: async (): Promise<SandboxIdentity | null> => {
      const sandbox = await httpClient.v1Get<SingleSandbox>(`/sandboxes/${id}`).catch(() => null);

      return sandbox ? projectSandboxIdentity(sandbox) : null;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

export const sandboxBaseGameQueryOptions = (id: string, country?: string | null) => {
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["sandbox", "base-game", { id, country: resolvedCountry }] as const,
    queryFn: async (): Promise<SandboxBaseGame | null> => {
      const baseGame = await httpClient
        .v1Get<BaseGameResponse>(`/sandboxes/${id}/base-game`, {
          params: { country: resolvedCountry },
        })
        .catch(() => null);

      return baseGame ? projectBaseGame(baseGame) : null;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
};
