export const historicalLowsSearch = {
  isLowestPriceEver: true,
  price: { min: 1 },
  sortBy: "priceUpdatedAt",
  sortDir: "desc",
  page: 1,
  limit: 25,
} as const;

export const historicalLowsQueryKey = (country: string) =>
  ["historical-lows", { country }] as const;
