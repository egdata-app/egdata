export const technologyOfferId = "technology-link-offer";

const generatedAt = "2026-08-03T10:00:00.000Z";
const refreshAfter = "2026-11-01T10:00:00.000Z";

export function createReadyTechnologyResponse(id = "NVIDIA_DLSS", displayName = "NVIDIA DLSS") {
  return {
    status: "ready",
    id,
    profile: {
      displayName,
      summary:
        "NVIDIA Deep Learning Super Sampling uses neural rendering techniques to improve image quality and performance in supported games.",
      vendor: "NVIDIA",
      category: "graphics",
      officialUrl: "https://www.nvidia.com/en-us/geforce/technologies/dlss/",
      aliases: ["DLSS", "Deep Learning Super Sampling"],
      confidence: "high",
    },
    sources: [
      {
        title: "NVIDIA DLSS",
        url: "https://www.nvidia.com/en-us/geforce/technologies/dlss/",
        kind: "official",
      },
      {
        title: "NVIDIA DLSS Programming Guide",
        url: "https://developer.nvidia.com/rtx/dlss/get-started",
        kind: "documentation",
      },
    ],
    logo: {
      url: `https://technologies-api.egdata.app/v1/assets/technology-logos/${"a".repeat(64)}.png`,
      sourceUrl: "https://www.nvidia.com/en-us/geforce/technologies/dlss/",
    },
    generatedAt,
    refreshAfter,
    stale: false,
  };
}

export function createTechnologyApiResponse(id) {
  if (id === "NVIDIA_DLSS") {
    return { status: 200, body: createReadyTechnologyResponse() };
  }

  if (id === "PENDING_TECH") {
    return {
      status: 202,
      headers: { "Retry-After": "1" },
      body: { status: "pending", id, retryAfterMs: 1_000 },
    };
  }

  if (id === "CFG") {
    return {
      status: 200,
      body: {
        status: "unresolved",
        id,
        reason: "ambiguous",
        generatedAt,
        refreshAfter,
        stale: false,
      },
    };
  }

  if (id === "iCue") {
    return {
      status: 200,
      body: {
        status: "unresolved",
        id,
        reason: "insufficient_sources",
        generatedAt,
        refreshAfter,
        stale: false,
      },
    };
  }

  if (id === "UNAVAILABLE_TECH") {
    return { status: 503, body: { error: "validation_unavailable" } };
  }

  return { status: 404, body: { error: "technology_not_found" } };
}

export function createTechnologyOfferResponse(id = technologyOfferId) {
  return {
    data: {
      offer: {
        _id: id,
        id,
        namespace: "technology-test-namespace",
        title: "Technology Link Test",
        description: "A deterministic offer used to verify exact technology links.",
        longDescription: null,
        offerType: "BASE_GAME",
        effectiveDate: "2026-01-01T00:00:00.000Z",
        expiryDate: null,
        creationDate: "2026-01-01T00:00:00.000Z",
        lastModifiedDate: "2026-08-01T00:00:00.000Z",
        isCodeRedemptionOnly: false,
        prePurchase: false,
        releaseDate: "2026-01-01T00:00:00.000Z",
        pcReleaseDate: null,
        viewableDate: "2026-01-01T00:00:00.000Z",
        urlSlug: null,
        productSlug: null,
        url: null,
        countriesBlacklist: null,
        countriesWhitelist: null,
        refundType: "REFUNDABLE",
        developerDisplayName: "EGDATA Test Developer",
        publisherDisplayName: "EGDATA Test Publisher",
        categories: [],
        seller: { id: "test-seller", name: "EGDATA Test Seller" },
        tags: [],
        keyImages: [],
        customAttributes: [],
        items: [
          {
            _id: "technology-test-item",
            id: "technology-test-item",
            namespace: "technology-test-namespace",
            builds: [
              {
                _id: "technology-test-build",
                labelName: "Live",
                technologies: [{ technology: "NVIDIA_DLSS", section: "Engine" }],
              },
            ],
          },
        ],
        franchises: [],
        giveaways: [],
        offerMappings: [],
        price: null,
      },
    },
  };
}

export function isTechnologyOfferRequest(payload) {
  return (
    payload?.variables?.id === technologyOfferId &&
    typeof payload?.query === "string" &&
    /query\s+Offer(?:Only|Page)/u.test(payload.query)
  );
}
