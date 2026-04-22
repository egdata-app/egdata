export type Tier = "none" | "elevated" | "average" | "good" | "great" | "incredible";

export interface RegionalPricingScore {
  offerId: string;
  namespace: string;
  country: string;
  region: string;
  // MSRP-based USD equivalents — primary scoring anchor, stable across sale periods.
  usMsrpUsd: number;
  regionalMsrpUsd: number;
  // Current paying prices (post-discount). When `regionalCurrentPriceUsd < regionalMsrpUsd`
  // the offer is on sale in this region right now.
  usCurrentPriceUsd: number;
  regionalCurrentPriceUsd: number;
  // Ratio and derived fields below are MSRP-based.
  ratio: number;
  expectedPpp: number;
  expectedMedian: number;
  deviationPpp: number;
  deviationMedian: number;
  suggestedPriceUsd: number;
  tier: Tier;
  relativeTier: Tier | null;
  updatedAt: string;
}
