import type { JSX } from "react";
import * as Portal from "@radix-ui/react-portal";
import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useCompare } from "@/hooks/use-compare";
import { httpClient } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import type { SingleOffer } from "@/types/single-offer";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { Image } from "./image";
import { getImage } from "@/lib/getImage";
import { offersDictionary } from "@/lib/offers-dictionary";
import { useGenres } from "@/hooks/use-genres";
import type { AchievementsSets } from "@/queries/offer-achievements";
import { getRarity } from "@/lib/get-rarity";
import { Link } from "@tanstack/react-router";
import type { SingleSandbox } from "@/types/single-sandbox";
import { useCountry } from "@/hooks/use-country";
import { Button } from "../ui/button";
import { platformIcons } from "./platform-icons";
import { GameFeatures } from "./features";
import { calculatePrice } from "@/lib/calculate-price";
import { useLocale } from "@/hooks/use-locale";

const CompareIcon = (props: JSX.IntrinsicElements["svg"]) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
    className={cn("size-6", props.className)}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
    />
  </svg>
);

export function ComparisonPortal() {
  const { compare } = useCompare();
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (compare.length === 0) {
      setOpen(false);
    }
  }, [compare]);

  return (
    <Portal.Root>
      {compare.length > 0 && (
        <div className="fixed top-0 right-0 m-4">
          <button
            className="bg-card rounded-full p-2 relative z-20"
            onClick={() => setOpen((prev) => !prev)}
            type="button"
          >
            <span className="absolute -top-2 -right-2 bg-primary/10 text-white rounded-full text-xs size-6 p-1">
              {compare.length}
            </span>
            <CompareIcon className="text-white size-7" />
          </button>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-20">
          <div
            className="absolute inset-0 bg-black/50 cursor-pointer backdrop-blur-[2px] transition-all duration-300 ease-in-out"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            tabIndex={-1} // To make it focusable for keyboard events
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-card rounded-lg p-4 w-fit max-w-5xl pointer-events-auto">
              <CompareTable />
            </div>
          </div>
        </div>
      )}
    </Portal.Root>
  );
}

