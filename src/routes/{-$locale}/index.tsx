import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { getStats } from "@/queries/stats";
import {
  homeAchievementsQueryOptions,
  homeHistoricalLowsQueryOptions,
  homeLatestBuildsQueryOptions,
  homeLatestOffersQueryOptions,
  homeLatestReleasedQueryOptions,
  homePulseBaseQueryOptions,
  homePulseQueryOptions,
  homeTopSellersQueryOptions,
  homeUpcomingQueryOptions,
  type HomeBuild,
  type HomePulseChange,
} from "@/queries/home";
import { homeGiveawaysQueryOptions } from "@/queries/giveaways";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import type { JSX, ReactNode } from "react";
import { useMemo } from "react";
import { DateTime } from "luxon";
import { getGiveawaysStats, GiveawaysStats } from "@/components/modules/giveaway-stats";
import { cn } from "@/lib/utils";
import { calculatePrice } from "@/lib/calculate-price";
import { HoverCard, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button as AriaButton } from "react-aria-components";
import {
  Box,
  Clock,
  Gamepad2,
  Package,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Image } from "@/components/app/image";
import buildImageUrl, { buildSrcSet } from "@/lib/build-image-url";
import { getImage } from "@/lib/get-image";
import { getOfferOverview } from "@/queries/offer-overview";
import { formatTimeToHumanReadable } from "@/lib/time-to-human-readable";
import { Countdown } from "@/components/ui/countdown";
import { useSearch } from "@/hooks/use-search";
import { calculateSize } from "@/lib/calculate-size";
import { BuildTitle } from "@/components/app/build-title";
import { ClientBanner } from "@/components/modules/client-banner";
import { getRarity } from "@/lib/get-rarity";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { raritiesTextColors } from "@/components/app/achievement-card";
import { RenderTextPlatformIcon } from "@/components/app/platform-icons";
import { TruncatedText } from "@/lib/truncate-text";
import { timeAgo } from "@/lib/time-ago";
import { HistoricalLowsStrip } from "@/components/modules/historical-lows-strip";
import { useTranslation } from "@/lib/paraglide-react";
import type { TFunction } from "@/lib/paraglide-i18next";
import { getEffectivePrice } from "@/lib/effective-price";
import type { Price } from "@/types/price";

