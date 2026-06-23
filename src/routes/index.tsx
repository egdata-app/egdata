import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { httpClient } from "@/lib/http-client";
import { getUpcoming } from "@/queries/upcoming";
import { getLatestOffers } from "@/queries/latest-offers";
import { getLatestReleased } from "@/queries/latest-released";
import { getOffersWithAchievements } from "@/queries/offers-with-achievements";
import { getStats } from "@/queries/stats";
import { getTopSellers } from "@/queries/top-sellers";
import type { GiveawayOffer } from "@/types/giveaways";
import type { KeyImage } from "@/types/single-offer";
import type { SingleItem } from "@/types/single-item";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, type LinkComponentProps } from "@tanstack/react-router";
import type { JSX, ReactNode } from "react";
import { useMemo } from "react";
import { DateTime } from "luxon";
import { getGiveawaysStats, GiveawaysStats } from "@/components/modules/giveaway-stats";
import { cn } from "@/lib/utils";
import { calculatePrice } from "@/lib/calculate-price";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Box,
  Package,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
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
import { getBuilds } from "@/queries/get-builds";
import { calculateSize } from "@/lib/calculate-size";
import { BuildTitle } from "@/components/app/build-title";
import { ClientBanner } from "@/components/modules/client-banner";
import { getRarity } from "@/lib/get-rarity";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { raritiesTextColors } from "@/components/app/achievement-card";
import { mergeFreebies } from "@/utils/merge-freebies";
import { RenderTextPlatformIcon } from "@/components/app/platform-icons";
import { TruncatedText } from "@/lib/truncate-text";
import { timeAgo } from "@/lib/time-ago";

type LiveChangeAction = "insert" | "update" | "delete" | string;

type LiveChangeDelta = {
  changeType: LiveChangeAction;
  field: string;
  newValue: unknown;
  oldValue: unknown;
};

type LiveChangeContext = {
  _id?: string;
  id?: string;
  namespace?: string;
  title?: string;
  keyImages?: KeyImage[];
  offerType?: string;
  appName?: string;
  buildVersion?: string;
  name?: string;
};

type LiveChangeEvent = {
  _id: string;
  timestamp: string;
  metadata: {
    changes: LiveChangeDelta[];
    contextId: string;
    contextType: string;
    context?: LiveChangeContext | null;
  };
  __v?: number;
};

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

const liveChangelistBaseQueryOptions = () => ({
  queryKey: ["changelist", "home-pulse"] as const,
  queryFn: () =>
    httpClient.get<LiveChangeEvent[]>("/changelist", {
      params: {
        limit: 12,
      },
    }),
  staleTime: 10_000,
});

const liveChangelistQueryOptions = () => ({
  ...liveChangelistBaseQueryOptions(),
  placeholderData: [] as LiveChangeEvent[],
  refetchInterval: 25_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  retry: 1,
});

export const Route = createFileRoute("/")({
  component: RouteComponent,

  headers: () => ({
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
  }),

  loader: async ({ context }) => {
    const { queryClient, country } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["giveaways"],
        queryFn: () =>
          httpClient
            .get<GiveawayOffer[]>("/free-games", {
              params: {
                country,
              },
            })
            .then(mergeFreebies)
            .catch(() => []),
      }),
      queryClient.prefetchQuery({
        queryKey: ["upcoming", { country }],
        queryFn: () => getUpcoming({ country: country ?? "US" }).catch(() => null),
        staleTime: 6000,
      }),
      queryClient.prefetchQuery({
        queryKey: ["latest-games"],
        queryFn: () => getLatestOffers(country ?? "US").catch(() => []),
      }),
      queryClient.prefetchQuery({
        queryKey: ["latest-released", { country }],
        queryFn: () =>
          getLatestReleased({ country: country ?? "US" }).catch(() => ({ elements: [] })),
      }),
      queryClient.prefetchQuery({
        queryKey: ["stats", { country }],
        queryFn: () => getStats({ country: country ?? "US" }).catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: ["giveaways-stats", { country }],
        queryFn: () => getGiveawaysStats({ country: country ?? "US" }).catch(() => null),
      }),
      queryClient.prefetchQuery(liveChangelistBaseQueryOptions()),
      queryClient.prefetchQuery(getBuilds({ sortDir: "desc", sortBy: "createdAt" })),
    ]);
  },
});

