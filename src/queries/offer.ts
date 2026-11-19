import { httpClient, type HttpError } from "@/lib/http-client";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/supported-locales";
import type { Technology } from "@/types/builds";
import type { Franchise } from "@/types/franchise";
import type { SingleOffer } from "@/types/single-offer";
import { queryOptions } from "@tanstack/react-query";

export function resolveQueryLocale(locale?: string | null): string {
  return locale && isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
}

export type OfferPageFranchise = Franchise & { namespaces?: string[] };

export type OfferPageData = {
  offer: SingleOffer;
  technologies: Technology[];
  franchises: OfferPageFranchise[];
};

function isNotFoundError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as HttpError).status === 404);
}

export async function fetchOffer(
  id: string,
  options?: { country?: string; locale?: string | null },
): Promise<SingleOffer | null> {
  const resolvedLocale = resolveQueryLocale(options?.locale);

  try {
    return await httpClient.v1Get<SingleOffer>(`/offers/${id}`, {
      params: {
        ...(options?.country ? { country: options.country } : {}),
        locale: resolvedLocale,
      },
    });
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export const offerPageQueryOptions = ({
  id,
  country,
  locale,
}: {
  id: string;
  country: string;
  locale?: string | null;
}) => {
  const resolvedLocale = resolveQueryLocale(locale);
  const resolvedCountry = country || "US";

  return queryOptions({
    queryKey: ["offer-page", { id, country: resolvedCountry, locale: resolvedLocale }],
    queryFn: async (): Promise<OfferPageData | null> => {
      const [offer, technologies, franchises] = await Promise.all([
        fetchOffer(id, { country: resolvedCountry, locale: resolvedLocale }),
        httpClient.v1Get<Technology[]>(`/offers/${id}/technologies`).catch(() => []),
        httpClient.v1Get<OfferPageFranchise[]>(`/offers/${id}/franchises`).catch(() => []),
      ]);

      if (!offer) {
        return null;
      }

      return {
        offer,
        technologies: Array.isArray(technologies) ? technologies : [],
        franchises: Array.isArray(franchises) ? franchises : [],
      };
    },
    staleTime: 60_000,
  });
};

export const offerOnlyQueryOptions = (id: string, locale?: string | null) => {
  const resolvedLocale = resolveQueryLocale(locale);

  return queryOptions({
    queryKey: ["offer", { id, locale: resolvedLocale }],
    queryFn: () => fetchOffer(id, { locale: resolvedLocale }),
    staleTime: 60_000,
  });
};
