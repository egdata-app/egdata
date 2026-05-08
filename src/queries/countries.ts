import { httpClient } from "@/lib/http-client";
import { queryOptions } from "@tanstack/react-query";

const CACHE_KEY = "egdata:countries";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

interface CachedCountries {
  data: string[];
  exiresAt: number;
}

async function fetchCountries(): Promise<string[]> {
  const isBrowser = typeof window !== "undefined";

  if (isBrowser) {
    const cache = localStorage.getItem(CACHE_KEY);
    if (cache) {
      const parsed = JSON.parse(cache) as CachedCountries;
      if (parsed.exiresAt && Date.now() < parsed.exiresAt) {
        return parsed.data;
      }
    }
  }

  const data = await httpClient.get<string[]>("/countries");

  if (isBrowser) {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, exiresAt: Date.now() + CACHE_TTL_MS } satisfies CachedCountries),
    );
  }

  return data;
}

export const countriesQueryOptions = () =>
  queryOptions({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: CACHE_TTL_MS,
  });
