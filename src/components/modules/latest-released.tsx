import { getLatestReleased } from "@/queries/latest-released";
import { OfferCard } from "@/components/app/offer-card";
import {
  Carousel,
  CarouselPrevious,
  CarouselContent,
  CarouselItem,
  CarouselNext,
} from "../ui/carousel";
import { useQuery } from "@tanstack/react-query";
import { useCountry } from "@/hooks/use-country";
import { ArrowRightIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function LatestReleased() {
  const { country } = useCountry();
  const { data: offers, isLoading: loading } = useQuery({
    queryKey: ["latest-released", { country }],
    queryFn: () => getLatestReleased({ country }),
  });

  if (loading || !offers?.elements) return null;

  return (
    <section className="w-full pt-4" id="latest-games">
      <Link
        className="text-xl font-bold text-left inline-flex group items-center gap-2"
        to="/search"
        search={{
          sortBy: "releaseDate",
        }}
      >
        Latest Released{" "}
        <ArrowRightIcon className="w-6 h-6 inline-block group-hover:translate-x-1 transition-transform duration-300 ease-in-out" />
      </Link>
      <Carousel className="mt-2 h-full p-4">
        <CarouselPrevious />
        <CarouselContent>
          {offers.elements.map((game) => (
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
