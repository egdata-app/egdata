import { useEffect, useState } from "react";
import { httpClient } from "@/lib/http-client";
import {
  Carousel,
  CarouselPrevious,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountry } from "@/hooks/use-country";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { OfferCard } from "@/components/app/offer-card";
import type { SingleOffer } from "@/types/single-offer";
import { Link } from "@tanstack/react-router";

export function SalesModule({ eventId, event }: { eventId: string; event: string }) {
  const { country } = useCountry();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<SingleOffer[]>([]);

  useEffect(() => {
    httpClient
      .get<{
        elements: SingleOffer[];
      }>(`/promotions/${eventId}?country=${country || "US"}`)
      .then((res) => {
        setGames(res.elements);
        setLoading(false);
      });
  }, [eventId, country]);

  return (
    <section className="w-full h-full my-4" id={`promotion-${eventId}`}>
      <Link
        className="text-xl font-bold text-left inline-flex group items-center gap-2"
        to="/promotions/$id"
        params={{ id: eventId }}
        preload="viewport"
      >
        {event}{" "}
        <ArrowRightIcon className="w-6 h-6 inline-block group-hover:translate-x-1 transition-transform duration-300 ease-in-out" />
      </Link>
      <Carousel className="mt-2 h-full p-4">
        <CarouselPrevious />
        <CarouselContent>
          {loading &&
            games.length === 0 &&
            [...Array(25)].map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: This is a skeleton loader
              <CarouselItem key={index} className="basis-1/1 lg:basis-1/5">
                <Skeleton className="w-80 h-96" />
              </CarouselItem>
            ))}
          {games.map((game) => (
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
