export const sandboxCatalogGroups = [
  { id: "games", types: ["BASE_GAME", "EDITION"] },
  { id: "dlc", types: ["DLC"] },
  { id: "addons", types: ["ADD_ON"] },
  { id: "bundles", types: ["BUNDLE", "Bundle"] },
  {
    id: "ingame",
    types: [
      "VIRTUAL_CURRENCY",
      "INGAME_CURRENCY",
      "WALLET",
      "INGAMEITEM",
      "IN_GAME_PURCHASE",
      "CONSUMABLE",
      "UNLOCKABLE",
      "LOOTBOX",
    ],
  },
  { id: "extras", types: ["DEMO", "DIGITAL_EXTRA", "EXPERIENCE"] },
  { id: "passes", types: ["SUBSCRIPTION", "SUBSCRIPTION_BUNDLE", "SEASON", "PASS"] },
  { id: "other", types: ["OTHERS", "UNKNOWN"] },
] as const;

export type SandboxCatalogGroup = (typeof sandboxCatalogGroups)[number]["id"];
export type SandboxCatalogSearch = {
  q: string;
  group: SandboxCatalogGroup | "all";
  types: string;
  page: number;
  pageSize: number;
  view: "cards" | "table";
};

export function validateSandboxCatalogSearch(
  search: Record<string, unknown>,
): SandboxCatalogSearch {
  const group = sandboxCatalogGroups.find((entry) => entry.id === search.group)?.id ?? "all";
  const page = Number(search.page);
  const pageSize = Number(search.pageSize);
  const types =
    typeof search.types === "string"
      ? [
          ...new Set(
            search.types
              .split(",")
              .map((type) => type.trim())
              .filter((type) => /^[A-Za-z_]+$/.test(type)),
          ),
        ]
          .sort()
          .join(",")
      : "";
  return {
    q: typeof search.q === "string" ? search.q.slice(0, 200) : "",
    group: types ? "all" : group,
    types,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: [20, 40, 60].includes(pageSize) ? pageSize : 20,
    view: search.view === "table" ? "table" : "cards",
  };
}

export function sandboxCatalogTypes(search: Pick<SandboxCatalogSearch, "types" | "group">) {
  return (
    search.types ||
    sandboxCatalogGroups.find((entry) => entry.id === search.group)?.types.join(",") ||
    undefined
  );
}

export function updateSandboxCatalogSearch(
  current: SandboxCatalogSearch,
  patch: Partial<SandboxCatalogSearch>,
) {
  return validateSandboxCatalogSearch({
    ...current,
    ...patch,
    ...(patch.group !== undefined ? { types: "" } : {}),
    ...(patch.types !== undefined ? { group: "all" } : {}),
    ...(patch.q !== undefined ||
    patch.group !== undefined ||
    patch.types !== undefined ||
    patch.pageSize !== undefined
      ? { page: 1 }
      : {}),
  });
}
