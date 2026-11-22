/**
 * Data helpers for the creation stats charts.
 *
 * These live outside the chart components on purpose: route loaders import them,
 * and route modules are part of the entry chunk. Keeping the fetchers here means
 * loading a route's data never pulls recharts into the initial bundle.
 */
import { httpClient } from "@/lib/http-client";

export interface MonthlyCreation {
  creations: number;
  year: number;
  month: number;
}

export interface YearlyCreation {
  creations: number;
  year: number;
}

export const getCreationsByMonth = async () =>
  httpClient.v1Get<MonthlyCreation[]>("/stats/creations/monthly");

export const getCreationsByYear = async () =>
  httpClient.v1Get<YearlyCreation[]>("/stats/creations/yearly");
