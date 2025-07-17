import { ArrowRightIcon } from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { useCountry } from '@/hooks/use-country';
import { OfferCard } from '@/components/app/offer-card';
import {
  Carousel,
  CarouselPrevious,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from '../ui/carousel';
import { Skeleton } from '../ui/skeleton';
import { getLastModified } from '@/queries/last-modified';
import { Link } from '@tanstack/react-router';

export function LastModifiedGames() {
  const { country } = useCountry();
  const { data: games, isLoading: loading } = useQuery({
    queryKey: ['last-modified-offers', { country }],
    queryFn: () => getLastModified(country),
  });

  return (
    <section className="w-full" id="last-modified-offers">
      <Link
        to="/search"
        search={{
          sortBy: 'lastModifiedDate',
        }}
        className="text-xl font-bold text-left inline-flex group items-center gap-2"
      >
        Last Modified Offers
        <ArrowRightIcon className="w-6 h-6 inline-block group-hover:translate-x-1 transition-transform duration-300 ease-in-out" />
      </Link>
      <Carousel className="mt-2 p-4">
        <CarouselPrevious />
        <CarouselContent className="items-center">
          {(loading || !games) &&
            [...Array(25)].map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: This is a skeleton loader
              <CarouselItem key={index} className="basis-1/5">
                <Skeleton className="w-80 h-96" />
              </CarouselItem>
            ))}
          {!loading &&
            games &&
            games.map((game) => (
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
