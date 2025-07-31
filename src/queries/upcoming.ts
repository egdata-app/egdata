import { httpClient } from '@/lib/http-client';
import type { SingleOffer } from '@/types/single-offer';

export async function getUpcoming({ country }: { country: string }) {
  return httpClient.get<{
    elements: SingleOffer[];
  }>('/offers/upcoming', {
    params: {
      country,
      limit: 25,
    },
  });
}
