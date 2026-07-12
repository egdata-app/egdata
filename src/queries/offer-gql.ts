import { graphql, type ResultOf } from "@/graphql";
import { httpClient } from "@/lib/http-client";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/supported-locales";
import { queryOptions } from "@tanstack/react-query";
import { print } from "graphql";
import type { SingleOffer } from "@/types/single-offer";
import type { Franchise } from "@/types/franchise";
import type { Technology } from "@/types/builds";

const GRAPHQL_URL = "/graphql";

export function resolveQueryLocale(locale?: string | null): string {
  return locale && isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
}

const offerPageQuery = graphql(`
  query OfferPage($id: ID!, $country: String!, $locale: String) {
    offer(id: $id, locale: $locale) {
      _id
      id
      namespace
      title
      description
      longDescription
      offerType
      effectiveDate
      creationDate
      lastModifiedDate
      isCodeRedemptionOnly
      prePurchase
      releaseDate
      pcReleaseDate
      viewableDate
      urlSlug
      productSlug
      url
      countriesBlacklist
      countriesWhitelist
      refundType
      developerDisplayName
      publisherDisplayName
      categories
      seller {
        id
        name
      }
      tags {
        id
        name
      }
      keyImages {
        type
        url
        md5
      }
      customAttributes {
        _id
        key
        type
        value
      }
      items {
        _id
        id
        namespace
        builds {
          _id
          labelName
          technologies {
            technology
            section
          }
        }
      }
      franchises {
        _id
        name
        offers
        allOffers {
          namespace
        }
      }
      giveaways {
        id
        namespace
        startDate
        endDate
      }
      offerMappings {
        _id
        pageSlug
        pageType
      }
      price(country: $country) {
        country
        region
        namespace
        offerId
        updatedAt
        price {
          currencyCode
          discount
          discountPrice
          originalPrice
        }
        appliedRules {
          id
          name
          namespace
          promotionStatus
          startDate
          endDate
          saleType
          regionIds
        }
      }
    }
  }
`);

type OfferPageResult = ResultOf<typeof offerPageQuery>;

function toRestOffer(gql: NonNullable<OfferPageResult["offer"]>): SingleOffer {
  const attrs = gql.customAttributes ?? [];
  const customAttributes: Record<string, { type: string; value: string }> = {};
  for (const attr of attrs) {
    if (attr && attr.key) {
      customAttributes[attr.key] = { type: attr.type ?? "", value: attr.value ?? "" };
    }
  }

  return {
    _id: gql._id ?? "",
    id: gql.id ?? "",
    namespace: gql.namespace ?? "",
    title: gql.title ?? "",
    description: gql.description ?? "",
    longDescription: gql.longDescription ?? null,
    offerType: gql.offerType ?? "UNKNOWN",
    effectiveDate: gql.effectiveDate ?? "",
    creationDate: gql.creationDate ?? "",
    lastModifiedDate: gql.lastModifiedDate ?? "",
    isCodeRedemptionOnly: gql.isCodeRedemptionOnly ?? false,
    keyImages: (gql.keyImages ?? []).filter(
      (k): k is NonNullable<typeof k> => k != null,
    ) as SingleOffer["keyImages"],
    seller: gql.seller
      ? { id: gql.seller.id ?? "", name: gql.seller.name ?? "" }
      : { id: "", name: "" },
    productSlug: (gql.productSlug as string | null) ?? null,
    urlSlug: (gql.urlSlug as string | null) ?? null,
    url: (gql.url as string | null) ?? null,
    tags: (gql.tags ?? []).filter(
      (t): t is NonNullable<typeof t> => t != null,
    ) as SingleOffer["tags"],
    items: (gql.items ?? [])
      .filter((i): i is NonNullable<typeof i> => i != null)
      .map((i) => ({
        id: i.id ?? "",
        namespace: i.namespace ?? "",
        _id: i._id ?? "",
      })) as SingleOffer["items"],
    customAttributes,
    categories: (gql.categories ?? []) as string[],
    developerDisplayName: (gql.developerDisplayName as string | null) ?? null,
    publisherDisplayName: (gql.publisherDisplayName as string | null) ?? null,
    prePurchase: (gql.prePurchase as boolean | null) ?? null,
    releaseDate: (gql.releaseDate as string) ?? "",
    pcReleaseDate: (gql.pcReleaseDate as string | null) ?? null,
    viewableDate: (gql.viewableDate as string) ?? "",
    countriesBlacklist: (gql.countriesBlacklist as string[] | null) ?? null,
    countriesWhitelist: (gql.countriesWhitelist as string[] | null) ?? null,
    refundType: (gql.refundType as string) ?? "NON_REFUNDABLE",
    offerMappings: (gql.offerMappings ?? [])
      .filter((m): m is NonNullable<typeof m> => m != null)
      .map((m) => ({
        pageSlug: m.pageSlug ?? "",
        pageType: m.pageType ?? "",
      })) as SingleOffer["offerMappings"],
    price: (gql.price as SingleOffer["price"] | undefined) ?? null,
    giveaway: gql.giveaways?.[0]
      ? {
          id: gql.giveaways[0].id ?? "",
          namespace: gql.giveaways[0].namespace ?? "",
          startDate: gql.giveaways[0].startDate ?? "",
          endDate: gql.giveaways[0].endDate ?? "",
        }
      : null,
  };
}

