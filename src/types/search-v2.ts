import type { SingleOfferWithPrice } from "./single-offer-price";

export interface SearchV2Response {
  total: number;
  offers: SingleOfferWithPrice[];
  page: number;
  limit: number;
  aggregations: Aggregations;
  meta: {
    ms: number;
    timed_out: boolean;
    cached: boolean;
  };
}

export interface Aggregations {
  price_stats: PriceStats;
  [key: string]: AggregationBuckets | PriceStats;
}

export interface AggregationBuckets {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: Array<{
    key: string;
    doc_count: number;
  }>;
}

export interface PriceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
}
