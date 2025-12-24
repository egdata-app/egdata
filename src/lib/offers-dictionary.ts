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
} as const;

const offerTypeRanks: {
  [key: string]: number;
} = {
  BASE_GAME: 0,
  DLC: 1,
  ADD_ON: 2,
  EDITION: 3,
  BUNDLE: 4,
  Bundle: 5,
  IN_GAME_PURCHASE: 6,
  VIRTUAL_CURRENCY: 7,
  CONSUMABLE: 8,
  UNLOCKABLE: 9,
  DIGITAL_EXTRA: 10,
  EXPERIENCE: 11,
  DEMO: 12,
  WALLET: 13,
  OTHERS: 14,
  null: 15,
  undefined: 16,
  SUBSCRIPTION: 17,
};

export function offersSorter<T>(
  a: T & {
    offerType: keyof typeof offersDictionary;
  },
  b: T & {
    offerType: keyof typeof offersDictionary;
  },
) {
  return offerTypeRanks[a.offerType] - offerTypeRanks[b.offerType];
}
