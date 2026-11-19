export const sandboxFixtureId = "e2e-sandbox-catalog-with-a-long-namespace-identifier";

function offer(id, offerType, title = id) {
  return {
    _id: id,
    id,
    namespace: sandboxFixtureId,
    title,
    offerType,
    description: "Catalog fixture",
    keyImages: [],
    seller: { id: "epic", name: "Epic" },
    items: [],
    categories: [],
    tags: [],
    customAttributes: [],
    offerMappings: [],
    releaseDate: "2025-01-01",
    creationDate: "2025-01-01",
    lastModifiedDate: "2026-01-01",
    price: null,
  };
}

export const sandboxFixtureOffers = [
  offer("base-one", "BASE_GAME", "Same title"),
  offer("base-two", "BASE_GAME", "Same title"),
  offer("edition", "EDITION", "Deluxe edition"),
  offer("legacy-bundle", "Bundle", "Legacy bundle"),
  offer("future", "FUTURE_TYPE", "Future catalog record"),
  offer("missing", null, "Unclassified record"),
  {
    ...offer("free-demo", "DEMO", "Free demo"),
    price: {
      country: "US",
      updatedAt: "2026-01-01",
      appliedRules: [],
      price: { currencyCode: "USD", discountPrice: 0, originalPrice: 0, discount: 0 },
    },
  },
  ...Array.from({ length: 25 }, (_, index) =>
    offer(`addon-${index}`, "ADD_ON", `Add-on ${String(index).padStart(2, "0")}`),
  ),
];

export function sandboxFixtureResponse(url) {
  const pathname = url.pathname.replace(/^\/v1/, "");
  const match = pathname.match(/^\/sandboxes\/(e2e-sandbox-catalog[^/]*)(?:\/(.*))?$/);
  if (!match) return null;
  const [, id, section] = match;
  if (!section)
    return {
      status: 200,
      body: { data: { _id: id, name: id, displayName: "Catalog fixture", status: "ACTIVE" } },
    };
  if (section === "base-game") return { status: 200, body: { data: null } };
  if (section === "stats")
    return {
      status: 200,
      body: {
        data: {
          offers: id.endsWith("-empty") ? 0 : sandboxFixtureOffers.length,
          items: 0,
          assets: 0,
          builds: 0,
          achievements: 0,
        },
        meta: {},
      },
    };
  if (section === "builds")
    return {
      status: 200,
      body: {
        data: [],
        meta: { count: 0, pagination: { limit: 20, hasMore: false, nextCursor: null, total: 0 } },
      },
    };
  if (section === "achievements") return { status: 200, body: { data: [], meta: { count: 0 } } };
  if (section === "changelog")
    return {
      status: 200,
      body: {
        data: { hits: [] },
        meta: { count: 0, pagination: { limit: 20, hasMore: false, nextCursor: null, total: 0 } },
      },
    };
  const types = url.searchParams.get("offerType")?.split(",");
  const title = (url.searchParams.get("title") || "").toLowerCase();
  if (types?.includes("DLC")) return { status: 503, body: { error: "Fixture group unavailable" } };
  if (id === `${sandboxFixtureId}-items` && section === "items") {
    const items = [
      {
        _id: "item-no-release",
        id: "item-no-release",
        namespace: id,
        title: "Item without releaseInfo",
        status: "ACTIVE",
        entitlementType: "EXECUTABLE",
        developer: "Epic",
        developerId: "epic",
        lastModifiedDate: "2026-01-01",
      },
      {
        _id: "item-with-release",
        id: "item-with-release",
        namespace: id,
        title: "Item with Windows releaseInfo",
        status: "ACTIVE",
        entitlementType: "EXECUTABLE",
        developer: "Epic",
        developerId: "epic",
        releaseInfo: [{ id: "r1", appId: "app", platform: ["Windows"] }],
        lastModifiedDate: "2026-01-01",
      },
    ];
    return {
      status: 200,
      body: {
        data: items,
        meta: {
          count: items.length,
          pagination: { limit: 20, hasMore: false, nextCursor: null, total: items.length },
        },
      },
    };
  }
  const elements =
    id.endsWith("-empty") || section !== "offers"
      ? []
      : sandboxFixtureOffers.filter(
          (entry) =>
            (!types || types.includes(entry.offerType)) &&
            entry.title.toLowerCase().includes(title),
        );
  const cursor = url.searchParams.get("cursor");
  const page = cursor ? Number(cursor) || 1 : 1;
  const limit = Number(url.searchParams.get("limit") || 20);
  const sliced = elements.slice((page - 1) * limit, page * limit);
  const hasMore = page * limit < elements.length;
  return {
    status: 200,
    body: {
      data: sliced,
      meta: {
        count: sliced.length,
        pagination: {
          limit,
          hasMore,
          nextCursor: hasMore ? String(page + 1) : null,
          total: elements.length,
        },
      },
    },
  };
}