function CompareTable() {
  const { compare } = useCompare();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const queries = useQueries({
    queries: compare.map((id) => ({
      queryKey: ["offer", { id }],
      queryFn: () => httpClient.get<SingleOffer>(`/offers/${id}`),
    })),
  });

  return (
    <ScrollArea>
      <div className="flex flex-row gap-2 overflow-x-auto mb-4" ref={scrollContainerRef}>
        {queries.map((query, index) => (
          <div key={compare[index]} className="flex flex-row gap-2">
            <SingleGame key={compare[index]} query={query} id={compare[index]} />
            {index < queries.length - 1 && (
              <div className="h-full border-l border-gray-300/25 w-1" />
            )}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function SingleGame({ query, id }: { query: UseQueryResult<SingleOffer, Error>; id: string }) {
  const { country } = useCountry();
  const { removeFromCompare } = useCompare();
  const { genres } = useGenres();
  const { data, isLoading, isError } = query;

  if (isLoading || !data) {
    return <Skeleton className="w-48 h-48" />;
  }

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <div className="flex flex-col gap-2 max-h-[800px] w-72">
      <div className="relative">
        <Image
          src={
            getImage(data.keyImages, ["OfferImageWide", "Featured", "DieselStoreFrontWide"])?.url ??
            "/placeholder.webp"
          }
          alt={data.title}
          className="w-full h-48 object-cover rounded-lg"
          width={600}
          height={350}
        />
        <GameFeatures id={id} />
      </div>
      <section
        id="metadata"
        className="flex flex-col h-[20rem] max-h-[20rem] min-h-[20rem] justify-between"
      >
        <Link
          to="/offers/$id"
          params={{ id: data.id }}
          className="font-bold underline underline-offset-4 decoration-slate-100/20 overflow-ellipsis mb-2"
        >
          {data.title.slice(0, 50)}
          {data.title.length > 50 && "..."}{" "}
        </Link>
        <div className="flex flex-col gap-2">
          <OfferMetadataRow
            label="Type"
            value={offersDictionary[data.offerType] ?? data.offerType}
          />
          <OfferMetadataRow
            label="Seller"
            value={
              <Link
                to="/sellers/$id"
                params={{ id: data.seller.id }}
                className="underline underline-offset-4 decoration-slate-100/20"
              >
                {data.seller.name}
              </Link>
            }
          />
          <OfferMetadataRow
            label="Developer"
            value={data.developerDisplayName ?? data.seller.name}
          />
          <OfferMetadataRow
            label="Release Date"
            value={
              data.releaseDate
                ? new Date(data.releaseDate).toLocaleDateString("en-UK", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Unknown"
            }
          />
          <OfferMetadataRow
            label="PC Release Date"
            value={
              data.pcReleaseDate
                ? new Date(data.pcReleaseDate).toLocaleDateString("en-UK", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Unknown"
            }
          />
          {genres && (
            <OfferMetadataRow
              label="Genres"
              value={data.tags
                .filter((tag) => {
                  const tagId = tag.id;
                  return genres.some((genre) => genre.id === tagId);
                })
                .map((tag) => tag.name)
                .slice(0, 3)
                .join(", ")}
            />
          )}
          <OfferMetadataRow
            label="Platforms"
            value={
              <span className="inline-flex gap-2 items-center justify-start">
                {data.tags
                  .filter((tag) => platformIcons[tag.id])
                  .map((tag) => (
                    <span key={tag.id}>{platformIcons[tag.id]}</span>
                  ))}
              </span>
            }
          />
          <Achievements id={data.id} />
        </div>
      </section>
      <hr className="border-t border-gray-300/25" />
      <AgeRatings id={data.id} />
      <hr className="border-t border-gray-300/25" />
      <Price id={data.id} key={`compare-price-${data.id}-${country}`} />
      <div className="flex justify-center">
        <Button
          variant="outline"
          className="bg-card text-white hover:bg-destructive hover:text-white transition-all duration-300 ease-in-out"
          onClick={() => removeFromCompare(data.id)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function OfferMetadataRow({ label, value }: { label: string; value: string | JSX.Element }) {
  return (
    <div className="flex flex-row justify-start items-center gap-2">
      <span className="text-sm text-gray-500">{label}:</span>
      <span className="text-sm font-semibold max-w-full truncate">{value}</span>
    </div>
  );
}

interface RarityCount {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  unknown: number;
}

const countAchievementsByRarity = (data: AchievementsSets) => {
  return data.reduce<RarityCount>(
    (acc, item) => {
      for (const achievement of item.achievements) {
        const rarity = getRarity(achievement.xp);
        acc[rarity]++;
      }
      return acc;
    },
    {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      unknown: 0,
    },
  );
};

const xpCount = (data: AchievementsSets) => {
  return data.reduce((acc, item) => {
    for (const achievement of item.achievements) {
      acc += achievement.xp;
    }
    return acc;
  }, 0);
};

const TrophyIcon = (props: JSX.IntrinsicElements["svg"]) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
    className={cn("size-6", props.className)}
  >
    <path
      fillRule="evenodd"
      d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 0 0-.584.859 6.753 6.753 0 0 0 6.138 5.6 6.73 6.73 0 0 0 2.743 1.346A6.707 6.707 0 0 1 9.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 0 0-2.25 2.25c0 .414.336.75.75.75h15a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 0 1-1.112-3.173 6.73 6.73 0 0 0 2.743-1.347 6.753 6.753 0 0 0 6.139-5.6.75.75 0 0 0-.585-.858 47.077 47.077 0 0 0-3.07-.543V2.62a.75.75 0 0 0-.658-.744 49.22 49.22 0 0 0-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 0 0-.657.744Zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 0 1 3.16 5.337a45.6 45.6 0 0 1 2.006-.343v.256Zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 0 1-2.863 3.207 6.72 6.72 0 0 0 .857-3.294Z"
      clipRule="evenodd"
    />
  </svg>
);

const trophyColors: { [key: string]: string } = {
  bronze: "text-bronze-start",
  silver: "text-silver-start",
  gold: "text-gold-start",
  platinum: "text-platinum-start",
  unknown: "text-gray-300",
};

function Achievements({ id }: { id: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["achievements", { id }],
    queryFn: () => httpClient.get<AchievementsSets>(`/offers/${id}/achievements`),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 h-20">
        <span className="text-sm text-gray-500">Achievements:</span>
        <Skeleton className="w-full h-48" />
      </div>
    );
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="flex flex-col gap-4 h-20">
        <span className="text-sm text-gray-500">Achievements:</span>
        <span className="w-full inline-flex justify-center items-center text-gray-500 text-xl">
          -
        </span>
      </div>
    );
  }

  const rarityCount = countAchievementsByRarity(data);
  const xp = xpCount(data);

  return (
    <div className="flex flex-col gap-4 h-20">
      <span className="text-sm text-gray-500">Achievements:</span>
      <div className="flex flex-row gap-3 justify-center items-center">
        {Object.entries(rarityCount)
          .filter(([_, count]) => count > 0)
          .map(([rarity, count]) => (
            <div key={rarity} className="flex flex-col items-center">
              <span className="text-xs text-white font-semibold">{count}</span>
              <TrophyIcon className={cn("text-white size-5", trophyColors[rarity])} />
            </div>
          ))}

        {Object.values(rarityCount).reduce((acc, count) => acc + count, 0) > 0 && (
          <span className="text-xs text-white font-bold">=</span>
        )}

        {Object.values(rarityCount).reduce((acc, count) => acc + count, 0) > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-xs text-white font-semibold">
              {Object.values(rarityCount).reduce((acc, count) => acc + count, 0)}
            </span>
            <TrophyIcon className={cn("text-white size-6", trophyColors.platinum)} />
          </div>
        )}

        <div
          className={cn(
            "flex flex-col items-center ml-3",
            Object.values(rarityCount).reduce((acc, count) => acc + count, 0) > 0 ? "ml-3" : "ml-0",
          )}
        >
          <span className="text-sm text-white font-bold">{xp} XP</span>
        </div>
      </div>
    </div>
  );
}

function AgeRatings({ id }: { id: string }) {
  const { country } = useCountry();
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "offer",
      "age-rating",
      {
        id: id,
        country,
        single: true,
      },
    ],
    queryFn: () =>
      httpClient.get<SingleSandbox["ageGatings"]>(`/offers/${id}/age-rating`, {
        params: {
          country,
          single: true,
        },
      }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 h-32">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Age Rating:</span>
        </div>
        <Skeleton className="w-full h-48" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-4 h-32">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Age Rating:</span>
        </div>
        <p className="text-sm text-gray-500">No age ratings found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-32">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">Age Rating:</span>
      </div>
      <div className="flex flex-row gap-2 flex-wrap justify-center items-center">
        {Object.entries(data || {}).map(([key, rating]) => (
          <div className="flex flex-row gap-2" key={key}>
            {rating.ratingImage && rating.ratingImage !== "" ? (
              <img
                key={key}
                src={rating.ratingImage}
                alt={key}
                title={rating.title}
                className="size-16 mx-auto"
              />
            ) : (
              <div className="size-16 mx-auto inline-flex items-center justify-center bg-gray-900 rounded-lg">
                <span className="text-lg font-bold">{rating.ageControl}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RegionalPrice {
  currentPrice: {
    _id: string;
    country: string;
    region: string;
    namespace: string;
    offerId: string;
    price: {
      currencyCode: string;
      discount: number;
      discountPrice: number;
      originalPrice: number;
      basePayoutCurrencyCode: string;
      basePayoutPrice: number;
      payoutCurrencyExchangeRate: number;
      _id: string;
    };
    appliedRules: Array<{
      id: string;
      name: string;
      namespace: string;
      promotionStatus: string;
      startDate: string;
      endDate: string;
      saleType: string;
      regionIds: Array<string>;
      discountSetting: {
        discountType: string;
        discountValue: any;
        discountPercentage: number;
        _id: string;
      };
      promotionSetting: {
        promotionType: string;
        discountOffers: Array<{
          offerId: string;
          _id: string;
        }>;
        _id: string;
      };
      _id: string;
    }>;
    updatedAt: string;
    __v: number;
  };
  maxPrice: number;
  minPrice: number;
}

function Price({ id }: { id: string }) {
  const { country } = useCountry();
  const { locale } = useLocale();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["regional-price", { id, country }],
    queryFn: () =>
      httpClient.get<RegionalPrice>(`/offers/${id}/regional-price`, {
        params: { country },
      }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 h-28">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Price:</span>
        </div>
        <Skeleton className="w-full h-48" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-4 h-28">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Price:</span>
        </div>
        <p className="text-sm text-gray-500">No price found</p>
      </div>
    );
  }

  const priceFmtr = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: data?.currentPrice?.price?.currencyCode ?? "USD",
  });

  return (
    <div className="flex flex-col gap-4 h-28">
      <span className="text-sm text-gray-500">Price:</span>
      {data.currentPrice && (
        <div className="flex justify-evenly gap-4">
          <div className="text-center">
            <div>Current</div>
            <div className="inline-flex items-center justify-center">
              <span
                className={cn(
                  "text-sm mt-3 font-bold",
                  data.currentPrice?.price.discount > 0
                    ? "bg-blue-600 text-white px-2 rounded-md"
                    : "",
                )}
              >
                {priceFmtr.format(
                  calculatePrice(
                    data.currentPrice?.price.discountPrice,
                    data.currentPrice?.price.currencyCode,
                  ),
                )}
              </span>
              {data.currentPrice?.price.discount > 0 && (
                <span className="text-xs mt-3 font-bold line-through text-gray-500 ml-2">
                  {priceFmtr.format(
                    calculatePrice(
                      data.currentPrice?.price.originalPrice,
                      data.currentPrice?.price.currencyCode,
                    ),
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div>Lowest</div>
            <div className="text-sm mt-3 font-bold">
              {priceFmtr.format(
                calculatePrice(data.minPrice, data.currentPrice?.price.currencyCode),
              )}
              {data.minPrice !== data.currentPrice?.price.originalPrice && (
                <span className="text-red-500 text-xs">
                  (
                  {Math.round((data.minPrice / data.currentPrice?.price.originalPrice) * 100) - 100}
                  %)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {!data.currentPrice && (
        <div className="text-sm text-gray-500 text-center">No price found</div>
      )}
    </div>
  );
}
