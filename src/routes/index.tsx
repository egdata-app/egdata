import { ScrollArea } from "@/components/aria/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/aria/table";
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
import type { SingleItem } from "@/types/single-item";
import { useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, type LinkComponentProps } from "@tanstack/react-router";
import type { JSX, ReactNode } from "react";
import { DateTime } from "luxon";
import { getGiveawaysStats, GiveawaysStats } from "@/components/modules/giveaway-stats";
import { cn } from "@/lib/utils";
import { calculatePrice } from "@/lib/calculate-price";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/aria/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/aria/dialog";
import { Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/aria/badge";
import { Image } from "@/components/app/image";
import buildImageUrl, { buildSrcSet } from "@/lib/build-image-url";
import { getImage } from "@/lib/get-image";
import { getOfferOverview } from "@/queries/offer-overview";
import { formatTimeToHumanReadable } from "@/lib/time-to-human-readable";
import { Countdown } from "@/components/aria/countdown";
import { Input } from "@/components/aria/input";
import { Search } from "lucide-react";
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
import { DataPanel, MetricTile, PageHeader, PageShell } from "@/components/app/design-system";

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
        queryKey: ["stats", { country }],
        queryFn: () => getStats({ country: country ?? "US" }).catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: ["giveaways-stats", { country }],
        queryFn: () => getGiveawaysStats({ country: country ?? "US" }).catch(() => null),
      }),
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
    <div className="w-full h-fit space-y-3 rounded-md egd-panel-raised p-4">
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
        <h3 className="text-xl font-bold text-text-primary">{data.offer.title}</h3>
        {data.price && (
          <div className="text-right">
            {data.price.price.discountPrice === 0 ? (
              <span className="font-bold text-success">Free</span>
            ) : (
              <div className="flex flex-col items-end">
                <span className="font-bold text-text-primary">
                  {formatPrice(data.price.price.discountPrice, data.price.price.currencyCode)}
                </span>
                {data.price.price.originalPrice > data.price.price.discountPrice && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-muted line-through">
                      {formatPrice(data.price.price.originalPrice, data.price.price.currencyCode)}
                    </span>
                    <Badge variant="destructive" className="text-xs px-1 py-0">
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

      <div className="space-y-1 text-sm text-text-secondary">
        <p>
          <span className="text-text-muted">Seller:</span>{" "}
          <Link
            to="/sellers/$id"
            params={{
              id: data.offer.seller.id,
            }}
            className="text-interactive hover:text-interactive-hover hover:underline"
          >
            {data.offer.seller.name}
          </Link>
        </p>
        {data.offer.developerDisplayName && (
          <p>
            <span className="text-text-muted">Developer:</span>{" "}
            <Link
              to="/search"
              search={{
                developerDisplayName: data.offer.developerDisplayName,
              }}
              className="text-interactive hover:text-interactive-hover hover:underline"
            >
              {data.offer.developerDisplayName}
            </Link>
          </p>
        )}
        {data.offer.publisherDisplayName && (
          <p>
            <span className="text-text-muted">Publisher:</span>{" "}
            <Link
              to="/search"
              search={{
                publisherDisplayName: data.offer.publisherDisplayName,
              }}
              className="text-interactive hover:text-interactive-hover hover:underline"
            >
              {data.offer.publisherDisplayName}
            </Link>
          </p>
        )}
        {data.offer.releaseDate && (
          <p>
            <span className="text-text-muted">Release Date:</span>{" "}
            {formatDate(data.offer.releaseDate)}
          </p>
        )}
        {getAgeRatingDisplay() && (
          <p>
          <span className="text-text-muted">Age Rating:</span> {getAgeRatingDisplay()}
          </p>
        )}
      </div>

      {data.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.genres.slice(0, 4).map((genre) => (
            <Badge
              key={genre.id}
              variant="outline"
              className="border-interactive/35 bg-interactive-muted text-interactive"
            >
              <Sparkles className="mr-1.5 size-3 text-interactive" />
              {genre.name}
            </Badge>
          ))}
          {data.genres.length > 4 && (
            <Badge variant="outline">
              +{data.genres.length - 4} more
            </Badge>
          )}
        </div>
      )}

      <div className="space-y-2 rounded-md bg-surface-ground p-3 text-sm">
        {data.polls?.averageRating && (
          <div className="flex items-center gap-2">
            <span>🤯</span>
            <span className="text-text-muted">Community Rating:</span>
            <span className="font-bold text-warning">
              {(data.polls.averageRating * 2 * 10).toFixed(1)}%
            </span>
          </div>
        )}
        {data.igdb && (
          <>
            {data.igdb.total_rating && (
              <div className="flex items-center gap-2">
                <div className="flex size-5 items-center justify-center rounded-sm bg-success text-sm font-bold text-text-inverse">
                  {Math.round(data.igdb.total_rating)}
                </div>
                <span className="text-text-muted">IGDB Score</span>
                {data.igdb.total_rating_count && (
                  <span className="text-xs text-text-subtle">
                    • {data.igdb.total_rating_count} reviews
                  </span>
                )}
              </div>
            )}
            {data.igdb.timeToBeat && (
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span className="text-text-muted">Time to Beat:</span>
                <span className="text-text-secondary">
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
            <span className="text-text-muted">Features:</span>
            <span className="text-text-secondary">
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
    <div className="w-80 overflow-hidden rounded-lg egd-panel-raised">
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
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-text-primary">
            {build.item?.title ?? "Unknown Build"}
          </h3>
          {build.item?.developer && (
            <p className="mt-1 text-sm text-text-muted">
              {build.item?.developer ?? "Unknown Developer"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Size</span>
            <span className="text-sm font-medium text-text-secondary">
              {calculateSize(build.downloadSizeBytes)}
            </span>
          </div>

          {build.buildVersion && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Version</span>
              <span className="text-sm font-medium text-text-secondary">{build.buildVersion}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Created</span>
            <span className="text-xs text-text-secondary">
              {DateTime.fromISO(build.createdAt).toLocaleString(DateTime.DATE_SHORT)}
            </span>
          </div>
        </div>

        <div className="border-t border-stroke-subtle pt-2">
          <p className="truncate font-mono text-xs text-text-subtle">ID: {build._id}</p>
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
      getBuilds({
        sortDir: "desc",
        sortBy: "createdAt",
      }),
    ],
  });
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
                  className="font-normal text-text-muted"
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
                <TableRow>
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
                            <div className="flex h-8 w-16 items-center justify-center overflow-hidden rounded bg-surface-raised sm:h-12 sm:w-24">
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
    <DataPanel
      title={
        href ? (
          <Link
            to={href}
            search={search}
            params={params}
            className="underline decoration-dotted underline-offset-4 hover:text-interactive"
          >
            {title}
          </Link>
        ) : (
          title
        )
      }
      contentClassName="min-h-0 flex-1 p-0"
      className={cn(
        "flex h-[650px] flex-col overflow-hidden",
        spanFull ? "md:col-span-2" : "",
        className,
      )}
    >
      <ScrollArea className="h-full p-4">{children}</ScrollArea>
    </DataPanel>
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Epic Games Store intelligence"
        title="egdata.app"
        className="items-center text-center md:items-center md:text-center"
      >
        Track prices, discover deals, and never miss a free game. Your companion for Epic Games
        Store offers, discounts, giveaways, builds, and performance data.
      </PageHeader>

      <section className="mx-auto w-full max-w-md">
          <div
            className="relative cursor-text"
            onClick={(e) => {
              e.preventDefault();
              setFocus(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setFocus(true);
              }
            }}
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="search"
              placeholder="Search offers, items, or sellers..."
              className="pl-10 h-10 text-sm cursor-text"
              readOnly
            />
          </div>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricBox label="Offers Tracked" value={stats.offers.toLocaleString("en-UK")} />
        <MetricBox
          label="Price Changes / 72h"
          value={stats.trackedPriceChanges.toLocaleString("en-UK")}
        />
        <MetricBox label="Active Discounts" value={stats.activeDiscounts.toLocaleString("en-UK")} />
        <MetricBox label="Giveaways to Date" value={stats.giveaways.toLocaleString("en-UK")} />
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
                      className="flex flex-col items-start justify-center text-left hover:text-interactive transition-colors"
                    >
                      <TruncatedText text={g.title} maxLength={35} />
                      <p className="inline-flex gap-1">
                        {g.platforms.map((p) =>
                          RenderTextPlatformIcon({
                            platform: p,
                            className: "size-5 rounded-full bg-surface-hover p-1",
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
                                className="flex items-center gap-3 rounded-lg border border-stroke-subtle bg-surface-panel p-3 transition-colors hover:border-stroke-strong"
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
                                        className: "size-6 rounded-full bg-surface-hover p-1",
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
                        className: "size-5 rounded-full bg-surface-hover p-1",
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
    </PageShell>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <MetricTile label={label} value={value} className="text-center" />
  );
}
