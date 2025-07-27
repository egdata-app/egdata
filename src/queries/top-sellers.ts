import { httpClient } from '@/lib/http-client';
import type { SingleOffer } from '@/types/single-offer';

export const getTopSellers = async (country: string) => {
  return httpClient
    .get<{ elements: SingleOffer[] }>('/offers/top-sellers', {
      params: {
        country,
        limit: 25,
      },
    })
    .then((res) => res.elements);
};