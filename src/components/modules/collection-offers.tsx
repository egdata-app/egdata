import { useQuery } from "@tanstack/react-query";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "../ui/carousel";
import { httpClient } from "@/lib/http-client";
import { Skeleton } from "../ui/skeleton";
import { OfferCard } from "@/components/app/offer-card";
import type { SingleOffer } from "@/types/single-offer";
import { useCountry } from "@/hooks/use-country";
import { ArrowUpIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function CollectionOffers({ id }: { id: string }) {
  const { country } = useCountry();
  const [api, setApi] = useState<CarouselApi>();
  const {
    data: collection,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["collection-offers", { id, country }],
    queryFn: () =>
      httpClient.get<SingleOffer[]>(`/offers/${id}/collection`, {
        params: { country },
      }),
  });

  const handlePreviousSlide = () => {
    api?.scrollPrev();
  };

  const handleNextSlide = () => {
    api?.scrollNext();
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <hr className="my-4" />
        <div className="flex justify-between items-center">
          <h4 className="text-xl font-bold text-left inline-flex group items-center gap-2">
            Collection Offers
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
        <Carousel
          opts={{
            align: "start",
          }}
          className="w-full"
        >
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, index) => (
              <CarouselItem
                key={`skeleton-collection-${id}-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: This is the loading skeleton
                  index
                }`}
                className="md:basis-1/2 lg:basis-1/4"
              >
                <div className="p-1">
                  <Skeleton className="h-[500px] w-[300px]" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    );
  }

  if (isError) return null;

  return (
    <>
      <hr className="my-4" />
      <div className="flex justify-between items-center">
        <h4 className="text-xl font-bold text-left inline-flex group items-center gap-2">
          Collection Offers
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
      <Carousel
        opts={{
          align: "start",
        }}
        className="w-full"
        setApi={setApi}
      >
        <CarouselContent>
          {collection?.map((offer) => (
            <CarouselItem key={offer.id} className="md:basis-1/2 lg:basis-1/4">
              <div className="p-1">
                <OfferCard offer={offer} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <hr className="my-4" />
    </>
  );
}
