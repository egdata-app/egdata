import type * as React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/paraglide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { Card, CardContent } from "@/components/ui/card";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import type { SingleSandbox } from "@/types/single-sandbox";
import { useCountry } from "@/hooks/use-country";
import { calculatePrice } from "@/lib/calculate-price";
import type { Price } from "@/types/price";
import { cn } from "@/lib/utils";
import type { Hltb } from "@/types/hltb";
import StarsRating from "@/components/app/stars-rating";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { type rarities, raritiesTextColors } from "@/components/app/achievement-card";
import { getRarity } from "@/lib/get-rarity";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/hooks/use-locale";
import type { OfferPosition } from "@/types/collections";
import { PerformanceTable } from "@/components/app/performance-table";
import { bestCollectionKey } from "@/lib/performance";
import { getOfferIgdb } from "@/queries/igdb";
import { getOfferPriceFairness } from "@/queries/offer-price-fairness";
import {
  offerAchievementsQueryOptions,
  offerCollectionPositionsQueryOptions,
  offerGenresQueryOptions,
  offerPollsQueryOptions,
  offerPriceStatsQueryOptions,
  offerTopsQueryOptions,
} from "@/queries/offer";
import { RegionalPricingBadge } from "@/components/app/regional-pricing-badge";
import { DateTime } from "luxon";
import { formatTimeToHumanReadable } from "@/lib/time-to-human-readable";
import { getEffectivePrice } from "@/lib/effective-price";
import { hasOfferRequirements, OfferRequirementsCard } from "@/components/app/offer-requirements";
import type { OfferRequirements } from "@/types/offer-requirements";

const OVERVIEW_CARD_CLASS =
  "w-full rounded-xl border border-white/10 bg-card/80 text-card-foreground shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:bg-card hover:border-primary/60 hover:shadow-lg hover:shadow-black/35";

