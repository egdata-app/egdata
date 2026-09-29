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

export function sandboxFixtureResponse(url, payload) {
  if (url.pathname === "/graphql" && payload?.variables?.id?.startsWith("e2e-sandbox-catalog")) {
    return { status: 200, body: { data: { sandboxHub: null } } };
  }
  const match = url.pathname.match(/^\/sandboxes\/(e2e-sandbox-catalog[^/]*)(?:\/(.*))?$/);
  if (!match) return null;
  const [, id, section] = match;
  if (!section)
    return {
      status: 200,
      body: { _id: id, name: id, displayName: "Catalog fixture", status: "ACTIVE" },
    };
  if (section === "base-game") return { status: 200, body: null };
  if (section === "achievements") return { status: 200, body: [] };
  if (section === "changelog")
    return { status: 200, body: { hits: [], estimatedTotalHits: 0, limit: 20 } };
  const types = url.searchParams.get("offerType")?.split(",");
  const title = (url.searchParams.get("title") || "").toLowerCase();
  if (types?.includes("DLC")) return { status: 503, body: { error: "Fixture group unavailable" } };
  const elements =
    id.endsWith("-empty") || section !== "offers"
      ? []
      : sandboxFixtureOffers.filter(
          (entry) =>
            (!types || types.includes(entry.offerType)) &&
            entry.title.toLowerCase().includes(title),
        );
  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 20);
  return {
    status: 200,
    body: {
      elements: elements.slice((page - 1) * limit, page * limit),
      count: elements.length,
      page,
      limit,
    },
  };
}