function formatCurrentPrice(price: Price | null | undefined, locale: string | undefined) {
  const effectivePrice = getEffectivePrice(price);
  const currencyCode = effectivePrice?.price.currencyCode ?? "USD";

  return Intl.NumberFormat(locale ?? "en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(calculatePrice(effectivePrice?.price.discountPrice ?? 0, currencyCode));
}

type LiveChangeAction = "insert" | "update" | "delete" | string;

type LiveChangeDelta = HomePulseChange["metadata"]["changes"][number];

type LiveChangeContext = NonNullable<HomePulseChange["metadata"]["context"]>;

type LiveChangeEvent = HomePulseChange;

type PulseEvent = {
  id: string;
  timestamp: string;
  contextType: string;
  action: LiveChangeAction;
  badge: string;
  title: string;
  detail: string;
  changeCount: number;
  imageUrl?: string;
};

export const Route = createFileRoute("/{-$locale}/")({
  component: RouteComponent,

  headers: () => ({
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  }),

  loader: async ({ context }) => {
    const { queryClient, country } = context;
    const pricingCountry = country ?? "US";

    await Promise.allSettled([
      queryClient.prefetchQuery(homeGiveawaysQueryOptions(pricingCountry)),
      queryClient.prefetchQuery(homeUpcomingQueryOptions(pricingCountry)),
      queryClient.prefetchQuery(homeLatestOffersQueryOptions(pricingCountry)),
      queryClient.prefetchQuery(homeLatestReleasedQueryOptions(pricingCountry)),
      queryClient.prefetchQuery({
        queryKey: ["stats", { country }],
        queryFn: () => getStats({ country: pricingCountry }),
      }),
      queryClient.prefetchQuery({
        queryKey: ["giveaways-stats", { country }],
        queryFn: () => getGiveawaysStats({ country: pricingCountry }),
      }),
      queryClient.prefetchQuery(homeHistoricalLowsQueryOptions(pricingCountry)),
      queryClient.prefetchQuery(homePulseBaseQueryOptions()),
      queryClient.prefetchQuery(homeLatestBuildsQueryOptions()),
    ]);
  },
});

function OfferHoverCard({ id }: { id: string }) {
  const { t } = useTranslation();
  const { country } = useCountry();
  const { locale } = useLocale();
  const { data, isLoading } = useQuery(getOfferOverview({ id, country }));

  if (!data || isLoading) return null;
  const price = getEffectivePrice(data.price);

  const formatPrice = (price: number, currencyCode: string) => {
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    });
    return fmt.format(calculatePrice(price, currencyCode));
  };

  const formatDate = (dateString: string) => {
    return DateTime.fromISO(dateString).setLocale("en-GB").toLocaleString(DateTime.DATE_MED);
  };

  const getAgeRatingDisplay = () => {
    if (!data.ageRating) return null;

    if ("rating" in data.ageRating) {
      return `${data.ageRating.ratingSystem}: ${data.ageRating.rating}`;
    }
    return data.ageRating.ratingSystem;
  };

  const discountPct =
    price && price.price.originalPrice > price.price.discountPrice && price.price.originalPrice > 0
      ? Math.round(
          ((price.price.originalPrice - price.price.discountPrice) / price.price.originalPrice) *
            100,
        )
      : 0;

  const hasExtras = Boolean(
    data.polls?.averageRating ||
    data.igdb?.total_rating ||
    data.igdb?.timeToBeat ||
    data.features.features.length > 0,
  );

  return (
    <div className="w-full h-fit overflow-hidden rounded-xl border border-white/10 bg-popover text-popover-foreground shadow-2xl shadow-black/50">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/40">
        <Image
          src={
            getImage(data.offer.keyImages, ["DieselGameBoxWide", "OfferImageWide"])?.url ??
            "/placeholder.webp"
          }
          alt={data.offer.title}
          width={320}
          height={180}
          className="size-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-popover via-popover/40 to-transparent"
          aria-hidden="true"
        />
        {discountPct > 0 && (
          <span className="absolute bottom-2 end-2 rounded-md bg-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground shadow-sm">
            -{discountPct}%
          </span>
        )}
      </div>

      <div className="space-y-3 p-4 pt-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-display font-bold leading-snug text-foreground line-clamp-2">
            {data.offer.title}
          </h3>
          {price && (
            <div className="shrink-0 text-right tabular-nums">
              {price.price.discountPrice === 0 ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  {t("common.free")}
                </span>
              ) : (
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-sm font-bold text-foreground">
                    {formatPrice(price.price.discountPrice, price.price.currencyCode)}
                  </span>
                  {price.price.originalPrice > price.price.discountPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(price.price.originalPrice, price.price.currencyCode)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <dl className="space-y-1 text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground/75">{t("home.offerHover.seller")}</dt>
            <dd className="truncate text-right">
              <Link
                to="/{-$locale}/sellers/$id"
                params={{ id: data.offer.seller.id }}
                className="font-medium text-foreground/90 transition-colors hover:text-primary"
              >
                {data.offer.seller.name}
              </Link>
            </dd>
          </div>
          {data.offer.developerDisplayName && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground/75">
                {t("home.offerHover.developer")}
              </dt>
              <dd className="truncate text-right">
                <Link
                  to="/{-$locale}/search"
                  search={{ developerDisplayName: data.offer.developerDisplayName }}
                  className="font-medium text-foreground/90 transition-colors hover:text-primary"
                >
                  {data.offer.developerDisplayName}
                </Link>
              </dd>
            </div>
          )}
          {data.offer.publisherDisplayName && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground/75">
                {t("home.offerHover.publisher")}
              </dt>
              <dd className="truncate text-right">
                <Link
                  to="/{-$locale}/search"
                  search={{ publisherDisplayName: data.offer.publisherDisplayName }}
                  className="font-medium text-foreground/90 transition-colors hover:text-primary"
                >
                  {data.offer.publisherDisplayName}
                </Link>
              </dd>
            </div>
          )}
          {data.offer.releaseDate && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground/75">
                {t("home.offerHover.releaseDate")}
              </dt>
              <dd className="tabular-nums text-foreground/85">
                {formatDate(data.offer.releaseDate)}
              </dd>
            </div>
          )}
          {getAgeRatingDisplay() && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="shrink-0 text-muted-foreground/75">
                {t("home.offerHover.ageRating")}
              </dt>
              <dd className="text-foreground/85">{getAgeRatingDisplay()}</dd>
            </div>
          )}
        </dl>

        {data.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.genres.slice(0, 4).map((genre) => (
              <Badge
                key={genre.id}
                variant="secondary"
                className="rounded-md bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-foreground/85"
              >
                {genre.name}
              </Badge>
            ))}
            {data.genres.length > 4 && (
              <Badge
                variant="outline"
                className="rounded-md border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {t("home.offerHover.moreGenres", { count: data.genres.length - 4 })}
              </Badge>
            )}
          </div>
        )}

        {hasExtras && (
          <div className="space-y-1.5 border-t border-border/50 pt-2.5 text-xs">
            {data.polls?.averageRating && (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Star className="size-3.5 text-amber-400" />
                  {t("home.offerHover.communityRating")}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {(data.polls.averageRating * 2 * 10).toFixed(1)}%
                </span>
              </div>
            )}
            {data.igdb?.total_rating && (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-flex size-4 items-center justify-center rounded bg-primary/15 text-[10px] font-bold tabular-nums text-primary">
                    {Math.round(data.igdb.total_rating)}
                  </span>
                  {t("home.offerHover.igdbScore")}
                </span>
                {data.igdb.total_rating_count && (
                  <span className="tabular-nums text-muted-foreground/80">
                    {t("home.offerHover.reviews", { count: data.igdb.total_rating_count })}
                  </span>
                )}
              </div>
            )}
            {data.igdb?.timeToBeat && (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5 text-muted-foreground/80" />
                  {t("home.offerHover.timeToBeat")}
                </span>
                <span className="tabular-nums text-foreground/90">
                  {data.igdb.timeToBeat.normally
                    ? formatTimeToHumanReadable(data.igdb.timeToBeat.normally)
                    : t("common.notAvailable")}
                </span>
              </div>
            )}
            {data.features.features.length > 0 && (
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground">
                  <Gamepad2 className="size-3.5 text-muted-foreground/80" />
                  {t("home.offerHover.features")}
                </span>
                <span className="truncate text-right text-foreground/85">
                  {data.features.features.slice(0, 2).join(", ")}
                  {data.features.features.length > 2 &&
                    t("home.offerHover.moreFeatures", {
                      count: data.features.features.length - 2,
                    })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BuildHoverCard({ id, builds }: { id: string; builds: HomeBuild[] }) {
  const { t } = useTranslation();
  const build = builds.find((b) => b._id === id);

  const gameImage =
    build &&
    getImage(build.item?.keyImages ?? [], [
      "OfferImageWide",
      "DieselStoreFrontWide",
      "horizontal",
      "DieselGameBoxWide",
      "DieselGameBox",
      "Thumbnail",
    ]);

  if (!build) return null;

  const displayUrl = gameImage?.url ?? "/placeholder.webp";

  return (
    <div className="w-80 overflow-hidden rounded-xl border border-white/10 bg-popover text-popover-foreground shadow-2xl shadow-black/50">
      {displayUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/40">
          <img
            src={buildImageUrl(displayUrl, 320)}
            srcSet={buildSrcSet(displayUrl, 320)}
            sizes="320px"
            alt={build.item?.title ?? t("home.buildHover.unknownBuild")}
            className="size-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-popover via-popover/40 to-transparent"
            aria-hidden="true"
          />
        </div>
      )}

      <div className="space-y-3 p-4 pt-2">
        <div>
          <h3 className="text-base font-display font-bold leading-snug text-foreground line-clamp-2">
            {build.item?.title ?? t("home.buildHover.unknownBuild")}
          </h3>
          {build.item?.developer && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {build.item?.developer ?? t("home.buildHover.unknownDeveloper")}
            </p>
          )}
        </div>

        <dl className="space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground/75">{t("home.buildHover.size")}</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {calculateSize(build.downloadSizeBytes)}
            </dd>
          </div>

          {build.buildVersion && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground/75">{t("home.buildHover.version")}</dt>
              <dd className="truncate font-medium tabular-nums text-foreground">
                {build.buildVersion}
              </dd>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground/75">{t("home.buildHover.created")}</dt>
            <dd className="tabular-nums text-foreground/85">
              {DateTime.fromISO(build.createdAt).toLocaleString(DateTime.DATE_SHORT)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-border/50 pt-2">
          <p className="truncate font-mono text-[11px] text-muted-foreground/70">
            {t("home.buildHover.id", { id: build._id })}
          </p>
        </div>
      </div>
    </div>
  );
}

type HoverCardType = "offer" | "build" | "none";

function renderHoverCard(type: HoverCardType, id: string) {
  switch (type) {
    case "offer":
      return <OfferHoverCard id={id} />;
    case "build":
      // Build hover cards should now be handled via the renderHoverCard prop
      return null;
    default:
      return null;
  }
}

function RouteComponent() {
  const { t } = useTranslation();
  const { timezone, locale } = useLocale();
  const { country } = useCountry();
  const { setFocus } = useSearch();
  const [
    freebiesQuery,
    upcomingQuery,
    latestGamesQuery,
    latestReleasedQuery,
    achievementsQuery,
    topSellersQuery,
    statsQuery,
    latestBuildsQuery,
  ] = useQueries({
    queries: [
      {
        ...homeGiveawaysQueryOptions(country),
        placeholderData: [],
      },
      {
        ...homeUpcomingQueryOptions(country),
        placeholderData: [],
      },
      {
        ...homeLatestOffersQueryOptions(country),
        placeholderData: [],
      },
      {
        ...homeLatestReleasedQueryOptions(country),
        placeholderData: [],
      },
      {
        ...homeAchievementsQueryOptions(country),
        placeholderData: [],
      },
      {
        ...homeTopSellersQueryOptions(country),
        placeholderData: [],
      },
      {
        queryKey: ["stats", { country }],
        queryFn: () => getStats({ country }),
        placeholderData: {
          offers: 0,
          trackedPriceChanges: 0,
          activeDiscounts: 0,
          giveaways: 0,
        },
      },
      {
        ...homeLatestBuildsQueryOptions(),
        placeholderData: [],
      },
    ],
  });
  const historicalLowsQuery = useQuery(homeHistoricalLowsQueryOptions(country));
  const liveChangelistQuery = useQuery(homePulseQueryOptions());
  const { data: giveawayOffers = [] } = freebiesQuery;
  const { data: latestOffers = [] } = latestGamesQuery;
  const { data: achievementOffers = [] } = achievementsQuery;
  const { data: topSellerOffers = [] } = topSellersQuery;
  const stats = statsQuery.data ?? {
    offers: 0,
    trackedPriceChanges: 0,
    activeDiscounts: 0,
    giveaways: 0,
  };
  const { data: latestBuilds = [] } = latestBuildsQuery;
  const { data: upcomingOfferRows = [] } = upcomingQuery;
  const { data: latestReleasedOfferRows = [] } = latestReleasedQuery;

  function formatDate(iso: string) {
    return DateTime.fromISO(iso)
      .setZone(timezone || "UTC")
      .toFormat("MMM d, HH:mm");
  }

  const SimpleTable = ({
    headers,
    rows,
    hoverCardType = "offer",
    renderHoverCard: customRenderHoverCard,
  }: {
    headers: (string | JSX.Element)[];
    rows: (string | number | JSX.Element)[][];
    hoverCardType?: HoverCardType;
    renderHoverCard?: (id: string) => JSX.Element | null;
  }) => {
    const visibleRows = rows.slice(0, 6);

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              {headers.map((h, index) => (
                <TableHead
                  key={typeof h === "string" ? h : `header-${index}`}
                  className="h-8 px-2 text-xs font-medium text-muted-foreground"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((c) => {
              const [id, ...cells] = c;

              const TableRowContent = (
                <TableRow className="border-b border-border/30 last:border-b-0 transition-colors hover:bg-card/80">
                  {cells.map((cell, j) => {
                    const headerKey =
                      typeof headers[j + 1] === "string" ? headers[j + 1] : `header-${j}`;
                    return (
                      <TableCell
                        key={`${id}-${headerKey}`}
                        className="py-2 px-2 text-sm tabular-nums whitespace-nowrap first:rounded-s-md last:rounded-e-md"
                      >
                        {cell}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );

              if (hoverCardType === "none") {
                return <div key={id as string}>{TableRowContent}</div>;
              }

              return (
                <HoverCardTrigger key={id as string} delay={300} closeDelay={200}>
                  {TableRowContent}
                  <HoverCard
                    placement="left top"
                    offset={5}
                    className="w-80 bg-transparent p-0 border-0"
                  >
                    {customRenderHoverCard
                      ? customRenderHoverCard(id as string)
                      : renderHoverCard(hoverCardType, id as string)}
                  </HoverCard>
                </HoverCardTrigger>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const Section = ({
    title,
    children,
    spanFull = false,
    href,
    search,
    params,
    className,
  }: {
    title: string;
    children: ReactNode;
    spanFull?: boolean;
    href?: string;
    search?: unknown;
    params?: Record<string, unknown>;
    className?: string;
  }) => (
    <section className={cn("flex flex-col", spanFull ? "lg:col-span-2" : "", className)}>
      <div className="mb-3 flex items-baseline justify-between border-b border-border/60 pb-2.5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {href ? (
            <Link
              to={href}
              search={search}
              params={params}
              className="transition-colors hover:text-primary"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
      </div>
      {children}
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-12 py-6 px-4 sm:px-6 lg:px-8">
      <SearchPulseHero
        onSearch={() => setFocus(true)}
        changes={liveChangelistQuery.data ?? []}
        isLoading={liveChangelistQuery.isLoading}
        isFetching={liveChangelistQuery.isFetching}
        isError={liveChangelistQuery.isError}
      />

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-6 py-2 md:grid-cols-4">
        <StatItem
          label={t("home.statsBar.offersTracked")}
          value={(stats.offers ?? 0).toLocaleString("en-UK")}
        />
        <StatItem
          label={t("home.statsBar.priceChanges72h")}
          value={(stats.trackedPriceChanges ?? 0).toLocaleString("en-UK")}
        />
        <StatItem
          label={t("home.statsBar.activeDiscounts")}
          value={(stats.activeDiscounts ?? 0).toLocaleString("en-UK")}
        />
        <StatItem
          label={t("home.statsBar.giveawaysToDate")}
          value={(stats.giveaways ?? 0).toLocaleString("en-UK")}
        />
      </div>

      {/* Free Games Showcase */}
      <Section title={t("home.sections.giveawayOffers")} href="/freebies">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {giveawayOffers.slice(0, 5).map((g) => {
            const coverUrl =
              getImage(g.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
              "/placeholder.webp";
            const startLabel = g.giveaway.startDate
              ? formatDate(g.giveaway.startDate)
              : t("common.notAvailable");
            const endLabel = g.giveaway.endDate
              ? formatDate(g.giveaway.endDate)
              : t("common.notAvailable");

            const PosterBody = (
              <>
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/10 bg-muted/40 transition-[box-shadow,border-color] duration-200 ease-out group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35 group-focus-visible:border-primary">
                  <img
                    src={buildImageUrl(coverUrl, 360, "medium")}
                    srcSet={buildSrcSet(coverUrl, 360, "medium")}
                    sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 46vw"
                    alt={g.title}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
                  />
                </div>
                <div className="mt-2.5 space-y-1">
                  {g.platforms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {g.platforms.map((p) =>
                        RenderTextPlatformIcon({
                          platform: p,
                          className: "size-4 text-muted-foreground",
                          key: `${p}-${g.id}`,
                        }),
                      )}
                    </div>
                  )}
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                    {g.title}
                  </h3>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {startLabel} – {endLabel}
                  </p>
                </div>
              </>
            );

            if (g.offers.length > 1) {
              return (
                <DialogTrigger key={`giveaway-poster-${g.id}`}>
                  <HoverCardTrigger delay={300} closeDelay={200}>
                    <AriaButton className="group flex w-full cursor-pointer flex-col text-start focus:outline-none">
                      {PosterBody}
                    </AriaButton>
                    <HoverCard
                      placement="bottom"
                      offset={8}
                      className="w-80 bg-transparent p-0 border-0"
                    >
                      <OfferHoverCard id={g.offers[0]?.id ?? g.id} />
                    </HoverCard>
                  </HoverCardTrigger>
                  <Dialog className="max-w-md z-[60]">
                    <DialogHeader>
                      <DialogTitle>{t("home.multipleOffers", { title: g.title })}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                      {g.offers.map((offer) => {
                        const offerPlatforms = (offer.items ?? []).flatMap((item) =>
                          (item.releaseInfo ?? []).flatMap((info) => info?.platform ?? []),
                        );
                        return (
                          <HoverCardTrigger key={offer.id}>
                            <Link
                              to="/{-$locale}/offers/$id"
                              params={{ id: offer.id }}
                              className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:border-primary/60"
                            >
                              <img
                                src={buildImageUrl(
                                  getImage(offer.keyImages, ["DieselGameBoxTall", "OfferImageTall"])
                                    ?.url ?? "/placeholder.webp",
                                  96,
                                  "low",
                                )}
                                alt={offer.title}
                                loading="lazy"
                                decoding="async"
                                className="h-16 w-12 rounded object-cover ring-1 ring-white/10"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground">{offer.title}</h4>
                                <div className="mt-1 flex gap-1">
                                  {offerPlatforms.map((platform, idx) =>
                                    RenderTextPlatformIcon({
                                      platform,
                                      className: "size-5 rounded-full bg-muted p-1",
                                      key: `${platform}-${offer.id}-${idx}`,
                                    }),
                                  )}
                                </div>
                              </div>
                            </Link>
                            <HoverCard
                              className="w-80 bg-transparent p-0 border-0"
                              placement="right"
                              offset={30}
                            >
                              <OfferHoverCard id={offer.id} />
                            </HoverCard>
                          </HoverCardTrigger>
                        );
                      })}
                    </div>
                  </Dialog>
                </DialogTrigger>
              );
            }

            return (
              <HoverCardTrigger key={`giveaway-poster-${g.id}`} delay={300} closeDelay={200}>
                <Link
                  to="/{-$locale}/offers/$id"
                  params={{ id: g.id }}
                  className="group flex flex-col text-start focus:outline-none"
                >
                  {PosterBody}
                </Link>
                <HoverCard
                  placement="bottom"
                  offset={8}
                  className="w-80 bg-transparent p-0 border-0"
                >
                  <OfferHoverCard id={g.id} />
                </HoverCard>
              </HoverCardTrigger>
            );
          })}
        </div>
      </Section>

      {/* Giveaways Stats Band */}
      <Section title={t("home.sections.giveawayStats")} href="/freebies">
        <GiveawaysStats showTitle={false} />
      </Section>

      <HistoricalLowsStrip
        offers={historicalLowsQuery.data ?? []}
        isLoading={historicalLowsQuery.isLoading}
        isError={historicalLowsQuery.isError}
      />

      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-10 lg:grid-cols-2">
        <Section
          title={t("home.sections.upcomingOffers")}
          href="/search"
          search={{
            sortBy: "upcoming",
          }}
        >
          <SimpleTable
            headers={[
              t("home.tableHeaders.hash"),
              t("home.tableHeaders.title"),
              t("home.tableHeaders.releaseDate"),
            ]}
            rows={upcomingOfferRows.slice(0, 6).map((o) => [
              o.id,
              <OfferThumb
                key={o.id}
                to="/{-$locale}/offers/$id"
                params={{ id: o.id }}
                url={getImage(o.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url}
                alt={o.title}
              />,
              <Link
                key={`upcoming-title-${o.id}`}
                to="/{-$locale}/offers/$id"
                params={{
                  id: o.id,
                }}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                <TruncatedText text={o.title ?? t("common.notAvailable")} maxLength={38} />
              </Link>,
              o.releaseDate
                ? (() => {
                    const release = DateTime.fromISO(o.releaseDate);
                    const now = DateTime.now();
                    if (release > now && release.diff(now, "hours").hours <= 24) {
                      return <Countdown targetDate={o.releaseDate} />;
                    }
                    return formatDate(o.releaseDate);
                  })()
                : t("common.notAvailable"),
            ])}
          />
        </Section>
        <Section
          title={t("home.sections.latestOffers")}
          href="/search"
          search={{
            sortBy: "creationDate",
          }}
        >
          <SimpleTable
            headers={[
              t("home.tableHeaders.hash"),
              t("home.tableHeaders.title"),
              t("home.tableHeaders.createdAt"),
              t("home.tableHeaders.price"),
            ]}
            rows={latestOffers.slice(0, 6).map((o) => [
              o.id,
              <OfferThumb
                key={o.id}
                to="/{-$locale}/offers/$id"
                params={{ id: o.id }}
                url={getImage(o.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url}
                alt={o.title}
              />,
              <Link
                key={`latest-title-${o.id}`}
                to="/{-$locale}/offers/$id"
                params={{
                  id: o.id,
                }}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                <TruncatedText text={o.title ?? t("common.notAvailable")} maxLength={34} />
              </Link>,
              o.creationDate ? formatDate(o.creationDate) : t("common.notAvailable"),
              formatCurrentPrice(o.price, locale),
            ])}
          />
        </Section>
        <Section
          title={t("home.sections.latestReleased")}
          href="/search"
          search={{
            sortBy: "releaseDate",
            sortDir: "desc",
          }}
        >
          <SimpleTable
            headers={[
              t("home.tableHeaders.hash"),
              t("home.tableHeaders.date"),
              t("home.tableHeaders.title"),
              t("home.tableHeaders.price"),
            ]}
            rows={latestReleasedOfferRows.slice(0, 6).map((u) => [
              u.id,
              <OfferThumb
                key={u.id}
                to="/{-$locale}/offers/$id"
                params={{ id: u.id }}
                url={getImage(u.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url}
                alt={u.title}
              />,
              u.releaseDate
                ? (() => {
                    const release = DateTime.fromISO(u.releaseDate);
                    const now = DateTime.now();
                    if (release > now && release.diff(now, "hours").hours <= 24) {
                      return <Countdown targetDate={u.releaseDate} />;
                    }
                    return formatDate(u.releaseDate);
                  })()
                : t("common.notAvailable"),
              <Link
                key={`upcoming-title-${u.id}`}
                to="/{-$locale}/offers/$id"
                params={{
                  id: u.id,
                }}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                <TruncatedText text={u.title ?? t("common.notAvailable")} maxLength={34} />
              </Link>,
              formatCurrentPrice(u.price, locale),
            ])}
          />
        </Section>
        <Section
          title={t("home.sections.latestOffersWithAchievements")}
          href="/search"
          search={{
            tags: ["19847"],
          }}
        >
          <SimpleTable
            headers={[
              t("home.tableHeaders.hash"),
              t("home.tableHeaders.title"),
              <span className="flex flex-col items-center justify-center" key="bronze-header">
                <EpicTrophyIcon className={cn("size-4", raritiesTextColors.bronze)} />
              </span>,
              <span className="flex flex-col items-center justify-center" key="silver-header">
                <EpicTrophyIcon className={cn("size-4", raritiesTextColors.silver)} />
              </span>,
              <span className="flex flex-col items-center justify-center" key="gold-header">
                <EpicTrophyIcon className={cn("size-4", raritiesTextColors.gold)} />
              </span>,
            ]}
            rows={achievementOffers.slice(0, 6).map((a) => {
              const noOfAchievementsPerRarity = a.achievements.achievements.reduce(
                (acc, achievement) => {
                  const rarity = getRarity(achievement.xp);
                  acc[rarity] = (acc[rarity] || 0) + 1;
                  return acc;
                },
                {} as { [key: string]: number },
              );

              return [
                a.id,
                <OfferThumb
                  key={a.id}
                  to="/{-$locale}/offers/$id"
                  params={{ id: a.id }}
                  url={getImage(a.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url}
                  alt={a.title}
                />,
                <Link
                  key={`achievement-title-${a.id}`}
                  to="/{-$locale}/offers/$id"
                  params={{
                    id: a.id,
                  }}
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  <TruncatedText text={a.title ?? t("common.notAvailable")} maxLength={34} />
                </Link>,
                <p key={`achievement-bronze-${a.id}`} className="text-center tabular-nums">
                  {noOfAchievementsPerRarity.bronze || 0}
                </p>,
                <p key={`achievement-silver-${a.id}`} className="text-center tabular-nums">
                  {noOfAchievementsPerRarity.silver || 0}
                </p>,
                <p key={`achievement-gold-${a.id}`} className="text-center tabular-nums">
                  {noOfAchievementsPerRarity.gold || 0}
                </p>,
              ];
            })}
          />
        </Section>
        <Section
          title={t("home.sections.topSellingOffers")}
          href="/collections/$id"
          params={{
            id: "top-sellers",
          }}
        >
          <SimpleTable
            headers={[
              t("home.tableHeaders.pos"),
              t("home.tableHeaders.dash"),
              t("home.tableHeaders.title"),
              <span
                key="trend-up-top-sellers"
                className="w-full flex flex-col items-center justify-center"
              >
                <TrendingUp className="size-4" />
              </span>,
            ]}
            rows={topSellerOffers.slice(0, 6).map((t, i) => [
              t.id,
              <span
                key={`topseller-pos-${t.id}`}
                className="font-medium tabular-nums text-muted-foreground"
              >
                {i + 1}
              </span>,
              <OfferThumb
                key={t.id}
                to="/{-$locale}/offers/$id"
                params={{ id: t.id }}
                url={getImage(t.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url}
                alt={t.title}
              />,
              <Link
                key={`topseller-title-${t.id}`}
                to="/{-$locale}/offers/$id"
                params={{
                  id: t.id,
                }}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                <TruncatedText text={t.title} maxLength={36} />
              </Link>,
              <p key={`topseller-price-${t.id}`} className="text-center tabular-nums">
                {t.previousPosition - t.position === 0 ? "-" : t.previousPosition - t.position}
              </p>,
            ])}
          />
        </Section>
        <Section title={t("home.sections.latestBuilds")}>
          <SimpleTable
            headers={[
              t("home.tableHeaders.hash"),
              t("home.tableHeaders.title"),
              t("home.tableHeaders.size"),
              t("home.tableHeaders.creationDate"),
            ]}
            rows={latestBuilds
              .slice(0, 6)
              .map((b) => [
                b._id,
                <OfferThumb
                  key={b._id}
                  to="/{-$locale}/builds/$id"
                  params={{ id: b._id }}
                  url={
                    getImage(b.item?.keyImages ?? [], ["DieselGameBoxTall", "OfferImageTall"])?.url
                  }
                  alt={b.item?.title ?? t("home.buildHover.unknownBuild")}
                />,
                <BuildTitle
                  key={b._id}
                  id={b._id}
                  title={b.item?.title ?? t("home.buildHover.unknownBuild")}
                  buildVersion={b.buildVersion}
                  maxTitleLength={20}
                />,
                calculateSize(b.downloadSizeBytes),
                formatDate(b.createdAt),
              ])}
            hoverCardType="build"
            renderHoverCard={(id) => <BuildHoverCard id={id} builds={latestBuilds} />}
          />
        </Section>
      </div>
      <ClientBanner />
    </main>
  );
}

function OfferThumb({
  url,
  alt,
  to,
  params,
}: {
  url: string | undefined;
  alt: string;
  to: "/{-$locale}/offers/$id" | "/{-$locale}/builds/$id";
  params: { id: string };
}) {
  return (
    <Link
      to={to}
      params={params}
      className="block h-12 w-9 shrink-0 overflow-hidden rounded bg-muted/40 shadow-sm ring-1 ring-white/10"
    >
      <img
        src={buildImageUrl(url ?? "/placeholder.webp", 80, "low")}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </Link>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start text-start">
      <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
        {value}
      </span>
      <span className="mt-1 text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function SearchPulseHero({
  onSearch,
  changes,
  isLoading,
  isFetching,
  isError,
}: {
  onSearch: () => void;
  changes: LiveChangeEvent[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();
  const chips: {
    label: string;
    to: string;
    search?: unknown;
    params?: Record<string, unknown>;
  }[] = [
    {
      label: t("home.hero.justReleased"),
      to: "/{-$locale}/search",
      search: { sortBy: "releaseDate", sortDir: "desc" },
    },
    { label: t("home.hero.priceDrops72h"), to: "/{-$locale}/sales" },
    {
      label: t("home.hero.hasAchievements"),
      to: "/{-$locale}/search",
      search: { tags: ["19847"] },
    },
    { label: t("home.hero.upcoming"), to: "/{-$locale}/search", search: { sortBy: "upcoming" } },
    {
      label: t("home.hero.topSellers"),
      to: "/{-$locale}/collections/$id",
      params: { id: "top-sellers" },
    },
  ];

  const events = useMemo(
    () =>
      changes
        .filter((change) => change.metadata?.changes?.length)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6)
        .map((change) => normalizePulseEvent(change, t)),
    [changes, t],
  );

  return (
    <section className="grid grid-cols-1 items-center gap-8 border-b border-border/50 pb-8 pt-2 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 flex flex-col justify-center" data-testid="hero-content">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
          egdata.app
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
          {t("home.hero.subtitle")}
        </p>

        <button
          type="button"
          onClick={onSearch}
          className="mt-6 inline-flex w-full max-w-xl cursor-pointer items-center gap-3 rounded-full border border-border bg-card/80 px-5 py-3 text-start text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">{t("home.hero.searchPlaceholder")}</span>
        </button>

        <div className="mt-4 flex max-w-xl flex-wrap gap-2" data-testid="hero-quick-links">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              to={chip.to}
              search={chip.search}
              params={chip.params}
              className="inline-flex items-center whitespace-nowrap rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="min-w-0" data-testid="hero-pulse-panel">
        <AmbientPulsePanel
          events={events}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
        />
      </div>
    </section>
  );
}

function AmbientPulsePanel({
  events,
  isLoading,
  isFetching,
}: {
  events: PulseEvent[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          {t("home.pulse.recentActivity")}
        </span>
        {isFetching && !isLoading && (
          <RefreshCw className="size-3.5 animate-spin text-muted-foreground/60" />
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {isLoading || events.length === 0
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are positional placeholders
                key={index}
                className="flex items-center gap-2.5"
              >
                <div className="size-7 shrink-0 rounded bg-muted/40 animate-pulse" />
                <div className="h-3.5 flex-1 rounded bg-muted/30 animate-pulse" />
              </div>
            ))
          : events.slice(0, 5).map((event) => <PulseChangeRow key={event.id} event={event} />)}
      </div>
    </div>
  );
}

function PulseChangeRow({ event }: { event: PulseEvent }) {
  const { t } = useTranslation();
  const Icon = getPulseIcon(event.contextType, event.action);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/50 ring-1 ring-white/10">
        {event.imageUrl ? (
          <img
            src={buildImageUrl(event.imageUrl, 80, "low")}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <Icon className="size-3.5 text-muted-foreground" />
        )}
      </div>

      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground/90">
        {event.title}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {t(`home.pulse.badge.${event.badge}`, { defaultValue: event.badge.toLowerCase() })}
      </span>
      <span
        suppressHydrationWarning
        className="shrink-0 text-xs tabular-nums text-muted-foreground/75"
      >
        {timeAgo(new Date(event.timestamp))}
      </span>
    </div>
  );
}

function normalizePulseEvent(change: LiveChangeEvent, t: TFunction): PulseEvent {
  const primaryChange = getPrimaryChange(change.metadata.changes);
  const contextType = change.metadata.contextType || "change";
  const action = primaryChange?.changeType ?? "update";

  return {
    id: change._id,
    timestamp: change.timestamp,
    contextType,
    action,
    badge: getPulseBadge(contextType, action),
    title: getPulseTitle(change, t),
    detail: getPulseDetail(change, primaryChange, t),
    changeCount: change.metadata.changes.length,
    imageUrl: getPulseImageUrl(change.metadata.context),
  };
}

function getPrimaryChange(changes: LiveChangeDelta[]) {
  const lowSignalFields = new Set(["createdAt", "updatedAt", "lastModifiedDate"]);
  return changes.find((change) => !lowSignalFields.has(change.field)) ?? changes[0];
}

function getPulseTitle(change: LiveChangeEvent, t: TFunction) {
  const { context, contextId, contextType } = change.metadata;
  const title = context?.title?.trim();

  if (title) return title;

  if (contextType === "build") {
    if (context?.buildVersion)
      return t("home.pulse.title.buildVersion", { version: context.buildVersion });
    if (context?.appName) return t("home.pulse.title.buildId", { id: shortId(context.appName) });
  }

  if (contextType === "achievements") {
    return t("home.pulse.title.achievementsId", { id: shortId(contextId) });
  }

  return context?.name || context?.id || shortId(contextId);
}

function getPulseDetail(
  change: LiveChangeEvent,
  primaryChange: LiveChangeDelta | undefined,
  t: TFunction,
) {
  const { changes, contextType } = change.metadata;
  const action = primaryChange?.changeType ?? "update";
  const field = primaryChange?.field ?? "record";
  const verb = t(`home.pulse.actionVerb.${getActionVerb(action)}`);

  if (contextType === "build") {
    return action === "insert"
      ? t("home.pulse.detail.newBuildIndexed")
      : t("home.pulse.detail.buildManifestRefreshed");
  }

  if (contextType === "achievements") {
    return t("home.pulse.detail.achievementChanges", {
      count: changes.length,
      entry: t(`home.pulse.entry`, { count: changes.length }),
      verb,
    });
  }

  if (contextType === "offer" && field === "lastModifiedDate") {
    return t("home.pulse.detail.offerMetadataRefreshed");
  }

  if (changes.length > 1) {
    return t("home.pulse.detail.fieldsChanged", {
      count: changes.length,
      verb,
    });
  }

  return t("home.pulse.detail.fieldChanged", {
    field: formatChangeField(field),
    verb,
  });
}

function getPulseImageUrl(context: LiveChangeContext | null | undefined) {
  if (!context?.keyImages?.length) return undefined;

  const image = getImage(context.keyImages, [
    "Thumbnail",
    "OfferImageTall",
    "DieselGameBoxTall",
    "OfferImageWide",
    "DieselStoreFrontWide",
  ]);

  return image?.url === "/placeholder.webp" ? undefined : image?.url;
}

function getPulseBadge(contextType: string, action: LiveChangeAction) {
  if (action === "insert") return "new";
  if (action === "delete") return "gone";

  switch (contextType) {
    case "offer":
      return "offer";
    case "build":
      return "build";
    case "item":
      return "item";
    case "asset":
      return "asset";
    case "achievements":
      return "xp";
    case "sandbox":
      return "sandbox";
    default:
      return "change";
  }
}

function getActionVerb(action: LiveChangeAction) {
  switch (action) {
    case "insert":
      return "added";
    case "delete":
      return "removed";
    case "update":
      return "updated";
    default:
      return "changed";
  }
}

function formatChangeField(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function getPulseIcon(contextType: string, action: LiveChangeAction) {
  if (action === "insert") return Sparkles;
  if (action === "delete") return Zap;

  switch (contextType) {
    case "build":
      return Package;
    case "offer":
      return Tag;
    case "achievements":
      return Trophy;
    case "item":
      return Box;
    default:
      return Radio;
  }
}
