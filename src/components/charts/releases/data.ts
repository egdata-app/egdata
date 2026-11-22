/**
 * Data helpers for the release stats charts.
 *
 * These live outside the chart components on purpose: route loaders import them,
 * and route modules are part of the entry chunk. Keeping the fetchers here means
 * loading a route's data never pulls recharts into the initial bundle.
 */
import { httpClient } from "@/lib/http-client";

export interface MonthlyRelease {
  releases: number;
  year: number;
  month: number;
}

export interface YearlyRelease {
  releases: number;
  year: number;
}

export const getReleasesByMonth = async () =>
  httpClient.v1Get<MonthlyRelease[]>("/stats/releases/monthly");

export const getReleasesByYear = async () =>
  httpClient.v1Get<YearlyRelease[]>("/stats/releases/yearly");
