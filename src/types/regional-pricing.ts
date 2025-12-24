import type { Price } from "./price";

export interface RegionData {
  region: Region;
}

export interface Region {
  code: string;
  currencyCode: string;
  description: string;
  countries: string[];
}

export interface RegionalPrice {
  [region: string]: SingleRegionalPrice;
}

export interface SingleRegionalPrice {
  currentPrice: Price;
  maxPrice: number;
  minPrice: number;
}