function toTechnologies(gql: NonNullable<OfferPageResult["offer"]>): Technology[] {
  const techMap = new Map<string, Technology>();
  for (const item of gql.items ?? []) {
    if (!item) continue;
    for (const build of item.builds ?? []) {
      if (!build) continue;
      for (const tech of build.technologies ?? []) {
        if (!tech) continue;
        const key = `${tech.section}:${tech.technology}`;
        if (!techMap.has(key)) {
          techMap.set(key, {
            section: tech.section ?? "",
            technology: tech.technology ?? "",
          });
        }
      }
    }
  }
  return Array.from(techMap.values());
}

type OfferPageFranchise = Franchise & { namespaces: string[] };

function toFranchises(gql: NonNullable<OfferPageResult["offer"]>): OfferPageFranchise[] {
  return (gql.franchises ?? [])
    .filter((f): f is NonNullable<typeof f> => f != null)
    .map((f) => ({
      _id: f._id ?? "",
      name: f.name ?? "",
      offers: (f.offers ?? []) as string[],
      namespaces: [
        ...new Set(
          (f.allOffers ?? []).flatMap((offer) => (offer?.namespace ? [offer.namespace] : [])),
        ),
      ],
    })) as OfferPageFranchise[];
}

export const offerGqlQueryOptions = ({
  id,
  country,
  locale,
}: {
  id: string;
  country: string;
  locale?: string | null;
}) => {
  const resolvedLocale = resolveQueryLocale(locale);

  return queryOptions({
    queryKey: ["offer-gql", { id, country, locale: resolvedLocale }],
    queryFn: async () => {
      const res = await httpClient.post<{ data: OfferPageResult }>(GRAPHQL_URL, {
        query: print(offerPageQuery),
        variables: { id, country, locale: resolvedLocale },
      });
      const offer = res.data.offer;
      if (!offer) return null;
      return {
        offer: toRestOffer(offer),
        technologies: toTechnologies(offer),
        franchises: toFranchises(offer),
      };
    },
    staleTime: 60_000,
  });
};

const offerOnlyQuery = graphql(`
  query OfferOnly($id: ID!, $locale: String) {
    offer(id: $id, locale: $locale) {
      _id
      id
      namespace
      title
      description
      longDescription
      offerType
      effectiveDate
      creationDate
      lastModifiedDate
      isCodeRedemptionOnly
      prePurchase
      releaseDate
      pcReleaseDate
      viewableDate
      urlSlug
      productSlug
      url
      countriesBlacklist
      countriesWhitelist
      refundType
      developerDisplayName
      publisherDisplayName
      categories
      seller {
        id
        name
      }
      tags {
        id
        name
      }
      keyImages {
        type
        url
        md5
      }
      customAttributes {
        _id
        key
        type
        value
      }
      items {
        _id
        id
        namespace
      }
      giveaways {
        id
        namespace
        startDate
        endDate
      }
      offerMappings {
        _id
        pageSlug
        pageType
      }
    }
  }
`);

type OfferOnlyResult = ResultOf<typeof offerOnlyQuery>;

export const offerOnlyQueryOptions = (id: string, locale?: string | null) => {
  const resolvedLocale = resolveQueryLocale(locale);

  return queryOptions({
    queryKey: ["offer", { id, locale: resolvedLocale }],
    queryFn: async () => {
      const res = await httpClient.post<{ data: OfferOnlyResult }>(GRAPHQL_URL, {
        query: print(offerOnlyQuery),
        variables: { id, locale: resolvedLocale },
      });
      const offer = res.data.offer;
      if (!offer) return null;
      return toRestOffer(offer as NonNullable<OfferPageResult["offer"]>);
    },
    staleTime: 60_000,
  });
};
