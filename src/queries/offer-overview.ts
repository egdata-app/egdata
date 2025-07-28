import { httpClient } from '@/lib/http-client';
import type { Technology } from '@/types/builds';
import type { IgdbOffer } from '@/types/igdb';
import type { Media } from '@/types/media';
import type { SinglePoll } from '@/types/polls';
import type { Price } from '@/types/price';
import type { SingleOffer } from '@/types/single-offer';
import type { Acb, Cero, Pegi, Grac, Esrb } from '@/types/single-sandbox';
import { queryOptions } from '@tanstack/react-query';

interface OfferOverview {
  offer: SingleOffer;
  price: Price | null;
  media: Media | null;
  igdb: IgdbOffer | null;
  features: {
    launcher: string;
    features: string[];
    epicFeatures: string[];
  };
  ageRating: Acb | Cero | Pegi | Grac | Esrb | null;
  polls: SinglePoll | null;
  genres: { id: string; name: string }[];
  technologies: Technology[];
}

export const getOfferOverview = ({
  id,
  country,
}: { id: string; country: string }) =>
  queryOptions({
    queryKey: ['offer-overview', { id, country }],
    queryFn: () =>
      httpClient.get<OfferOverview>(`/offers/${id}/overview`, {
        params: { country },
      }),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
