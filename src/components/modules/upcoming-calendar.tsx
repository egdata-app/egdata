import { useQuery } from "@tanstack/react-query";
import type { SingleOffer } from "@/types/single-offer";
import { OfferCard } from "@/components/app/offer-card";
import { Carousel, CarouselContent } from "../ui/carousel";
import { useCountry } from "@/hooks/use-country";
import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { httpClient } from "@/lib/http-client";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";

interface UpcomingRes {
  elements: SingleOffer[];
  limit: number;
  start: number;
  page: number;
  count: number;
}

export function UpcomingCalendar() {
  const { country } = useCountry();
  const { data, isLoading } = useQuery({
    queryKey: [
      "upcoming",
      {
        country,
        page: 1,
      },
    ],
    queryFn: () =>
      httpClient.get<UpcomingRes>("/offers/upcoming", {
        params: {
          country,
          page: 1,
        },
      }),
  });

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const groupedOffersByDay = data?.elements.reduce(
    (acc, offer) => {
      const releaseDate = new Date(offer.releaseDate);
      const key = releaseDate.toDateString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(offer);
      return acc;
    },
    {} as Record<string, SingleOffer[]>,
  );

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return (
    <section id="upcoming-calendar" className="mb-2 w-full">
      <Link
        className="text-xl font-bold text-left inline-flex group items-center gap-2"
        to="/search"
        search={{
          sortBy: "upcoming",
        }}
      >
        Upcoming Offers{" "}
        <ArrowRightIcon className="w-6 h-6 inline-block group-hover:translate-x-1 transition-transform duration-300 ease-in-out" />
      </Link>
      <Carousel
        className="mt-2 h-full p-4 select-none"
        opts={{
          dragFree: true,
        }}
      >
        <CarouselContent className="gap-4 ml-0">
          {groupedOffersByDay &&
            Object.entries(groupedOffersByDay)
              .filter(([date]) => new Date(date) >= startOfToday)
              .map(([date, offers]) => (
                <div
                  className="flex flex-col w-fit border p-3 rounded-xl gap-2 bg-opacity-25"
                  key={date}
                >
                  <h3 className="text-xl">{relativeDate(new Date(date))}</h3>
                  <div className="flex flex-row gap-4">
                    {offers.map((offer) => (
                      <div key={offer.id} className="min-w-60 relative">
                        {
                          /* If the difference between right now and the game release is 1 day or less, show the timer */
                          new Date(offer.releaseDate).getTime() - Date.now() <
                            1000 * 60 * 60 * 24 && (
                            <FloatingCountdown date={new Date(offer.releaseDate)} />
                          )
                        }

                        <OfferCard offer={offer} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

function relativeDate(date: Date) {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = new Date();

  // Clear the time part for accurate comparison of just the date
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diff = dateOnly.getTime() - nowOnly.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  return formatter.format(days, "day");
}

/**
 * Live countdown timer
 * @param param0
 * @returns
 */
function FloatingCountdown({ date }: { date: Date }) {
  const { timezone } = useLocale();
  const target = DateTime.fromJSDate(date).setZone(timezone || "UTC");
  const [timeLeft, setTimeLeft] = useState(
    () => target.diff(DateTime.now().setZone(timezone || "UTC"), "milliseconds").milliseconds,
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const now = DateTime.now().setZone(timezone || "UTC");
      setTimeLeft(target.diff(now, "milliseconds").milliseconds);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [target, timezone]);

  return (
    <div className="absolute top-0 left-0 dark:bg-gray-800/50 p-2 rounded-tl-lg rounded-br-lg shadow-lg z-50 backdrop-blur-sm">
      <p>{formatTimeLeft(timeLeft)}</p>
    </div>
  );
}

/**
 * Formats the time left in days, hours, minutes and seconds
 * @param timeLeft
 * @returns
 */
function formatTimeLeft(timeLeft: number) {
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  let formatted = "";
  if (hours > 0) {
    if (hours < 10) {
      formatted += `0${hours}:`;
    } else {
      formatted += `${hours}:`;
    }
  }

  if (minutes < 10) {
    formatted += `0${minutes}:`;
  } else {
    formatted += `${minutes}:`;
  }

  if (seconds < 10) {
    formatted += `0${seconds}`;
  } else {
    formatted += `${seconds}`;
  }

  // If the time has passed, show ""
  if (timeLeft < 0) {
    formatted = "";
  }

  return formatted;
}
