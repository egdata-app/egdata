export const offerTypeValues = [
  "BASE_GAME",
  "DLC",
  "ADD_ON",
  "EDITION",
  "BUNDLE",
  "Bundle",
  "SUBSCRIPTION",
  "SUBSCRIPTION_BUNDLE",
  "DEMO",
  "SEASON",
  "PASS",
  "INGAMEITEM",
  "INGAME_CURRENCY",
  "LOOTBOX",
  "IN_GAME_PURCHASE",
  "VIRTUAL_CURRENCY",
  "CONSUMABLE",
  "UNLOCKABLE",
  "DIGITAL_EXTRA",
  "EXPERIENCE",
  "WALLET",
  "OTHERS",
  "UNKNOWN",
] as const;

export type OfferType = (typeof offerTypeValues)[number];

export const offersDictionary = {
  CONSUMABLE: "Consumable",
  UNLOCKABLE: "Unlockable",
  IN_GAME_PURCHASE: "In-game purchase",
  BASE_GAME: "Base game",
  VIRTUAL_CURRENCY: "Virtual currency",
  DLC: "DLC",
  Bundle: "Bundle (legacy)",
  DIGITAL_EXTRA: "Digital extra",
  OTHERS: "Others",
  EDITION: "Edition",
  EXPERIENCE: "Experience",
  DEMO: "Demo",
  ADD_ON: "Add-on",
  null: "Unknown",
  undefined: "Unknown",
  WALLET: "Wallet",
  BUNDLE: "Bundle",
  SUBSCRIPTION: "Subscription",
  SUBSCRIPTION_BUNDLE: "Subscription bundle",
  SEASON: "Season",
  PASS: "Pass",
  INGAMEITEM: "In-game item",
  INGAME_CURRENCY: "In-game currency",
  LOOTBOX: "Loot box",
  UNKNOWN: "Unknown",
} as const satisfies Record<OfferType | "null" | "undefined", string>;

const offerTypeRanks = {
  ...Object.fromEntries(offerTypeValues.map((offerType, index) => [offerType, index])),
  null: offerTypeValues.length,
  undefined: offerTypeValues.length + 1,
} as Record<string, number>;

export function offersSorter<T>(
  a: T & {
    offerType: keyof typeof offersDictionary;
  },
  b: T & {
    offerType: keyof typeof offersDictionary;
  },
) {
  return (
    (offerTypeRanks[a.offerType] ?? Number.MAX_SAFE_INTEGER) -
    (offerTypeRanks[b.offerType] ?? Number.MAX_SAFE_INTEGER)
  );
}
