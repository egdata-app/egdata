import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCountry } from '@/hooks/use-country';
import { useLocale } from '@/hooks/use-locale';
import { httpClient } from '@/lib/http-client';
import { getUpcoming } from '@/queries/upcoming';
import { getLastModified } from '@/queries/last-modified';
import { getLatestOffers } from '@/queries/latest-offers';
import { getLatestReleased } from '@/queries/latest-released';
import { getOffersWithAchievements } from '@/queries/offers-with-achievements';
import { getStats } from '@/queries/stats';
import { getTopSellers } from '@/queries/top-sellers';
import type { GiveawayOffer } from '@/types/giveaways';
import type { SingleItem } from '@/types/single-item';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  type LinkComponentProps,
} from '@tanstack/react-router';
import type { JSX, ReactNode } from 'react';
import { DateTime } from 'luxon';
import {
  getGiveawaysStats,
  GiveawaysStats,
} from '@/components/modules/giveaway-stats';
import { cn } from '@/lib/utils';
import { calculatePrice } from '@/lib/calculate-price';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/app/image';
import { getImage } from '@/lib/get-image';
import { getOfferOverview } from '@/queries/offer-overview';
import { formatTimeToHumanReadable } from '@/lib/time-to-human-readable';
import { Countdown } from '@/components/ui/countdown';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useSearch } from '@/hooks/use-search';
import { getBuilds } from '@/queries/get-builds';
import { calculateSize } from '@/lib/calculate-size';
import { BuildTitle } from '@/components/app/build-title';
import { ClientBanner } from '@/components/modules/client-banner';
import { getRarity } from '@/lib/get-rarity';
import { EpicTrophyIcon } from '@/components/icons/epic-trophy';
import { raritiesTextColors } from '@/components/app/achievement-card';
import { mergeFreebies } from '@/utils/merge-freebies';
import {
  RenderTextPlatformIcon,
  textPlatformIcons,
} from '@/components/app/platform-icons';

