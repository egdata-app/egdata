import { useQuery } from "@tanstack/react-query";
import { httpClient as client } from "@/lib/http-client";
import { OfferCard } from "@/components/app/offer-card";
import type { SingleOffer } from "@/types/single-offer";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { shuffle } from "@/lib/shuffle";
import { useCountry } from "@/hooks/use-country";
import { ArrowUpIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function SuggestedOffers({ id }: { id: string }) {
  const { country } = useCountry();
  const [api, setApi] = useState<CarouselApi>();

  const { data } = useQuery({
    queryKey: [
      "suggested-offers",
      {
        id,
        country,
      },
    ],
    queryFn: () =>
      client
        .get<SingleOffer[]>(`/offers/${id}/suggestions`, {
          params: {
            country,
          },
        })
        .then((res) => shuffle(res)),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const handlePreviousSlide = () => {
    api?.scrollPrev();
  };

  const handleNextSlide = () => {
    api?.scrollNext();
  };

  return (
    <section className="w-full h-full" id={`suggested-offers-${id}`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-bold text-left inline-flex group items-center gap-2">
          You may also like
        </h4>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousSlide}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card text-muted-foreground hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-300/50 disabled:opacity-50"
            type="button"
          >
            <ArrowUpIcon className="w-5 h-5 transform -rotate-90" />
          </button>
          <button
            onClick={handleNextSlide}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card text-muted-foreground hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-300/50 disabled:opacity-50"
            type="button"
          >
            <ArrowUpIcon className="w-5 h-5 transform rotate-90" />
          </button>
        </div>
      </div>
      <Carousel className="mt-2 h-full p-4" setApi={setApi}>
        <CarouselContent>
          {data?.map((game) => (
            <CarouselItem key={game.id} className="basis-1/1 lg:basis-1/5">
              <OfferCard offer={game} size="md" />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
