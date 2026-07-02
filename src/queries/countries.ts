import { httpClient } from "@/lib/http-client";
import { queryOptions } from "@tanstack/react-query";

const CACHE_KEY = "egdata:countries:v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

// Maps deprecated ISO 3166-1 alpha-2 codes to their modern successors
// so flag images resolve correctly on flagcdn.
// AN (Netherlands Antilles, dissolved 2010) -> CW (Curaçao)
const DEPRECATED_COUNTRY_CODES: Record<string, string> = {
  AN: "CW",
};

function normalizeCountryCode(code: string): string {
  return DEPRECATED_COUNTRY_CODES[code] ?? code;
}

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

  const normalizedData = Array.from(new Set(data.map(normalizeCountryCode)));

  if (isBrowser) {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: normalizedData,
        exiresAt: Date.now() + CACHE_TTL_MS,
      } satisfies CachedCountries),
    );
  }

  return normalizedData;
}

export const countriesQueryOptions = () =>
  queryOptions({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: CACHE_TTL_MS,
  });