function OfferHoverCard({ id }: { id: string }) {
  const { country } = useCountry();
  const { locale } = useLocale();
  const { data, isLoading } = useQuery(getOfferOverview({ id, country }));

  if (!data || isLoading) return null;

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

  return (
    <div className="bg-card border border-border/60 text-card-foreground p-4 space-y-3 w-full h-fit rounded-md">
      <div>
        <Image
          src={
            getImage(data.offer.keyImages, ["DieselGameBoxWide", "OfferImageWide"])?.url ??
            "/placeholder.webp"
          }
          alt={data.offer.title}
          width={300}
          height={168}
          className="rounded-md object-cover"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-display font-bold text-foreground">{data.offer.title}</h3>
        {data.price && (
          <div className="text-right">
            {data.price.price.discountPrice === 0 ? (
              <span className="text-primary font-bold">Free</span>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-foreground font-bold">
                  {formatPrice(data.price.price.discountPrice, data.price.price.currencyCode)}
                </span>
                {data.price.price.originalPrice > data.price.price.discountPrice && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(data.price.price.originalPrice, data.price.price.currencyCode)}
                    </span>
                    <Badge
                      variant="default"
                      className="text-xs px-1 py-0 bg-primary text-primary-foreground"
                    >
                      -
                      {Math.round(
                        ((data.price.price.originalPrice - data.price.price.discountPrice) /
                          data.price.price.originalPrice) *
                          100,
                      )}
                      %
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-sm space-y-1 text-muted-foreground">
        <p>
          <span className="text-muted-foreground/70">Seller:</span>{" "}
          <Link
            to="/sellers/$id"
            params={{
              id: data.offer.seller.id,
            }}
            className="text-primary hover:underline"
          >
            {data.offer.seller.name}
          </Link>
        </p>
        {data.offer.developerDisplayName && (
          <p>
            <span className="text-muted-foreground/70">Developer:</span>{" "}
            <Link
              to="/search"
              search={{
                developerDisplayName: data.offer.developerDisplayName,
              }}
              className="text-primary hover:underline"
            >
              {data.offer.developerDisplayName}
            </Link>
          </p>
        )}
        {data.offer.publisherDisplayName && (
          <p>
            <span className="text-muted-foreground/70">Publisher:</span>{" "}
            <Link
              to="/search"
              search={{
                publisherDisplayName: data.offer.publisherDisplayName,
              }}
              className="text-primary hover:underline"
            >
              {data.offer.publisherDisplayName}
            </Link>
          </p>
        )}
        {data.offer.releaseDate && (
          <p>
            <span className="text-muted-foreground/70">Release Date:</span>{" "}
            {formatDate(data.offer.releaseDate)}
          </p>
        )}
        {getAgeRatingDisplay() && (
          <p>
            <span className="text-muted-foreground/70">Age Rating:</span> {getAgeRatingDisplay()}
          </p>
        )}
      </div>

      {data.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.genres.slice(0, 4).map((genre) => (
            <Badge
              key={genre.id}
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary"
            >
              <Sparkles className="w-3 h-3 mr-1.5 text-primary" />
              {genre.name}
            </Badge>
          ))}
          {data.genres.length > 4 && (
            <Badge variant="outline" className="border-border/50 bg-muted/20 text-muted-foreground">
              +{data.genres.length - 4} more
            </Badge>
          )}
        </div>
      )}

      <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm">
        {data.polls?.averageRating && (
          <div className="flex items-center gap-2">
            <span>🤯</span>
            <span className="text-muted-foreground">Community Rating:</span>
            <span className="font-bold text-primary">
              {(data.polls.averageRating * 2 * 10).toFixed(1)}%
            </span>
          </div>
        )}
        {data.igdb && (
          <>
            {data.igdb.total_rating && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-primary rounded-sm flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {Math.round(data.igdb.total_rating)}
                </div>
                <span className="text-muted-foreground">IGDB Score</span>
                {data.igdb.total_rating_count && (
                  <span className="text-muted-foreground/70 text-xs">
                    • {data.igdb.total_rating_count} reviews
                  </span>
                )}
              </div>
            )}
            {data.igdb.timeToBeat && (
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span className="text-muted-foreground">Time to Beat:</span>
                <span className="text-foreground/80">
                  {data.igdb.timeToBeat.normally
                    ? formatTimeToHumanReadable(data.igdb.timeToBeat.normally)
                    : "N/A"}
                </span>
              </div>
            )}
          </>
        )}
        {data.features.features.length > 0 && (
          <div className="flex items-center gap-2">
            <span>🎮</span>
            <span className="text-muted-foreground">Features:</span>
            <span className="text-foreground/80">
              {data.features.features.slice(0, 2).join(", ")}
              {data.features.features.length > 2 && ` +${data.features.features.length - 2} more`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function BuildHoverCard({
  id,
  builds,
}: {
  id: string;
  builds: Array<{
    _id: string;
    item: SingleItem;
    downloadSizeBytes: number;
    createdAt: string;
    buildVersion?: string;
  }>;
}) {
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
    <div className="bg-gradient-to-br from-card to-background border border-border/60 text-card-foreground border rounded-md shadow-xl overflow-hidden w-80">
      {displayUrl && (
        <div className="w-full h-44 flex-shrink-0 relative">
          <img
            src={buildImageUrl(displayUrl, 320)}
            srcSet={buildSrcSet(displayUrl, 320)}
            sizes="320px"
            alt={build.item?.title ?? "Unknown Build"}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-display font-bold text-foreground leading-tight line-clamp-2">
            {build.item?.title ?? "Unknown Build"}
          </h3>
          {build.item?.developer && (
            <p className="text-sm text-muted-foreground mt-1">
              {build.item?.developer ?? "Unknown Developer"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Size</span>
            <span className="text-sm font-medium text-foreground">
              {calculateSize(build.downloadSizeBytes)}
            </span>
          </div>

          {build.buildVersion && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Version</span>
              <span className="text-sm font-medium text-foreground">{build.buildVersion}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Created</span>
            <span className="text-xs text-foreground/80">
              {DateTime.fromISO(build.createdAt).toLocaleString(DateTime.DATE_SHORT)}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground/70 font-mono truncate">ID: {build._id}</p>
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
        queryKey: ["giveaways"],
        queryFn: () =>
          httpClient
            .get<GiveawayOffer[]>("/free-games", {
              params: {
                country,
              },
            })
            .then(mergeFreebies),
        placeholderData: [],
      },
      {
        queryKey: ["upcoming", { country }],
        queryFn: () => getUpcoming({ country }),
        placeholderData: { elements: [] },
      },
      {
        queryKey: ["latest-games"],
        queryFn: () => getLatestOffers(country),
        placeholderData: [],
      },
      {
        queryKey: ["latest-released", { country }],
        queryFn: () => getLatestReleased({ country }),
        placeholderData: { elements: [] },
      },
      {
        queryKey: ["offers-with-achievements", { country }],
        queryFn: () => getOffersWithAchievements(country),
        placeholderData: [],
      },
      {
        queryKey: ["top-sellers", { country }],
        queryFn: () => getTopSellers(country),
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
        ...getBuilds({
          sortDir: "desc",
          sortBy: "createdAt",
        }),
        placeholderData: [],
      },
    ],
  });
  const liveChangelistQuery = useQuery(liveChangelistQueryOptions());
  const { data: giveawayOffers = [] } = freebiesQuery;
  const { data: upcomingOffers = { elements: [] } } = upcomingQuery;
  const { data: latestOffers = [] } = latestGamesQuery;
  const { data: latestReleasedOffers = { elements: [] } } = latestReleasedQuery;
  const { data: achievementOffers = [] } = achievementsQuery;
  const { data: topSellerOffers = [] } = topSellersQuery;
  const {
    data: stats = {
      offers: 0,
      trackedPriceChanges: 0,
      activeDiscounts: 0,
      giveaways: 0,
    },
  } = statsQuery;
  const { data: latestBuilds = [] } = latestBuildsQuery;

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
    const TableContent = (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h, index) => (
                <TableHead
                  key={typeof h === "string" ? h : `header-${index}`}
                  className="text-muted-foreground font-normal"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const [id, ...cells] = c;
              const isElement = (cell: string | number | JSX.Element) =>
                typeof cell === "object" && "props" in cell;
              const isImage = (cell: string | number | JSX.Element) =>
                isElement(cell) &&
                typeof cell === "object" &&
                "type" in cell &&
                cell.type === Image;

              const TableRowContent = (
                <TableRow className="border-border/40 hover:bg-primary/5">
                  {cells.map((cell, j) => {
                    const headerKey =
                      typeof headers[j + 1] === "string" ? headers[j + 1] : `header-${j}`;
                    return (
                      <TableCell
                        key={`${id}-${headerKey}`}
                        className={cn(
                          "whitespace-nowrap text-sm",
                          isImage(cell) && "w-16 sm:w-32",
                          isElement(cell) && !isImage(cell) && "p-0",
                        )}
                      >
                        {isImage(cell) ? (
                          <div className="flex items-center justify-start">
                            <div className="w-16 h-8 sm:w-24 sm:h-12 rounded overflow-hidden bg-muted/40 flex items-center justify-center">
                              {cell}
                            </div>
                          </div>
                        ) : (
                          cell
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );

              if (hoverCardType === "none") {
                return <div key={id as string}>{TableRowContent}</div>;
              }

              return (
                <HoverCard key={id as string} openDelay={300} closeDelay={200}>
                  <HoverCardTrigger asChild>{TableRowContent}</HoverCardTrigger>
                  <HoverCardContent
                    side="left"
                    align="start"
                    sideOffset={5}
                    className="w-80 bg-transparent p-0 border-0"
                  >
                    {customRenderHoverCard
                      ? customRenderHoverCard(id as string)
                      : renderHoverCard(hoverCardType, id as string)}
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );

    return TableContent;
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
    href?: LinkComponentProps["to"];
    search?: LinkComponentProps["search"];
    params?: LinkComponentProps["params"];
    className?: string;
  }) => (
    <Card
      className={cn(
        "flex flex-col rounded-md border border-border/60 h-[650px] bg-card/40 backdrop-blur-sm",
        spanFull ? "md:col-span-2" : "",
        className,
      )}
    >
      <CardHeader className="border-b border-border/50 p-3">
        <CardTitle className="text-sm font-display font-semibold text-muted-foreground tracking-tight">
          {href ? (
            <Link
              to={href}
              search={search}
              params={params}
              className="underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea
          className={cn("h-[650px] p-4", className?.includes("h-[400px]") && "h-[400px]")}
        >
          {children}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 py-6 px-4 sm:px-6 lg:px-8">
      <SearchPulseHero
        onSearch={() => setFocus(true)}
        changes={liveChangelistQuery.data ?? []}
        isLoading={liveChangelistQuery.isLoading}
        isFetching={liveChangelistQuery.isFetching}
        isError={liveChangelistQuery.isError}
      />

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-3 border-y border-border/40 rounded-md bg-card/30 px-4">
        <StatItem label="Offers Tracked" value={stats.offers.toLocaleString("en-UK")} />
        <StatDivider />
        <StatItem
          label="Price Changes / 72h"
          value={stats.trackedPriceChanges.toLocaleString("en-UK")}
        />
        <StatDivider />
        <StatItem label="Active Discounts" value={stats.activeDiscounts.toLocaleString("en-UK")} />
        <StatDivider />
        <StatItem label="Giveaways to Date" value={stats.giveaways.toLocaleString("en-UK")} />
      </div>

      {/* First row - shorter sections */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Giveaways Stats Section */}
        <Section title="Giveaway Stats" href="/freebies" className="h-[400px]">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-full flex items-center justify-center h-[300px]">
              <GiveawaysStats showTitle={false} wrap />
            </div>
          </div>
        </Section>
        <Section title="Giveaway Offers" href="/freebies" className="h-[400px]">
          <SimpleTable
            headers={["#", "Title", "Starts", "Ends"]}
            rows={giveawayOffers.slice(0, 5).map((g) => [
              g.offers.map((o) => o.id).join(":"),
              <Link
                key={`feebies-image-${g.id}`}
                to="/offers/$id"
                params={{
                  id: g.id,
                }}
                className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
              >
                <img
                  src={buildImageUrl(
                    getImage(g.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
                      "/placeholder.webp",
                    80,
                    "low",
                  )}
                  alt={g.title}
                  loading="lazy"
                  decoding="async"
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              g.offers.length > 1 ? (
                <Dialog key={`feebies-dialog-${g.id}`}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-col items-start justify-center text-left hover:text-primary transition-colors"
                    >
                      <TruncatedText text={g.title} maxLength={35} />
                      <p className="inline-flex gap-1">
                        {g.platforms.map((p) =>
                          RenderTextPlatformIcon({
                            platform: p,
                            className: "size-5 rounded-full p-1 bg-muted",
                            key: `${p}-${g.id}`,
                          }),
                        )}
                      </p>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md z-[60]">
                    <DialogHeader>
                      <DialogTitle>{g.title} - Multiple Offers</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                      {g.offers.map((offer) => {
                        const offerPlatforms = offer.items.flatMap((item) =>
                          item.releaseInfo.flatMap((info) => info.platform),
                        );
                        return (
                          <HoverCard key={offer.id}>
                            <HoverCardTrigger asChild>
                              <Link
                                to="/offers/$id"
                                params={{ id: offer.id }}
                                className="flex items-center gap-3 p-3 border rounded-lg bg-card transition-colors hover:border-primary/60"
                              >
                                <img
                                  src={buildImageUrl(
                                    getImage(offer.keyImages, [
                                      "DieselGameBoxTall",
                                      "OfferImageTall",
                                    ])?.url ?? "/placeholder.webp",
                                    96,
                                    "low",
                                  )}
                                  alt={offer.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-12 h-16 object-cover rounded"
                                />
                                <div className="flex-1">
                                  <h4 className="font-medium">{offer.title}</h4>
                                  <div className="flex gap-1 mt-1">
                                    {offerPlatforms.map((platform, idx) =>
                                      RenderTextPlatformIcon({
                                        platform,
                                        className: "size-6 rounded-full p-1 bg-muted",
                                        key: `${platform}-${offer.id}-${idx}`,
                                      }),
                                    )}
                                  </div>
                                </div>
                              </Link>
                            </HoverCardTrigger>
                            <HoverCardContent
                              className="w-80 bg-transparent p-0 border-0"
                              align="center"
                              side="right"
                              sideOffset={30}
                            >
                              <OfferHoverCard id={offer.id} />
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Link
                  key={`feebies-title-${g.id}`}
                  to="/offers/$id"
                  params={{
                    id: g.id,
                  }}
                  className="flex flex-col items-start justify-center"
                >
                  <TruncatedText text={g.title} maxLength={35} />
                  <p className="inline-flex gap-1">
                    {g.platforms.map((p) =>
                      RenderTextPlatformIcon({
                        platform: p,
                        className: "size-5 rounded-full p-1 bg-muted",
                        key: `${p}-${g.id}`,
                      }),
                    )}
                  </p>
                </Link>
              ),
              g.giveaway.startDate ? formatDate(g.giveaway.startDate) : "N/A",
              g.giveaway.endDate ? formatDate(g.giveaway.endDate) : "N/A",
            ])}
          />
        </Section>
      </div>

      <div className="grid auto-rows-[1fr] gap-6 grid-cols-1 lg:grid-cols-2">
        <Section
          title="Upcoming Offers"
          href="/search"
          search={{
            sortBy: "upcoming",
          }}
        >
          <SimpleTable
            headers={["#", "Title", "Release Date"]}
            rows={upcomingOffers.elements.slice(0, 10).map((o) => [
              o.id,
              <Link
                key={o.id}
                to="/offers/$id"
                params={{
                  id: o.id,
                }}
                className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
              >
                <img
                  src={buildImageUrl(
                    getImage(o.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
                      "/placeholder.webp",
                    80,
                    "low",
                  )}
                  alt={o.title}
                  loading="lazy"
                  decoding="async"
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              <Link
                key={`upcoming-title-${o.id}`}
                to="/offers/$id"
                params={{
                  id: o.id,
                }}
              >
                <TruncatedText text={o.title ?? "N/A"} maxLength={40} />
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
                : "N/A",
            ])}
          />
        </Section>
        <Section
          title="Latest Offers"
          href="/search"
          search={{
            sortBy: "creationDate",
          }}
        >
          <SimpleTable
            headers={["#", "Title", "Created At", "Price"]}
            rows={latestOffers.slice(0, 10).map((o) => [
              o.id,
              <Link
                key={o.id}
                to="/offers/$id"
                params={{
                  id: o.id,
                }}
                className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
              >
                <img
                  src={buildImageUrl(
                    getImage(o.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
                      "/placeholder.webp",
                    80,
                    "low",
                  )}
                  alt={o.title}
                  loading="lazy"
                  decoding="async"
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              <Link
                key={`latest-title-${o.id}`}
                to="/offers/$id"
                params={{
                  id: o.id,
                }}
              >
                <TruncatedText text={o.title ?? "N/A"} maxLength={40} />
              </Link>,
              o.creationDate ? formatDate(o.creationDate) : "N/A",
              Intl.NumberFormat(locale, {
                style: "currency",
                currency: o.price?.price.currencyCode ?? "USD",
              }).format(
                calculatePrice(
                  o.price?.price.discountPrice ?? 0,
                  o.price?.price.currencyCode ?? "USD",
                ),
              ),
            ])}
          />
        </Section>
        <Section
          title="Latest Released"
          href="/search"
          search={{
            sortBy: "releaseDate",
            sortDir: "desc",
          }}
        >
          <SimpleTable
            headers={["#", "Date", "Title", "Price"]}
            rows={latestReleasedOffers.elements.slice(0, 10).map((u) => [
              u.id,
              <Link
                key={u.id}
                to="/offers/$id"
                params={{
                  id: u.id,
                }}
                className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
              >
                <img
                  src={buildImageUrl(
                    getImage(u.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
                      "/placeholder.webp",
                    80,
                    "low",
                  )}
                  alt={u.title}
                  loading="lazy"
                  decoding="async"
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              u.releaseDate
                ? (() => {
                    const release = DateTime.fromISO(u.releaseDate);
                    const now = DateTime.now();
                    if (release > now && release.diff(now, "hours").hours <= 24) {
                      return <Countdown targetDate={u.releaseDate} />;
                    }
                    return formatDate(u.releaseDate);
                  })()
                : "N/A",
              <Link
                key={`upcoming-title-${u.id}`}
                to="/offers/$id"
                params={{
                  id: u.id,
                }}
              >
                <TruncatedText text={u.title ?? "N/A"} maxLength={40} />
              </Link>,
              Intl.NumberFormat(locale, {
                style: "currency",
                currency: u.price?.price.currencyCode ?? "USD",
              }).format(
                calculatePrice(
                  u.price?.price.discountPrice ?? 0,
                  u.price?.price.currencyCode ?? "USD",
                ),
              ),
            ])}
          />
        </Section>
        <Section
          title="Latest Offers w/ Achievements"
          href="/search"
          search={{
            tags: ["19847"],
          }}
        >
          <SimpleTable
            headers={[
              "#",
              "Title",
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
            rows={achievementOffers.slice(0, 10).map((a) => {
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
                <Link
                  key={a.id}
                  to="/offers/$id"
                  params={{
                    id: a.id,
                  }}
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                >
                  <img
                    src={buildImageUrl(
                      getImage(a.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
                        "/placeholder.webp",
                      80,
                      "low",
                    )}
                    alt={a.title}
                    loading="lazy"
                    decoding="async"
                    className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                  />
                </Link>,
                <Link
                  key={`achievement-title-${a.id}`}
                  to="/offers/$id"
                  params={{
                    id: a.id,
                  }}
                >
                  <TruncatedText text={a.title ?? "N/A"} maxLength={40} />
                </Link>,
                <p key={`achievement-bronze-${a.id}`} className="text-center">
                  {noOfAchievementsPerRarity.bronze || 0}
                </p>,
                <p key={`achievement-silver-${a.id}`} className="text-center">
                  {noOfAchievementsPerRarity.silver || 0}
                </p>,
                <p key={`achievement-gold-${a.id}`} className="text-center">
                  {noOfAchievementsPerRarity.gold || 0}
                </p>,
              ];
            })}
          />
        </Section>
        <Section
          title="Top‑Selling Offers"
          href="/collections/$id"
          params={{
            id: "top-sellers",
          }}
        >
          <SimpleTable
            headers={[
              "Pos",
              "-",
              "Title",
              <span
                key="trend-up-top-sellers"
                className="w-full flex flex-col items-center justify-center"
              >
                <TrendingUp className="size-4" />
              </span>,
            ]}
            rows={topSellerOffers.slice(0, 10).map((t, i) => [
              t.id,
              i + 1,
              <Link
                key={t.id}
                to="/offers/$id"
                params={{
                  id: t.id,
                }}
                className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
              >
                <img
                  src={buildImageUrl(
                    getImage(t.keyImages, ["DieselGameBoxTall", "OfferImageTall"])?.url ??
                      "/placeholder.webp",
                    80,
                    "low",
                  )}
                  alt={t.title}
                  loading="lazy"
                  decoding="async"
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              <Link
                key={`topseller-title-${t.id}`}
                to="/offers/$id"
                params={{
                  id: t.id,
                }}
              >
                <TruncatedText text={t.title} maxLength={40} />
              </Link>,
              <p key={`topseller-price-${t.id}`} className="text-center">
                {t.previousPosition - t.position === 0 ? "-" : t.previousPosition - t.position}
              </p>,
            ])}
          />
        </Section>
        <Section title="Latest Builds">
          <SimpleTable
            headers={["#", "Title", "Size", "Creation Date"]}
            rows={latestBuilds.slice(0, 10).map((b) => [
              b._id,
              <Link
                key={b._id}
                to="/builds/$id"
                params={{
                  id: b._id,
                }}
                className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
              >
                <img
                  src={buildImageUrl(
                    getImage(b.item?.keyImages ?? [], ["DieselGameBoxTall", "OfferImageTall"])
                      ?.url ?? "/placeholder.webp",
                    80,
                    "low",
                  )}
                  alt={b.item?.title ?? "Unknown Build"}
                  loading="lazy"
                  decoding="async"
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              <BuildTitle
                key={b._id}
                id={b._id}
                title={b.item?.title ?? "Unknown Build"}
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

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-xl font-display font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function StatDivider() {
  return <span className="h-8 w-px bg-border/50 hidden sm:block" aria-hidden="true" />;
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
  const chips: {
    label: string;
    to: LinkComponentProps["to"];
    search?: LinkComponentProps["search"];
    params?: LinkComponentProps["params"];
  }[] = [
    { label: "Just released", to: "/search", search: { sortBy: "releaseDate", sortDir: "desc" } },
    { label: "Price drops (72h)", to: "/sales" },
    { label: "Has achievements", to: "/search", search: { tags: ["19847"] } },
    { label: "Upcoming", to: "/search", search: { sortBy: "upcoming" } },
    { label: "Top sellers", to: "/collections/$id", params: { id: "top-sellers" } },
  ];

  const events = useMemo(
    () =>
      changes
        .filter((change) => change.metadata?.changes?.length)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6)
        .map(normalizePulseEvent),
    [changes],
  );

  return (
    <section className="relative isolate overflow-hidden rounded-md border border-border/60 bg-card/40 p-5 backdrop-blur-sm md:p-6">
      <div className="pointer-events-none absolute inset-y-5 right-5 z-0 hidden w-[35%] lg:block">
        <AmbientPulsePanel
          events={events}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          density="desktop"
        />
      </div>
      <div className="relative z-10 flex min-h-[260px] max-w-2xl flex-col justify-center lg:min-h-[252px]">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-foreground">
          egdata.app
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Track prices, discover deals, and never miss a free game. Your companion for the Epic
          Games Store database — offers, discounts, giveaways, builds, and more.
        </p>

        <button
          type="button"
          onClick={onSearch}
          className="mt-5 w-full max-w-xl inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-4 py-2.5 text-left text-sm text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
        >
          <Search className="size-4" />
          Search the database…
        </button>

        <div className="mt-4 flex max-w-xl flex-wrap gap-2" data-testid="hero-quick-links">
          {chips.map((chip) => (
            <Link
              key={chip.label}
              to={chip.to}
              search={chip.search}
              params={chip.params}
              className="inline-flex items-center whitespace-nowrap rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function AmbientPulsePanel({
  events,
  isLoading,
  isFetching,
  density,
}: {
  events: PulseEvent[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  density: "desktop" | "mobile";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        density === "desktop"
          ? "h-full p-3 text-muted-foreground/80"
          : "rounded-md border border-border/40 bg-background/25 p-3",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium tracking-tight text-muted-foreground">
          Recent activity
        </span>
        {isFetching && !isLoading && (
          <RefreshCw className="size-3.5 animate-spin text-muted-foreground/60" />
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {isLoading || events.length === 0
          ? Array.from({ length: density === "desktop" ? 4 : 2 }).map((_, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are positional placeholders
                key={index}
                className="flex items-center gap-2.5"
              >
                <div className="size-7 rounded bg-muted/40 animate-pulse" />
                <div className="h-3 flex-1 rounded bg-muted/30 animate-pulse" />
              </div>
            ))
          : events
              .slice(0, density === "desktop" ? 5 : 3)
              .map((event) => <PulseChangeRow key={event.id} event={event} />)}
      </div>
    </div>
  );
}

function PulseChangeRow({ event }: { event: PulseEvent }) {
  const tone = getPulseTone(event.contextType, event.action);
  const Icon = getPulseIcon(event.contextType, event.action);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative flex size-7 shrink-0 items-center justify-center">
        {event.imageUrl ? (
          <img
            src={buildImageUrl(event.imageUrl, 80, "low")}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-6 rounded object-cover"
          />
        ) : (
          <Icon className={cn("size-3.5", tone.text)} />
        )}
      </div>

      <span className="min-w-0 flex-1 truncate text-sm text-foreground/85">{event.title}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground/70">
        {event.badge.toLowerCase()}
      </span>
      <span
        suppressHydrationWarning
        className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/60"
      >
        {timeAgo(new Date(event.timestamp))}
      </span>
    </div>
  );
}

function normalizePulseEvent(change: LiveChangeEvent): PulseEvent {
  const primaryChange = getPrimaryChange(change.metadata.changes);
  const contextType = change.metadata.contextType || "change";
  const action = primaryChange?.changeType ?? "update";

  return {
    id: change._id,
    timestamp: change.timestamp,
    contextType,
    action,
    badge: getPulseBadge(contextType, action),
    title: getPulseTitle(change),
    detail: getPulseDetail(change, primaryChange),
    changeCount: change.metadata.changes.length,
    imageUrl: getPulseImageUrl(change.metadata.context),
  };
}

function getPrimaryChange(changes: LiveChangeDelta[]) {
  const lowSignalFields = new Set(["createdAt", "updatedAt", "lastModifiedDate"]);
  return changes.find((change) => !lowSignalFields.has(change.field)) ?? changes[0];
}

function getPulseTitle(change: LiveChangeEvent) {
  const { context, contextId, contextType } = change.metadata;
  const title = context?.title?.trim();

  if (title) return title;

  if (contextType === "build") {
    if (context?.buildVersion) return `Build ${context.buildVersion}`;
    if (context?.appName) return `Build ${shortId(context.appName)}`;
  }

  if (contextType === "achievements") {
    return `Achievements ${shortId(contextId)}`;
  }

  return context?.name || context?.id || shortId(contextId);
}

function getPulseDetail(change: LiveChangeEvent, primaryChange: LiveChangeDelta | undefined) {
  const { changes, contextType } = change.metadata;
  const action = primaryChange?.changeType ?? "update";
  const field = primaryChange?.field ?? "record";

  if (contextType === "build") {
    return action === "insert" ? "New build indexed" : "Build manifest refreshed";
  }

  if (contextType === "achievements") {
    return `${changes.length.toLocaleString("en-UK")} achievement ${pluralize(
      changes.length,
      "entry",
      "entries",
    )} ${getActionVerb(action)}`;
  }

  if (contextType === "offer" && field === "lastModifiedDate") {
    return "Offer metadata refreshed";
  }

  if (changes.length > 1) {
    return `${changes.length.toLocaleString("en-UK")} fields ${getActionVerb(action)}`;
  }

  return `${formatChangeField(field)} ${getActionVerb(action)}`;
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
  if (action === "insert") return "New";
  if (action === "delete") return "Gone";

  switch (contextType) {
    case "offer":
      return "Offer";
    case "build":
      return "Build";
    case "item":
      return "Item";
    case "asset":
      return "Asset";
    case "achievements":
      return "XP";
    case "sandbox":
      return "Sandbox";
    default:
      return "Change";
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

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
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

function getPulseTone(contextType: string, action: LiveChangeAction) {
  if (action === "insert") {
    return {
      bg: "bg-emerald-400/10",
      border: "border-emerald-300/35",
      text: "text-emerald-200",
      dot: "bg-emerald-300",
    };
  }

  if (action === "delete") {
    return {
      bg: "bg-rose-400/10",
      border: "border-rose-300/35",
      text: "text-rose-200",
      dot: "bg-rose-300",
    };
  }

  switch (contextType) {
    case "build":
      return {
        bg: "bg-cyan-400/10",
        border: "border-cyan-300/35",
        text: "text-cyan-200",
        dot: "bg-cyan-300",
      };
    case "offer":
      return {
        bg: "bg-sky-400/10",
        border: "border-sky-300/35",
        text: "text-sky-200",
        dot: "bg-sky-300",
      };
    case "achievements":
      return {
        bg: "bg-amber-400/10",
        border: "border-amber-300/35",
        text: "text-amber-200",
        dot: "bg-amber-300",
      };
    case "item":
      return {
        bg: "bg-lime-400/10",
        border: "border-lime-300/35",
        text: "text-lime-200",
        dot: "bg-lime-300",
      };
    case "asset":
      return {
        bg: "bg-fuchsia-400/10",
        border: "border-fuchsia-300/35",
        text: "text-fuchsia-200",
        dot: "bg-fuchsia-300",
      };
    default:
      return {
        bg: "bg-primary/10",
        border: "border-primary/35",
        text: "text-primary",
        dot: "bg-primary",
      };
  }
}
