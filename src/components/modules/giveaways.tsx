import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "../ui/skeleton";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/getImage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountry } from "@/hooks/use-country";
import { useEffect, useState } from "react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import type { GiveawayOffer } from "@/types/giveaways";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { calculatePrice } from "@/lib/calculate-price";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { httpClient } from "@/lib/http-client";
import { Link } from "@tanstack/react-router";
import { useLocale } from "@/hooks/use-locale";
import { mergeFreebies } from "@/utils/merge-freebies";
import { DateTime } from "luxon";

export function GiveawaysCarousel({ hideTitle }: { hideTitle?: boolean }) {
  const { country } = useCountry();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["giveaways"],
    queryFn: () =>
      httpClient
        .get<GiveawayOffer[]>("/free-games", {
          params: {
            country,
          },
        })
        .then(mergeFreebies),
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <section id="giveaways-carousel">
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
      id="giveaways-carousel"
      className="flex flex-col items-start justify-start w-full gap-4"
    >
      {!hideTitle && (
        <Link
          className="text-xl font-bold text-left inline-flex group items-center gap-2"
          to="/freebies"
        >
          <h2 className="text-xl font-bold">Giveaways 🎁</h2>
          <ArrowRightIcon className="w-6 h-6 inline-block group-hover:translate-x-1 transition-transform duration-300 ease-in-out" />
        </Link>
      )}
      <ScrollArea className="w-full">
        <div className="flex flex-row items-stretch justify-evenly gap-6 w-full">
          {data
            .filter((offer) => offer.title)
            .map((offer) => (
              <GiveawayCard key={offer.id} offer={offer} />
            ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

function GiveawayCard({ offer }: { offer: GiveawayOffer }) {
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
      params={{
        id: offer.id,
      }}
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
        <h3 className="text-lg font-medium mb-2">{offer.title}</h3>
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
          <span className="text-sm font-semibold flex items-center gap-1">
            <TooltipProvider>
              Repeated:{" "}
              {offer.giveaway?.historical?.length > 1 ? (
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    Yes
                    <InfoCircledIcon className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="flex flex-col gap-1">
                    <i className="text-xs font-normal">
                      This offer has been gifted {offer.giveaway?.historical?.length} times.
                    </i>
                    <div className="flex flex-col gap-1">
                      {offer.giveaway?.historical?.map((historical) => (
                        <span key={historical.id}>
                          {new Date(historical.startDate).toLocaleDateString("en-UK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          -{" "}
                          {new Date(historical.endDate).toLocaleDateString("en-UK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                "No"
              )}
            </TooltipProvider>
          </span>
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
