import { graphql, type ResultOf } from "@/graphql";
import { httpClient } from "@/lib/http-client";
import type { Price } from "@/types/price";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import { queryOptions } from "@tanstack/react-query";
import { print } from "graphql";

const GRAPHQL_URL = "/graphql";

const sandboxHubQuery = graphql(`
  query SandboxHub($id: ID!, $country: String!, $offerLimit: Int, $updateLimit: Int) {
    sandboxHub(id: $id, country: $country, offerLimit: $offerLimit, updateLimit: $updateLimit) {
      id
      namespace
      title
      description
      primaryKind
      developer
      publisher
      platforms
      ageRating
      created
      updated
      seller {
        id
        name
      }
      price {
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
          basePayoutCurrencyCode
          basePayoutPrice
          payoutCurrencyExchangeRate
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
      keyImages {
        type
        url
        md5
      }
      genres {
        id
        name
        groupName
      }
      stats {
        offers
        items
        assets
        builds
        achievements
      }
      achievements {
        sets
        total
        baseTotal
        xp
      }
      sandbox {
        _id
        name
        displayName
        parent
        store
        status
        created
        updated
      }
      primaryItem {
        _id
        id
        namespace
        title
        description
        status
        creationDate
        lastModifiedDate
        entitlementName
        entitlementType
        itemType
        developer
        developerId
        applicationId
        unsearchable
        requiresSecureAccount
        endOfSupport
        eulaIds
        keyImages {
          type
          url
          md5
        }
        categories {
          path
        }
        customAttributes {
          key
          type
          value
        }
        releaseInfo {
          id
          appId
          platform
        }
      }
      primaryOffer {
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
        productSlug
        urlSlug
        url
        developerDisplayName
        publisherDisplayName
        prePurchase
        releaseDate
        pcReleaseDate
        viewableDate
        countriesBlacklist
        countriesWhitelist
        refundType
        categories
        seller {
          id
          name
        }
        tags {
          id
          name
          groupName
        }
        keyImages {
          type
          url
          md5
        }
        customAttributes {
          key
          type
          value
        }
        items {
          _id
          id
          namespace
        }
        offerMappings {
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
            basePayoutCurrencyCode
            basePayoutPrice
            payoutCurrencyExchangeRate
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
      featuredOffers {
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
        productSlug
        urlSlug
        url
        developerDisplayName
        publisherDisplayName
        prePurchase
        releaseDate
        pcReleaseDate
        viewableDate
        countriesBlacklist
        countriesWhitelist
        refundType
        categories
        seller {
          id
          name
        }
        tags {
          id
          name
          groupName
        }
        keyImages {
          type
          url
          md5
        }
        customAttributes {
          key
          type
          value
        }
        items {
          _id
          id
          namespace
        }
        offerMappings {
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
            basePayoutCurrencyCode
            basePayoutPrice
            payoutCurrencyExchangeRate
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
      recentBuilds {
        _id
        appName
        labelName
        buildVersion
        downloadSizeBytes
        installedSizeBytes
        createdAt
        updatedAt
      }
      recentChanges {
        _id
        timestamp
        metadata {
          contextId
          contextType
          changes {
            changeType
            field
          }
        }
      }
    }
  }
`);

type SandboxHubResult = ResultOf<typeof sandboxHubQuery>;
type RawSandboxHub = NonNullable<SandboxHubResult["sandboxHub"]>;
type RawOffer = NonNullable<RawSandboxHub["primaryOffer"]>;
type RawItem = NonNullable<RawSandboxHub["primaryItem"]>;

type HubPrice = RawSandboxHub["price"] | RawOffer["price"];

export type SandboxHubData = Omit<
  RawSandboxHub,
  "featuredOffers" | "primaryItem" | "primaryOffer" | "price"
> & {
  featuredOffers: SingleOffer[];
  primaryItem: (SingleItem & { isItem: true }) | null;
  primaryOffer: SingleOffer | null;
  price: Price | null;
};

function normalizePrice(price: HubPrice): Price | null {
  return (price ?? null) as Price | null;
}

function normalizeCustomAttributes(
  attrs:
    | Array<{ key?: string | null; type?: string | null; value?: string | null } | null>
    | null
    | undefined,
) {
  const customAttributes: SingleOffer["customAttributes"] = {};

  for (const attr of attrs ?? []) {
    if (!attr?.key) {
      continue;
    }

    customAttributes[attr.key] = {
      type: attr.type ?? "",
      value: attr.value ?? "",
    };
  }

  return customAttributes;
}

