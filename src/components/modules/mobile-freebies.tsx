import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { mobileFreebiesQuery } from "@/queries/mobile-freebies";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/getImage";
import { Link } from "@tanstack/react-router";
import { useLocale } from "@/hooks/use-locale";
import { calculatePrice } from "@/lib/calculate-price";
import type { GiveawayOffer } from "@/types/giveaways";
import { createFileRoute } from "@tanstack/react-router";
import { platformIcons } from "@/components/app/platform-icons";
import { DateTime } from "luxon";

export const Route = createFileRoute("/offers/$id")({});

export function MobileFreebiesCarousel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, isError } = useQuery(mobileFreebiesQuery);

  if (isLoading) {
    return (
      <section id="mobile-freebies-carousel">
        <div className="flex items-center justify-center">
          <Skeleton className="h-[300px]" />
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <section
      id="mobile-freebies-carousel"
      className="flex flex-col items-start justify-start w-full gap-4"
    >
      <div className="flex flex-row justify-between items-center gap-4 w-full">
        <h2 className="text-xl font-semibold">Mobile Free Games</h2>
        <Button
          variant="outline"
          className="h-9 w-9 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ArrowDown
            className={cn("h-5 w-5 m-2 transition-transform ease-in-out duration-300", {
              "-rotate-180": isExpanded,
            })}
          />
        </Button>
      </div>
      {isExpanded && (
        <ScrollArea className="w-full">
          <div className="flex flex-row items-stretch justify-evenly gap-6 w-full">
            {data.map((game) => (
              <MobileGiveawayCard key={game._id} offer={game} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}

function MobileGiveawayCard({ offer }: { offer: GiveawayOffer }) {
  const { locale } = useLocale();
  const startDate = new Date(offer.giveaway.startDate);
  const endDate = new Date(offer.giveaway.endDate);
  const now = new Date();

  const isOnGoing = startDate < now && endDate > now;
  const isUpcoming = startDate > now;

  const priceFmtr = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: offer.price?.price.currencyCode || "USD",
  });

  return (
    <Link
      to="/offers/$id"
      params={{ id: offer.id }}
      className="flex flex-col rounded-lg shadow-md overflow-hidden w-[300px]"
    >
      <div className="relative flex-shrink-0">
        <Image
          src={
            getImage(offer?.keyImages || [], [
              "DieselGameBoxWide",
              "OfferImageWide",
              "Featured",
              "DieselStoreFrontWide",
              "VaultClosed",
            ])?.url
          }
          alt={offer.title}
          className="w-full h-[200px] object-cover"
          width={400}
          height={225}
        />
      </div>
      {(isUpcoming || isOnGoing) && <Countdown targetDate={startDate} />}
      <div className="flex flex-col flex-grow p-4 bg-card">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-medium">{offer.title}</h3>
          <div className="flex items-center gap-1">
            {offer.tags
              .filter((tag) => platformIcons[tag.id])
              .map((tag) => (
                <span key={tag.id}>{platformIcons[tag.id]}</span>
              ))}
          </div>
        </div>
        <div className="flex justify-between items-baseline mt-auto">
          <div className="flex items-center gap-2">
            {offer.price && (
              <>
                <span className="text-xl font-bold">
                  {isOnGoing
                    ? "Free"
                    : priceFmtr.format(
                        calculatePrice(
                          offer.price?.price.originalPrice,
                          offer.price?.price.currencyCode,
                        ),
                      )}
                </span>
                {isOnGoing && (
                  <span className="text-sm font-semibold line-through">
                    {priceFmtr.format(
                      calculatePrice(
                        offer.price?.price.originalPrice,
                        offer.price?.price.currencyCode,
                      ),
                    )}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Countdown({ targetDate }: { targetDate: Date }) {
  const { timezone } = useLocale();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateCountdown = () => {
      const now = DateTime.now().setZone(timezone || "UTC");
      const target = DateTime.fromJSDate(targetDate).setZone(timezone || "UTC");
      const diff = target.diff(now, "milliseconds").milliseconds;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    // Initial update
    updateCountdown();

    // Set interval only if the target date is in the future
    const now = DateTime.now().setZone(timezone || "UTC");
    const target = DateTime.fromJSDate(targetDate).setZone(timezone || "UTC");
    if (target > now) {
      interval = setInterval(updateCountdown, 1000);
    }

    return () => clearInterval(interval);
  }, [targetDate, timezone]);

  const isFinised =
    timeLeft.days < 0 && timeLeft.hours < 0 && timeLeft.minutes < 0 && timeLeft.seconds < 0;

  return (
    <div
      className={cn(
        "flex flex-row items-center justify-center gap-2 text-sm font-semibold text-white py-1",
        isFinised && "bg-badge text-black",
        !isFinised && "bg-gray-900",
      )}
    >
      {!isFinised ? (
        <span className="font-semibold">
          Starts in {timeLeft.days > 0 && `${timeLeft.days}d `}
          {timeLeft.hours.toString().padStart(2, "0")}:
          {timeLeft.minutes.toString().padStart(2, "0")}:
          {timeLeft.seconds.toString().padStart(2, "0")}
        </span>
      ) : (
        <span className="font-semibold">Free Now</span>
      )}
    </div>
  );
}