export const Route = createFileRoute('/')({
  component: RouteComponent,

  loader: async ({ context }) => {
    const { queryClient, country } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['giveaways'],
        queryFn: () =>
          httpClient
            .get<GiveawayOffer[]>('/free-games', {
              params: {
                country,
              },
            })
            .then(mergeFreebies),
      }),
      queryClient.prefetchQuery({
        queryKey: ['upcoming', { country }],
        queryFn: () => getUpcoming({ country }),
        staleTime: 6000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['latest-games'],
        queryFn: () => getLatestOffers(country),
      }),
      queryClient.prefetchQuery({
        queryKey: ['stats', { country }],
        queryFn: () => getStats({ country }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['giveaways-stats', { country }],
        queryFn: () => getGiveawaysStats({ country }),
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
      style: 'currency',
      currency: currencyCode,
    });
    return fmt.format(calculatePrice(price, currencyCode));
  };

  const formatDate = (dateString: string) => {
    return DateTime.fromISO(dateString).toLocaleString(DateTime.DATE_MED);
  };

  const getAgeRatingDisplay = () => {
    if (!data.ageRating) return null;

    if ('rating' in data.ageRating) {
      return `${data.ageRating.ratingSystem}: ${data.ageRating.rating}`;
    }
    return data.ageRating.ratingSystem;
  };

  return (
    <div className="bg-slate-800 border-slate-700 text-slate-200 p-4 space-y-3 w-full h-fit border rounded-md">
      <div>
        <Image
          src={
            getImage(data.offer.keyImages, [
              'DieselGameBoxWide',
              'OfferImageWide',
            ])?.url ??
            '/placeholder.webp' ??
            '/placeholder-1080.webp'
          }
          alt={data.offer.title}
          width={300}
          height={168}
          className="rounded-md object-cover"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-bold text-white">{data.offer.title}</h3>
        {data.price && (
          <div className="text-right">
            {data.price.price.discountPrice === 0 ? (
              <span className="text-green-400 font-bold">Free</span>
            ) : (
              <div className="flex flex-col items-end">
                <span className="text-white font-bold">
                  {formatPrice(
                    data.price.price.discountPrice,
                    data.price.price.currencyCode,
                  )}
                </span>
                {data.price.price.originalPrice >
                  data.price.price.discountPrice && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(
                        data.price.price.originalPrice,
                        data.price.price.currencyCode,
                      )}
                    </span>
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      -
                      {Math.round(
                        ((data.price.price.originalPrice -
                          data.price.price.discountPrice) /
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

      <div className="text-sm space-y-1 text-slate-300">
        <p>
          <span className="text-slate-400">Seller:</span>{' '}
          <Link
            to="/sellers/$id"
            params={{
              id: data.offer.seller.id,
            }}
            className="text-blue-400 hover:underline"
          >
            {data.offer.seller.name}
          </Link>
        </p>
        {data.offer.developerDisplayName && (
          <p>
            <span className="text-slate-400">Developer:</span>{' '}
            <Link
              to="/search"
              search={{
                developerDisplayName: data.offer.developerDisplayName,
              }}
              className="text-blue-400 hover:underline"
            >
              {data.offer.developerDisplayName}
            </Link>
          </p>
        )}
        {data.offer.publisherDisplayName && (
          <p>
            <span className="text-slate-400">Publisher:</span>{' '}
            <Link
              to="/search"
              search={{
                publisherDisplayName: data.offer.publisherDisplayName,
              }}
              className="text-blue-400 hover:underline"
            >
              {data.offer.publisherDisplayName}
            </Link>
          </p>
        )}
        {data.offer.releaseDate && (
          <p>
            <span className="text-slate-400">Release Date:</span>{' '}
            {formatDate(data.offer.releaseDate)}
          </p>
        )}
        {getAgeRatingDisplay() && (
          <p>
            <span className="text-slate-400">Age Rating:</span>{' '}
            {getAgeRatingDisplay()}
          </p>
        )}
      </div>

      {data.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.genres.slice(0, 4).map((genre) => (
            <Badge
              key={genre.id}
              variant="outline"
              className="border-purple-400/50 bg-purple-900/20 text-purple-300"
            >
              <Sparkles className="w-3 h-3 mr-1.5 text-purple-400" />
              {genre.name}
            </Badge>
          ))}
          {data.genres.length > 4 && (
            <Badge
              variant="outline"
              className="border-slate-400/50 bg-slate-900/20 text-slate-400"
            >
              +{data.genres.length - 4} more
            </Badge>
          )}
        </div>
      )}

      <div className="bg-slate-900/80 p-3 rounded-md space-y-2 text-sm">
        {data.polls?.averageRating && (
          <div className="flex items-center gap-2">
            <span>🤯</span>
            <span className="text-slate-400">Community Rating:</span>
            <span className="font-bold text-yellow-400">
              {(data.polls.averageRating * 2 * 10).toFixed(1)}%
            </span>
          </div>
        )}
        {data.igdb && (
          <>
            {data.igdb.total_rating && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center text-sm font-bold text-white">
                  {Math.round(data.igdb.total_rating)}
                </div>
                <span className="text-slate-400">IGDB Score</span>
                {data.igdb.total_rating_count && (
                  <span className="text-slate-500 text-xs">
                    • {data.igdb.total_rating_count} reviews
                  </span>
                )}
              </div>
            )}
            {data.igdb.timeToBeat && (
              <div className="flex items-center gap-2">
                <span>⏱️</span>
                <span className="text-slate-400">Time to Beat:</span>
                <span className="text-slate-300">
                  {data.igdb.timeToBeat.normally
                    ? formatTimeToHumanReadable(data.igdb.timeToBeat.normally)
                    : 'N/A'}
                </span>
              </div>
            )}
          </>
        )}
        {data.features.features.length > 0 && (
          <div className="flex items-center gap-2">
            <span>🎮</span>
            <span className="text-slate-400">Features:</span>
            <span className="text-slate-300">
              {data.features.features.slice(0, 2).join(', ')}
              {data.features.features.length > 2 &&
                ` +${data.features.features.length - 2} more`}
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
    getImage(build.item.keyImages, [
      'OfferImageWide',
      'DieselStoreFrontWide',
      'horizontal',
      'DieselGameBoxWide',
      'DieselGameBox',
      'Thumbnail',
    ]);

  if (!build) return null;

  const displayUrl = gameImage?.url;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 text-slate-200 border rounded-lg shadow-xl overflow-hidden w-80">
      {displayUrl && (
        <div className="w-full h-44 flex-shrink-0 relative">
          <img
            src={displayUrl}
            alt={build.item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">
            {build.item.title}
          </h3>
          {build.item.developer && (
            <p className="text-sm text-slate-400 mt-1">
              {build.item.developer}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Size</span>
            <span className="text-sm font-medium text-slate-200">
              {calculateSize(build.downloadSizeBytes)}
            </span>
          </div>

          {build.buildVersion && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Version</span>
              <span className="text-sm font-medium text-slate-200">
                {build.buildVersion}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Created</span>
            <span className="text-xs text-slate-300">
              {DateTime.fromISO(build.createdAt).toLocaleString(
                DateTime.DATE_SHORT,
              )}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <p className="text-xs text-slate-500 font-mono truncate">
            ID: {build._id}
          </p>
        </div>
      </div>
    </div>
  );
}

type HoverCardType = 'offer' | 'build' | 'none';

function renderHoverCard(type: HoverCardType, id: string) {
  switch (type) {
    case 'offer':
      return <OfferHoverCard id={id} />;
    case 'build':
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
    latestChangesQuery,
    statsQuery,
    latestBuildsQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['giveaways'],
        queryFn: () =>
          httpClient
            .get<GiveawayOffer[]>('/free-games', {
              params: {
                country,
              },
            })
            .then(mergeFreebies),
        placeholderData: [],
      },
      {
        queryKey: ['upcoming', { country }],
        queryFn: () => getUpcoming({ country }),
        placeholderData: { elements: [] },
      },
      {
        queryKey: ['latest-games'],
        queryFn: () => getLatestOffers(country),
        placeholderData: [],
      },
      {
        queryKey: ['latest-released', { country }],
        queryFn: () => getLatestReleased({ country }),
        placeholderData: { elements: [] },
      },
      {
        queryKey: ['offers-with-achievements', { country }],
        queryFn: () => getOffersWithAchievements(country),
        placeholderData: [],
      },
      {
        queryKey: ['top-sellers', { country }],
        queryFn: () => getTopSellers(country),
        placeholderData: [],
      },
      {
        queryKey: ['last-modified', { country }],
        queryFn: () => getLastModified(country),
        placeholderData: [],
      },
      {
        queryKey: ['stats', { country }],
        queryFn: () => getStats({ country }),
        placeholderData: {
          offers: 0,
          trackedPriceChanges: 0,
          activeDiscounts: 0,
          giveaways: 0,
        },
      },
      getBuilds({
        sortDir: 'desc',
        sortBy: 'createdAt',
      }),
    ],
  });
  const { data: giveawayOffers = [] } = freebiesQuery;
  const { data: upcomingOffers = { elements: [] } } = upcomingQuery;
  const { data: latestOffers = [] } = latestGamesQuery;
  const { data: latestReleasedOffers = { elements: [] } } = latestReleasedQuery;
  const { data: achievementOffers = [] } = achievementsQuery;
  const { data: topSellerOffers = [] } = topSellersQuery;
  const { data: latestChanges = [] } = latestChangesQuery;
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
    return DateTime.fromISO(iso).setZone(timezone).toFormat('MMM d, HH:mm');
  }

  const SimpleTable = ({
    headers,
    rows,
    hoverCardType = 'offer',
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
                  key={typeof h === 'string' ? h : `header-${index}`}
                  className="text-neutral-400 font-normal"
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
                typeof cell === 'object' && 'props' in cell;
              const isImage = (cell: string | number | JSX.Element) =>
                isElement(cell) &&
                typeof cell === 'object' &&
                'type' in cell &&
                cell.type === Image;

              const TableRowContent = (
                <TableRow className="border-neutral-800 hover:bg-neutral-800/60">
                  {cells.map((cell, j) => {
                    const headerKey =
                      typeof headers[j + 1] === 'string'
                        ? headers[j + 1]
                        : `header-${j}`;
                    return (
                      <TableCell
                        key={`${id}-${headerKey}`}
                        className={cn(
                          'whitespace-nowrap text-sm',
                          isImage(cell) && 'w-16 sm:w-32',
                          isElement(cell) && !isImage(cell) && 'p-0',
                        )}
                      >
                        {isImage(cell) ? (
                          <div className="flex items-center justify-start">
                            <div className="w-16 h-8 sm:w-24 sm:h-12 rounded overflow-hidden bg-neutral-800/40 flex items-center justify-center">
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

              if (hoverCardType === 'none') {
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
    href?: LinkComponentProps['to'];
    search?: LinkComponentProps['search'];
    params?: LinkComponentProps['params'];
    className?: string;
  }) => (
    <Card
      className={cn(
        'flex flex-col rounded-lg border h-[650px]',
        spanFull ? 'md:col-span-2' : '',
        className,
      )}
    >
      <CardHeader className="border-b border-neutral-800 p-3">
        <CardTitle className="text-sm font-mono text-neutral-400">
          {href ? (
            <Link
              to={href}
              search={search}
              params={params}
              className="underline decoration-dotted underline-offset-4"
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
          className={cn(
            'h-[650px] p-4',
            className?.includes('h-[400px]') && 'h-[400px]',
          )}
        >
          {children}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 py-6 px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-semiboold tracking-tight sm:text-4xl md:text-5xl font-montserrat">
            egdata.app
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            Track prices, discover deals, and never miss a free game. Your
            ultimate companion for Epic Games Store offers, discounts, and
            giveaways.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <div
            className="relative cursor-text"
            onClick={(e) => {
              e.preventDefault();
              setFocus(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setFocus(true);
              }
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search offers, items, or sellers..."
              className="pl-10 h-10 text-sm cursor-text"
              readOnly
            />
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricBox
          label="Offers Tracked"
          value={stats.offers.toLocaleString('en-UK')}
        />
        <MetricBox
          label="Price Changes / 72h"
          value={stats.trackedPriceChanges.toLocaleString('en-UK')}
        />
        <MetricBox
          label="Active Discounts"
          value={stats.activeDiscounts.toLocaleString('en-UK')}
        />
        <MetricBox
          label="Giveaways to Date"
          value={stats.giveaways.toLocaleString('en-UK')}
        />
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
            headers={['#', 'Title', 'Starts', 'Ends']}
            rows={giveawayOffers.slice(0, 5).map((g) => [
              g.id,
              <Link
                key={`feebies-image-${g.id}`}
                to="/offers/$id"
                params={{
                  id: g.id,
                }}
                className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
              >
                <img
                  src={
                    getImage(g.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={g.title}
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              <Link
                key={`feebies-title-${g.id}`}
                to="/offers/$id"
                params={{
                  id: g.id,
                }}
                className="flex flex-col items-start justify-center"
              >
                <span>{g.title}</span>
                <p className="inline-flex gap-1">
                  {g.platforms.map((p) =>
                    RenderTextPlatformIcon({
                      platform: p,
                      className: 'size-5 rounded-full p-1 bg-gray-600',
                      key: `${p}-${g.id}`,
                    }),
                  )}
                </p>
              </Link>,
              g.giveaway.startDate ? formatDate(g.giveaway.startDate) : 'N/A',
              g.giveaway.endDate ? formatDate(g.giveaway.endDate) : 'N/A',
            ])}
          />
        </Section>
      </div>

      <div className="grid auto-rows-[1fr] gap-6 grid-cols-1 lg:grid-cols-2">
        <Section
          title="Upcoming Offers"
          href="/search"
          search={{
            sortBy: 'upcoming',
          }}
        >
          <SimpleTable
            headers={['#', 'Title', 'Release Date']}
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
                  src={
                    getImage(o.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={o.title}
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
                {o.title ?? 'N/A'}
              </Link>,
              o.releaseDate
                ? (() => {
                    const release = DateTime.fromISO(o.releaseDate);
                    const now = DateTime.now();
                    if (
                      release > now &&
                      release.diff(now, 'hours').hours <= 24
                    ) {
                      return <Countdown targetDate={o.releaseDate} />;
                    }
                    return formatDate(o.releaseDate);
                  })()
                : 'N/A',
            ])}
          />
        </Section>
        <Section
          title="Latest Offers"
          href="/search"
          search={{
            sortBy: 'creationDate',
          }}
        >
          <SimpleTable
            headers={['#', 'Title', 'Created At', 'Price']}
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
                  src={
                    getImage(o.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={o.title}
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
                {o.title ?? 'N/A'}
              </Link>,
              o.creationDate ? formatDate(o.creationDate) : 'N/A',
              Intl.NumberFormat(locale, {
                style: 'currency',
                currency: o.price?.price.currencyCode ?? 'USD',
              }).format(
                calculatePrice(
                  o.price?.price.discountPrice ?? 0,
                  o.price?.price.currencyCode ?? 'USD',
                ),
              ),
            ])}
          />
        </Section>
        <Section
          title="Latest Released"
          href="/search"
          search={{
            sortBy: 'releaseDate',
            sortDir: 'desc',
          }}
        >
          <SimpleTable
            headers={['#', 'Date', 'Title', 'Price']}
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
                  src={
                    getImage(u.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={u.title}
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              u.releaseDate
                ? (() => {
                    const release = DateTime.fromISO(u.releaseDate);
                    const now = DateTime.now();
                    if (
                      release > now &&
                      release.diff(now, 'hours').hours <= 24
                    ) {
                      return <Countdown targetDate={u.releaseDate} />;
                    }
                    return formatDate(u.releaseDate);
                  })()
                : 'N/A',
              <Link
                key={`upcoming-title-${u.id}`}
                to="/offers/$id"
                params={{
                  id: u.id,
                }}
              >
                {u.title ?? 'N/A'}
              </Link>,
              Intl.NumberFormat(locale, {
                style: 'currency',
                currency: u.price?.price.currencyCode ?? 'USD',
              }).format(
                calculatePrice(
                  u.price?.price.discountPrice ?? 0,
                  u.price?.price.currencyCode ?? 'USD',
                ),
              ),
            ])}
          />
        </Section>
        <Section
          title="Latest Offers w/ Achievements"
          href="/search"
          search={{
            tags: ['19847'],
          }}
        >
          <SimpleTable
            headers={[
              '#',
              'Title',
              <span
                className="flex flex-col items-center justify-center"
                key="bronze-header"
              >
                <EpicTrophyIcon
                  className={cn('size-4', raritiesTextColors.bronze)}
                />
              </span>,
              <span
                className="flex flex-col items-center justify-center"
                key="silver-header"
              >
                <EpicTrophyIcon
                  className={cn('size-4', raritiesTextColors.silver)}
                />
              </span>,
              <span
                className="flex flex-col items-center justify-center"
                key="gold-header"
              >
                <EpicTrophyIcon
                  className={cn('size-4', raritiesTextColors.gold)}
                />
              </span>,
            ]}
            rows={achievementOffers.slice(0, 10).map((a) => {
              const noOfAchievementsPerRarity =
                a.achievements.achievements.reduce(
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
                    src={
                      getImage(a.keyImages, [
                        'DieselGameBoxTall',
                        'OfferImageTall',
                      ])?.url ?? '/placeholder.webp'
                    }
                    alt={a.title}
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
                  {a.title ?? 'N/A'}
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
            id: 'top-sellers',
          }}
        >
          <SimpleTable
            headers={[
              'Pos',
              '-',
              'Title',
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
                  src={
                    getImage(t.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={t.title}
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
                {t.title}
              </Link>,
              <p key={`topseller-price-${t.id}`} className="text-center">
                {t.previousPosition - t.position === 0
                  ? '-'
                  : t.previousPosition - t.position}
              </p>,
            ])}
          />
        </Section>
        <Section title="Latest Builds">
          <SimpleTable
            headers={['#', 'Title', 'Size', 'Creation Date']}
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
                  src={
                    getImage(b.item.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={b.item.title}
                  className="w-[32px] h-[42px] sm:w-[40px] sm:h-[52px]"
                />
              </Link>,
              <BuildTitle
                key={b._id}
                id={b._id}
                title={b.item.title}
                buildVersion={b.buildVersion}
                maxTitleLength={20}
              />,
              calculateSize(b.downloadSizeBytes),
              formatDate(b.createdAt),
            ])}
            hoverCardType="build"
            renderHoverCard={(id) => (
              <BuildHoverCard id={id} builds={latestBuilds} />
            )}
          />
        </Section>
      </div>
      <ClientBanner />
    </main>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card p-4 text-center">
      <div className="text-2xl font-mono">{value}</div>
      <div className="text-xs text-neutral-400">{label}</div>
    </div>
  );
}