function normalizeOffer(offer: RawOffer, priceOverride?: Price | null): SingleOffer {
  return {
    _id: offer._id ?? "",
    id: offer.id ?? "",
    namespace: offer.namespace ?? "",
    title: offer.title ?? "",
    description: offer.description ?? "",
    longDescription: offer.longDescription ?? null,
    offerType: offer.offerType ?? "UNKNOWN",
    effectiveDate: offer.effectiveDate ?? "",
    creationDate: offer.creationDate ?? "",
    lastModifiedDate: offer.lastModifiedDate ?? "",
    isCodeRedemptionOnly: offer.isCodeRedemptionOnly ?? false,
    keyImages: (offer.keyImages ?? []).filter(Boolean) as SingleOffer["keyImages"],
    seller: (offer.seller ?? { id: "", name: "" }) as SingleOffer["seller"],
    productSlug: offer.productSlug ?? null,
    urlSlug: offer.urlSlug ?? null,
    url: offer.url ?? null,
    tags: (offer.tags ?? []).filter(Boolean) as SingleOffer["tags"],
    items: (offer.items ?? []).filter(Boolean).map((item) => ({
      _id: item?._id ?? "",
      id: item?.id ?? "",
      namespace: item?.namespace ?? "",
    })),
    customAttributes: normalizeCustomAttributes(offer.customAttributes),
    categories: (offer.categories ?? []) as string[],
    developerDisplayName: offer.developerDisplayName ?? null,
    publisherDisplayName: offer.publisherDisplayName ?? null,
    prePurchase: offer.prePurchase ?? null,
    releaseDate: offer.releaseDate ?? "",
    pcReleaseDate: offer.pcReleaseDate ?? null,
    viewableDate: offer.viewableDate ?? "",
    countriesBlacklist: (offer.countriesBlacklist ?? null) as string[] | null,
    countriesWhitelist: (offer.countriesWhitelist ?? null) as string[] | null,
    refundType: offer.refundType ?? "NON_REFUNDABLE",
    offerMappings: (offer.offerMappings ?? []).filter(Boolean).map((mapping) => ({
      pageSlug: mapping?.pageSlug ?? "",
      pageType: mapping?.pageType ?? "",
    })),
    price: priceOverride ?? normalizePrice(offer.price),
    giveaway: null,
  };
}

function normalizeItem(item: RawItem): SingleItem & { isItem: true } {
  return {
    _id: item._id ?? "",
    id: item.id ?? "",
    namespace: item.namespace ?? "",
    title: item.title ?? "",
    description: item.description ?? "",
    keyImages: (item.keyImages ?? []).filter(Boolean) as SingleItem["keyImages"],
    categories: (item.categories ?? []).filter(Boolean) as SingleItem["categories"],
    status: item.status ?? "",
    creationDate: item.creationDate ?? "",
    lastModifiedDate: item.lastModifiedDate ?? "",
    customAttributes: normalizeCustomAttributes(item.customAttributes),
    entitlementName: item.entitlementName ?? "",
    entitlementType: item.entitlementType ?? "",
    itemType: item.itemType ?? "",
    releaseInfo: (item.releaseInfo ?? []).filter(Boolean).map((release) => ({
      id: release?.id ?? "",
      appId: release?.appId ?? "",
      platform: (release?.platform ?? []) as string[],
    })),
    developer: item.developer ?? "",
    developerId: item.developerId ?? "",
    eulaIds: (item.eulaIds ?? []) as string[],
    installModes: [],
    endOfSupport: item.endOfSupport ?? false,
    applicationId: item.applicationId ?? "",
    unsearchable: item.unsearchable ?? false,
    requiresSecureAccount: item.requiresSecureAccount ?? false,
    isItem: true,
  };
}

function normalizeSandboxHub(hub: RawSandboxHub): SandboxHubData {
  const price = normalizePrice(hub.price);

  return {
    ...hub,
    price,
    primaryOffer: hub.primaryOffer ? normalizeOffer(hub.primaryOffer, price) : null,
    primaryItem: hub.primaryItem ? normalizeItem(hub.primaryItem) : null,
    featuredOffers: (hub.featuredOffers ?? [])
      .filter(Boolean)
      .map((offer) => normalizeOffer(offer as RawOffer)),
  };
}

export const sandboxHubQueryOptions = ({
  id,
  country,
  offerLimit = 8,
  updateLimit = 8,
}: {
  id: string;
  country: string;
  offerLimit?: number;
  updateLimit?: number;
}) =>
  queryOptions({
    queryKey: ["sandbox-hub", { id, country, offerLimit, updateLimit }],
    queryFn: async () => {
      const res = await httpClient.post<{ data: SandboxHubResult }>(GRAPHQL_URL, {
        query: print(sandboxHubQuery),
        variables: { id, country, offerLimit, updateLimit },
      });

      return res.data.sandboxHub ? normalizeSandboxHub(res.data.sandboxHub) : null;
    },
    staleTime: 60_000,
  });