export const Route = createFileRoute("/{-$locale}/offers/$id/")({
  component: () => {
    return <RouteComponent />;
  },

  loader: ({ params, context, cause }) => {
    const { id } = params;
    const { queryClient } = context;
    const country = context.country || "US";

    if (!import.meta.env.SSR) {
      // Warm top-of-page overview cards without blocking navigation or hover
      void queryClient.prefetchQuery(offerGenresQueryOptions(id));
      void queryClient.prefetchQuery(offerPriceStatsQueryOptions(id, country));

      if (cause !== "preload") {
        void queryClient.prefetchQuery(getOfferIgdb(id));
        void queryClient.prefetchQuery(getOfferPriceFairness(id, country));
        void queryClient.prefetchQuery(offerTopsQueryOptions(id));
      }
    }

    return {
      id,
      country,
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  const { timezone } = useLocale();
  const { id } = Route.useParams();
  const { country } = useCountry();
  const [selectedCollectionState, setSelectedCollectionState] = useState<{
    offerId: string;
    collection: string;
  } | null>(null);
  const [
    genresQuery,
    priceQuery,
    priceFairnessQuery,
    ageRatingQuery,
    achievementsQuery,
    giveawaysQuery,
    hltbQuery,
    reviewsQuery,
    topsQuery,
    igdbQuery,
    requirementsQuery,
  ] = useQueries({
    queries: [
      offerGenresQueryOptions(id),
      offerPriceStatsQueryOptions(id, country),
      getOfferPriceFairness(id, country),
      {
        queryKey: ["offer", "age-rating", { id, country }],
        queryFn: () =>
          httpClient.v1Get<SingleSandbox["ageGatings"]>(`/offers/${id}/age-rating`, {
            params: { country, single: true },
          }),
      },
      offerAchievementsQueryOptions(id),
      {
        queryKey: ["offer", "giveaways", { id }],
        queryFn: () =>
          httpClient.v1Get<
            {
              _id: string;
              id: string;
              namespace: string;
              startDate: string;
              endDate: string;
            }[]
          >(`/offers/${id}/giveaways`),
      },
      {
        queryKey: ["offer", "hltb", { id }],
        queryFn: () => httpClient.v1Get<Hltb>(`/offers/${id}/hltb`),
        retry: false,
      },
      offerPollsQueryOptions(id),
      {
        ...offerTopsQueryOptions(id),
        placeholderData: keepPreviousData,
      },
      getOfferIgdb(id),
      {
        queryKey: ["offer", "requirements", { id }],
        queryFn: () =>
          httpClient.v1Get<OfferRequirements>(`/offers/${id}/requirements`).catch(() => null),
        retry: false,
      },
    ],
  });

  const { data: genres } = genresQuery;
  const { data: price } = priceQuery;
  const { data: priceFairness } = priceFairnessQuery;
  const { data: ageRating } = ageRatingQuery;
  const { data: achievements } = achievementsQuery;
  const { data: giveaways } = giveawaysQuery;
  const { data: hltb } = hltbQuery;
  const { data: reviews } = reviewsQuery;
  const { data: tops } = topsQuery;
  const { data: igdb } = igdbQuery;
  const { data: requirements } = requirementsQuery;
  const timeToBeat = igdb?.timeToBeat;

  const hasTops = Boolean(tops && Object.keys(tops).length > 0);
  const defaultCollection = bestCollectionKey(tops, "top-sellers");
  const activeCollection =
    selectedCollectionState?.offerId === id
      ? selectedCollectionState.collection
      : defaultCollection;

  const collectionsQuery = useQuery({
    ...offerCollectionPositionsQueryOptions(id, activeCollection, country),
    enabled: hasTops && Boolean(activeCollection),
  });

  const noOfAchievemenentsPerRarity = useMemo(() => {
    return achievements
      ?.flatMap((set) => set.achievements ?? [])
      .reduce(
        (acc, achievement) => {
          const rarity = getRarity(achievement.xp);
          acc[rarity] = (acc[rarity] || 0) + 1;
          return acc;
        },
        {} as { [key in keyof typeof rarities]: number },
      );
  }, [achievements]);

  const isNotBaseGame = useMemo(() => {
    return achievements?.some((set) => !set.isBase);
  }, [achievements]);

  const totalXP = useMemo(() => {
    return achievements
      ?.flatMap((set) => set.achievements ?? [])
      .reduce((acc, achievement) => acc + achievement.xp, !isNotBaseGame ? 250 : 0);
  }, [achievements, isNotBaseGame]);

  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-2">
      {hasTops && (
        <div className="w-full rounded-xl border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:shadow-lg hover:shadow-black/35 [&>div]:border-0 [&>div]:bg-transparent">
          <PerformanceTable
            key={`${id}-${defaultCollection}`}
            data={collectionsQuery.data as OfferPosition}
            onChange={(value) => setSelectedCollectionState({ offerId: id, collection: value })}
            tops={tops || {}}
            defaultCollection={defaultCollection}
            isLoading={collectionsQuery.isLoading}
          />
        </div>
      )}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 mt-4 w-full">
        <OverviewColumn>
          <OverviewSection title={t("offerDetail.overview.genres")} count={genres?.length}>
            <Card className={OVERVIEW_CARD_CLASS}>
              <CardContent className="p-6">
                <div className="flex flex-row flex-wrap items-center justify-center gap-2.5">
                  {genres?.map((genre) => (
                    <Link
                      key={genre.id}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors duration-200 ease-in-out hover:border-primary/50 hover:bg-primary/20"
                      to="/{-$locale}/search"
                      search={{
                        tags: [genre.id],
                      }}
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </OverviewSection>
          <OverviewSection title={t("offerDetail.overview.ageRating")}>
            <Card className={OVERVIEW_CARD_CLASS}>
              <CardContent className="p-6">
                <div className="flex flex-row flex-wrap items-center justify-center gap-4">
                  {Object.entries(ageRating || {}).map(([key, rating]) => (
                    <div
                      className="rounded-xl border border-white/10 bg-background/50 p-4 w-fit max-w-72"
                      key={key}
                    >
                      <div className="flex flex-row items-center gap-3">
                        {rating.ratingImage && rating.ratingImage !== "" ? (
                          <img
                            key={key}
                            src={rating.ratingImage}
                            alt={key}
                            title={`${rating.title} - ${rating.gameRating}`}
                            className="size-14 mx-auto shrink-0"
                          />
                        ) : (
                          <div className="size-16 mx-auto shrink-0 inline-flex items-center justify-center rounded-xl border border-white/10 bg-muted/60">
                            <span className="font-display text-3xl font-bold tabular-nums">
                              {rating.ageControl}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <span className="text-base text-left font-bold">
                            {rating.ratingSystem} {rating.ageControl}
                          </span>
                          <span className="text-xs text-left text-muted-foreground">
                            {rating.descriptor?.split(",").join(", ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!ageRating && (
                    <div className="text-center text-sm text-muted-foreground">
                      {t("offerDetail.overview.noAgeRatings")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </OverviewSection>
          <OverviewSection title={t("offerDetail.overview.giveaways")} count={giveaways?.length}>
            <Card className={OVERVIEW_CARD_CLASS}>
              <CardContent className="p-6">
                <div className="flex flex-row flex-wrap items-center justify-center gap-3">
                  {giveaways?.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground">
                      {t("offerDetail.overview.noGiveaways")}
                    </div>
                  )}
                  {giveaways?.map((giveaway) => (
                    <div
                      key={giveaway._id}
                      className="inline-flex flex-row items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-200 tabular-nums"
                    >
                      <span>
                        {DateTime.fromISO(giveaway.startDate)
                          .setZone(timezone || "UTC")
                          .setLocale("en-GB")
                          .toLocaleString({
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                      </span>
                      <span className="text-emerald-300/60">-</span>
                      <span>
                        {DateTime.fromISO(giveaway.endDate)
                          .setZone(timezone || "UTC")
                          .setLocale("en-GB")
                          .toLocaleString({
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </OverviewSection>
          <OverviewSection title={t("offerDetail.overview.achievements")}>
            <Card className={cn(OVERVIEW_CARD_CLASS, "p-5")}>
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-row flex-wrap items-center justify-center gap-6 sm:gap-10">
                  {Object.entries(noOfAchievemenentsPerRarity ?? {}).map(([rarity, count]) => (
                    <div
                      key={rarity}
                      className="flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-center"
                    >
                      <EpicTrophyIcon
                        className={cn(
                          "size-6",
                          raritiesTextColors[rarity as keyof typeof raritiesTextColors],
                        )}
                      />
                      <span className="font-display text-xl font-bold tabular-nums">{count}</span>
                    </div>
                  ))}
                  {!isNotBaseGame && (
                    <>
                      <span className="text-2xl font-bold text-muted-foreground">{"="}</span>
                      <div className="flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-center">
                        <EpicTrophyIcon className={cn("size-8", raritiesTextColors.platinum)} />
                        <span className="font-display text-2xl font-bold tabular-nums">
                          {
                            achievements
                              ?.filter((set) => set.isBase)
                              .flatMap((set) => set.achievements ?? []).length
                          }
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {(totalXP ?? 0) > 250 && (
                  <>
                    <Separator orientation="horizontal" className="bg-border/60" />
                    <div className="flex flex-row items-center justify-center gap-10">
                      {/** Sum XP of all achievements */}
                      <div className="flex flex-col items-center justify-center gap-2 rounded-md px-4 text-center">
                        <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                          {totalXP} XP
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </OverviewSection>
          {hasOfferRequirements(requirements) && requirements && (
            <OverviewSection title={t("offerDetail.requirements.title")}>
              <Card className={OVERVIEW_CARD_CLASS}>
                <CardContent className="p-6">
                  <OfferRequirementsCard requirements={requirements} />
                </CardContent>
              </Card>
            </OverviewSection>
          )}
          {timeToBeat && (
            <OverviewSection
              title={t("offerDetail.overview.igdbTimeToBeat")}
              href={`https://www.igdb.com/games/${igdb?.slug}?utm_source=egdata.app`}
            >
              <Card className={OVERVIEW_CARD_CLASS}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="grid w-full grid-cols-3 divide-x divide-border/60">
                      <div className="flex flex-col items-center justify-center gap-1.5 px-2">
                        <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                          {formatTimeToHumanReadable(
                            timeToBeat.hastily ?? timeToBeat.hurriedly ?? 0,
                          )}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t("offerDetail.overview.hastily")}
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1.5 px-2">
                        <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                          {formatTimeToHumanReadable(timeToBeat.normally ?? 0)}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t("offerDetail.overview.normally")}
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1.5 px-2">
                        <span className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                          {formatTimeToHumanReadable(timeToBeat.completely ?? 0)}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {t("offerDetail.overview.completely")}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                      {t("offerDetail.overview.hltbSubmissions", { count: timeToBeat.count })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </OverviewSection>
          )}
        </OverviewColumn>
        <OverviewColumn>
          <OverviewSection title={t("offerDetail.overview.price")}>
            <Card className={OVERVIEW_CARD_CLASS}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-center justify-start gap-2.5 flex-wrap">
                    <span className="text-base sm:text-lg font-semibold text-muted-foreground">
                      {t("offerDetail.overview.priceCurrent")}
                    </span>
                    <PriceText price={getEffectivePrice(price?.current)} />
                    {priceFairness && <RegionalPricingBadge score={priceFairness} />}
                  </div>
                  <div className="flex items-center justify-start gap-2.5 flex-wrap">
                    <span className="text-base sm:text-lg font-semibold flex flex-row gap-1 items-center justify-start text-muted-foreground">
                      {t("offerDetail.overview.priceLowest")}
                    </span>
                    <PriceText price={price?.lowest} showDate />
                  </div>
                  <div className="flex items-center justify-start gap-2.5 flex-wrap">
                    <span className="text-base sm:text-lg font-semibold flex flex-row gap-1 items-center justify-start text-muted-foreground">
                      {t("offerDetail.overview.priceLastDiscount")}
                    </span>
                    <PriceText price={price?.lastDiscount} showDate />
                  </div>
                </div>
              </CardContent>
            </Card>
          </OverviewSection>
          <OverviewSection title={t("offerDetail.overview.hltbTitle")}>
            <Card className={OVERVIEW_CARD_CLASS}>
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-center gap-4">
                  <div
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-2 gap-6",
                      !hltb?.gameTimes.length && "md:grid-cols-1",
                      hltb?.gameTimes.length === 1 && "md:grid-cols-1",
                    )}
                  >
                    {hltb?.gameTimes.map((time) => (
                      <div key={time._id} className="text-center">
                        <div className="font-display text-2xl font-bold tracking-tight text-foreground mb-1 tabular-nums">
                          {time.time}
                        </div>
                        <div className="text-sm text-muted-foreground">{time.category}</div>
                      </div>
                    ))}
                    {!hltb?.gameTimes.length && (
                      <div className="text-center text-sm text-muted-foreground">
                        {t("offerDetail.overview.noGameTimes")}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </OverviewSection>
          <OverviewSection title={t("offerDetail.overview.epicRating")}>
            <Card className={OVERVIEW_CARD_CLASS}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-2.5">
                  <span className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums">
                    {reviews?.averageRating?.toFixed(1) ?? "0.0"}
                  </span>
                  <StarsRating rating={reviews?.averageRating ?? 0} />
                </div>
              </CardContent>
            </Card>
          </OverviewSection>
          {igdb && (
            <OverviewSection
              title={t("offerDetail.overview.igdbRating")}
              href={`https://www.igdb.com/games/${igdb?.slug}?utm_source=egdata.app`}
            >
              <Card className={OVERVIEW_CARD_CLASS}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <span className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums">
                      {((igdb?.total_rating ?? 0) / 20).toFixed(1)}
                    </span>
                    <StarsRating rating={(igdb?.total_rating ?? 0) / 20} />
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {t("offerDetail.overview.igdbReviews", {
                        count: igdb?.total_rating_count ?? 0,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </OverviewSection>
          )}
        </OverviewColumn>
      </div>
    </div>
  );
}

function OverviewColumn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 w-full max-w-4xl mx-auto px-1 sm:px-2">{children}</div>
  );
}

function OverviewSection({
  title,
  children,
  href,
  count,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  count?: number;
}) {
  return (
    <div className="flex flex-col w-full mt-1">
      <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {href ? (
            <Link
              to={href}
              className="underline decoration-dotted underline-offset-4 transition-colors hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        {typeof count === "number" && (
          <span className="rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PriceText({ price, showDate }: { price: Price | null | undefined; showDate?: boolean }) {
  const { locale } = useLocale();

  const isDiscounted = useMemo(() => {
    return price ? price.price.discount > 0 : false;
  }, [price]);

  const discountPercent = useMemo(() => {
    if (!price || price.price.originalPrice === 0) {
      return 0;
    }

    const discount =
      ((price.price.originalPrice - price.price.discountPrice) / price.price.originalPrice) * 100;

    return Math.round(discount);
  }, [price]);

  if (!price) {
    return <span className="text-muted-foreground tabular-nums">-</span>;
  }

  const fmtr = Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.price.currencyCode || "USD",
  });
  const isFree = (price.price.discountPrice ?? 0) === 0;
  const formattedPrice = fmtr.format(
    calculatePrice(price.price.discountPrice ?? 0, price.price.currencyCode),
  );

  return (
    <span className="inline-flex flex-row flex-wrap gap-2 items-center justify-start tabular-nums">
      {isFree ? (
        <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-0.5 text-base font-semibold text-emerald-300 tabular-nums">
          {formattedPrice}
        </span>
      ) : (
        <span
          className={cn(
            "font-display text-xl font-bold tabular-nums",
            isDiscounted ? "text-primary" : "text-foreground",
          )}
        >
          {formattedPrice}
        </span>
      )}
      {isDiscounted && (
        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
          -{discountPercent}%
        </span>
      )}
      {showDate && (
        <span className="text-xs sm:text-sm text-muted-foreground font-normal tabular-nums">
          (
          {DateTime.fromISO(price.updatedAt).setZone("UTC").setLocale("en-GB").toLocaleString({
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          )
        </span>
      )}
    </span>
  );
}
