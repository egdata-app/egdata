import { Link } from '@tanstack/react-router';
import { OfferCard } from '@/components/app/offer-card';
import {
  Carousel,
  CarouselPrevious,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from '../ui/carousel';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';
import { useCountry } from '@/hooks/use-country';
import { getLatestOffers } from '@/queries/latest-offers';

export function LatestOffers() {
  const { country } = useCountry();
  const { data: offers, isLoading: loading } = useQuery({
    queryKey: ['latest-games'],
    queryFn: () => getLatestOffers(country),
  });

  if (loading || !offers) return null;

  return (
    <section className="w-full pt-4" id="latest-games">
      <Link
        className="text-xl font-bold text-left inline-flex group items-center gap-2"
        to="/search"
        search={{
          sort_by: 'creationDate',
        }}
      >
        Latest Added{' '}
        <ArrowRightIcon className="w-6 h-6 inline-block group-hover:translate-x-1 transition-transform duration-300 ease-in-out" />
      </Link>{' '}
      <Carousel className="mt-2 h-full p-4">
        <CarouselPrevious />
        <CarouselContent>
          {offers.map((game) => (
            <CarouselItem key={game.id} className="basis-1/1 lg:basis-1/5">
              <OfferCard offer={game} key={game.id} size="md" />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext />
      </Carousel>
    </section>
  );
}
