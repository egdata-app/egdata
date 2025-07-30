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
import { getFeaturedDiscounts } from '@/queries/featured-discounts';
import { getLastModified } from '@/queries/last-modified';
import { getLatestOffers } from '@/queries/latest-offers';
import { getLatestReleased } from '@/queries/latest-released';
import { getOffersWithAchievements } from '@/queries/offers-with-achievements';
import { getStats } from '@/queries/stats';
import { getTopSellers } from '@/queries/top-sellers';
import type { GiveawayOffer } from '@/types/giveaways';
import type { FullTag } from '@/types/tags';
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
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/app/image';
import { getImage } from '@/lib/get-image';
import { getOfferOverview } from '@/queries/offer-overview';
import { formatTimeToHumanReadable } from '@/lib/time-to-human-readable';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useSearch } from '@/hooks/use-search';
import { getBuilds } from '@/queries/get-builds';
import { calculateSize } from '@/lib/calculate-size';
import { BuildTitle } from '@/components/app/build-title';
import { ClientBanner } from '@/components/modules/client-banner';

export const Route = createFileRoute('/home')({
  component: RouteComponent,

  loader: async ({ context }) => {
    const { queryClient, country } = context;

    const [eventsData] = await Promise.allSettled([
      queryClient.fetchQuery({
        queryKey: ['promotions'],
        queryFn: () =>
          httpClient.get<FullTag[]>('/promotions').catch((error) => {
            console.error('Failed to fetch events', error);
            return { data: [] as FullTag[] };
          }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['giveaways'],
        queryFn: () =>
          httpClient.get<GiveawayOffer[]>('/free-games', {
            params: {
              country,
            },
          }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['featuredDiscounts', { country, limit: 5 }],
        queryFn: () => getFeaturedDiscounts({ country, limit: 5 }),
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

    const events = eventsData.status === 'fulfilled' ? eventsData.value : [];

    return {
      events,
    };
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
    item: { title: string; developer?: string };
    downloadSizeBytes: number;
    createdAt: string;
    buildVersion?: string;
  }>;
}) {
  const build = builds.find((b) => b._id === id);

  if (!build) return null;

  return (
    <div className="bg-slate-800 border-slate-700 text-slate-200 p-4 space-y-3 w-full h-fit border rounded-md">
      <h3 className="text-xl font-bold text-white">{build.item.title}</h3>

      <div className="text-sm space-y-1 text-slate-300">
        <p>
          <span className="text-slate-400">Build ID:</span> {build._id}
        </p>
        <p>
          <span className="text-slate-400">Size:</span>{' '}
          {calculateSize(build.downloadSizeBytes)}
        </p>
        <p>
          <span className="text-slate-400">Created:</span>{' '}
          {DateTime.fromISO(build.createdAt).toLocaleString(
            DateTime.DATETIME_MED,
          )}
        </p>
        {build.item.developer && (
          <p>
            <span className="text-slate-400">Developer:</span>{' '}
            {build.item.developer}
          </p>
        )}
        {build.buildVersion && (
          <p>
            <span className="text-slate-400">Version:</span>{' '}
            {build.buildVersion}
          </p>
        )}
      </div>
    </div>
  );
}

type HoverCardType = 'offer' | 'build' | 'none';

function renderHoverCard(
  type: HoverCardType,
  id: string,
  builds?: Array<{
    _id: string;
    item: { title: string; developer?: string };
    downloadSizeBytes: number;
    createdAt: string;
    buildVersion?: string;
  }>,
) {
  switch (type) {
    case 'offer':
      return <OfferHoverCard id={id} />;
    case 'build':
      return builds ? <BuildHoverCard id={id} builds={builds} /> : null;
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
    featuredDiscountsQuery,
    latestGamesQuery,
    upcomingQuery,
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
          httpClient.get<GiveawayOffer[]>('/free-games', {
            params: {
              country,
            },
          }),
        placeholderData: [],
      },
      {
        queryKey: ['featuredDiscounts', { country, limit: 5 }],
        queryFn: () => getFeaturedDiscounts({ country, limit: 5 }),
        placeholderData: [],
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
  const { data: featuredOffers = [] } = featuredDiscountsQuery;
  const { data: latestOffers = [] } = latestGamesQuery;
  const { data: upcomingOffers = { elements: [] } } = upcomingQuery;
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
    builds,
  }: {
    headers: string[];
    rows: (string | number | JSX.Element)[][];
    hoverCardType?: HoverCardType;
    builds?: Array<{
      _id: string;
      item: { title: string; developer?: string };
      downloadSizeBytes: number;
      createdAt: string;
      buildVersion?: string;
    }>;
  }) => {
    const TableContent = (
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h} className="text-neutral-400 font-normal">
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
                {cells.map((cell, j) => (
                  <TableCell
                    key={`${id}-${headers[j - 1]}`}
                    className={cn(
                      'whitespace-nowrap',
                      isImage(cell) && 'w-32',
                      isElement(cell) && !isImage(cell) && 'p-0',
                    )}
                  >
                    {isImage(cell) ? (
                      <div className="flex items-center justify-start">
                        <div className="w-24 h-12 rounded overflow-hidden bg-neutral-800/40 flex items-center justify-center">
                          {cell}
                        </div>
                      </div>
                    ) : (
                      cell
                    )}
                  </TableCell>
                ))}
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
                  {renderHoverCard(hoverCardType, id as string, builds)}
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </TableBody>
      </Table>
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
        <ScrollArea className="h-[650px] p-4">{children}</ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="space-y-4">
          <h1 className="text-4xl font-semiboold tracking-tight sm:text-5xl md:text-6xl font-montserrat">
            egdata.app
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground sm:text-xl">
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
              placeholder="Search games, offers, or publishers..."
              className="pl-10 h-12 text-base cursor-text"
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

      {/* Offer cards grid */}
      <div className="grid auto-rows-[1fr] gap-6 sm:grid-cols-1 md:grid-cols-2">
        {/* Giveaways Stats Section */}
        <Section title="Giveaway Stats" href="/freebies">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-full flex items-center justify-center h-[500px]">
              <GiveawaysStats showTitle={false} wrap />
            </div>
          </div>
        </Section>
        <Section title="Giveaway Offers" href="/freebies">
          <SimpleTable
            headers={['#', 'Title', 'Starts', 'Ends']}
            rows={giveawayOffers.map((g) => [
              g.id,
              <Link
                key={`feebies-image-${g.id}`}
                to="/offers/$id"
                params={{
                  id: g.id,
                }}
                className="w-[40px] h-[52px]"
              >
                <img
                  src={
                    getImage(g.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={g.title}
                  className="w-[40px] h-[52px]"
                />
              </Link>,
              <Link
                key={`feebies-title-${g.id}`}
                to="/offers/$id"
                params={{
                  id: g.id,
                }}
              >
                {g.title}
              </Link>,
              g.giveaway.startDate ? formatDate(g.giveaway.startDate) : 'N/A',
              g.giveaway.endDate ? formatDate(g.giveaway.endDate) : 'N/A',
            ])}
          />
        </Section>
        <Section title="Featured Offers (Discounts)">
          <SimpleTable
            headers={['#', 'Title', 'Discount', 'Price']}
            rows={featuredOffers.slice(0, 10).map((o) => [
              o.id,
              <Link
                key={o.id}
                to="/offers/$id"
                params={{
                  id: o.id,
                }}
                className="w-[40px] h-[52px]"
              >
                <img
                  src={
                    getImage(o.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={o.title}
                  className="w-[40px] h-[52px]"
                />
              </Link>,
              <Link
                key={`feebies-title-${o.id}`}
                to="/offers/$id"
                params={{
                  id: o.id,
                }}
              >
                {o.title ?? 'N/A'}
              </Link>,
              o.price?.price.originalPrice && o.price.price.discountPrice
                ? `${Math.round(((o.price.price.originalPrice - o.price.price.discountPrice) / o.price.price.originalPrice) * 100)}%`
                : 'N/A',
              Intl.NumberFormat(locale, {
                style: 'currency',
                currency: o.price?.price.currencyCode ?? 'US',
              }).format(
                calculatePrice(
                  o.price?.price.discountPrice ?? 0,
                  o.price?.price.currencyCode ?? 'US',
                ),
              ),
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
            headers={['#', 'Title', 'Release', 'Price']}
            rows={latestOffers.slice(0, 10).map((o) => [
              o.id,
              <Link
                key={o.id}
                to="/offers/$id"
                params={{
                  id: o.id,
                }}
                className="w-[40px] h-[52px]"
              >
                <img
                  src={
                    getImage(o.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={o.title}
                  className="w-[40px] h-[52px]"
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
              o.releaseDate ? formatDate(o.releaseDate) : 'N/A',
              Intl.NumberFormat(locale, {
                style: 'currency',
                currency: o.price?.price.currencyCode ?? 'US',
              }).format(
                calculatePrice(
                  o.price?.price.discountPrice ?? 0,
                  o.price?.price.currencyCode ?? 'US',
                ),
              ),
            ])}
          />
        </Section>
        <Section
          title="Upcoming Offers"
          href="/search"
          search={{
            sortBy: 'upcoming',
          }}
        >
          <SimpleTable
            headers={['#', 'Date', 'Title', 'Price']}
            rows={upcomingOffers.elements.slice(0, 10).map((u) => [
              u.id,
              <Link
                key={u.id}
                to="/offers/$id"
                params={{
                  id: u.id,
                }}
                className="w-[40px] h-[52px]"
              >
                <img
                  src={
                    getImage(u.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={u.title}
                  className="w-[40px] h-[52px]"
                />
              </Link>,
              u.releaseDate ? formatDate(u.releaseDate) : 'N/A',
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
                currency: u.price?.price.currencyCode ?? 'US',
              }).format(
                calculatePrice(
                  u.price?.price.discountPrice ?? 0,
                  u.price?.price.currencyCode ?? 'US',
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
            headers={['#', 'Title', 'Achievements', 'XP']}
            rows={achievementOffers.slice(0, 10).map((a) => {
              const totalXP = a.achievements.achievements.reduce(
                (sum, achievement) => sum + achievement.xp,
                0,
              );
              const numAchievements = a.achievements.achievements.length;

              return [
                a.id,
                <Link
                  key={a.id}
                  to="/offers/$id"
                  params={{
                    id: a.id,
                  }}
                  className="w-[40px] h-[52px]"
                >
                  <img
                    src={
                      getImage(a.keyImages, [
                        'DieselGameBoxTall',
                        'OfferImageTall',
                      ])?.url ?? '/placeholder.webp'
                    }
                    alt={a.title}
                    className="w-[40px] h-[52px]"
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
                <p key={`achievement-num-${a.id}`} className="text-center">
                  {numAchievements}
                </p>,
                <p key={`achievement-xp-${a.id}`}>
                  {totalXP.toLocaleString()} XP
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
            headers={['#', '', 'Title', 'Developer']}
            rows={topSellerOffers.slice(0, 10).map((t, i) => [
              t.id,
              i + 1,
              <Link
                key={t.id}
                to="/offers/$id"
                params={{
                  id: t.id,
                }}
                className="w-[40px] h-[52px]"
              >
                <img
                  src={
                    getImage(t.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={t.title}
                  className="w-[40px] h-[52px]"
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
              t.developerDisplayName ?? t.seller.name,
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
                className="w-[40px] h-[52px]"
              >
                <img
                  src={
                    getImage(b.item.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url ?? '/placeholder.webp'
                  }
                  alt={b.item.title}
                  className="w-[40px] h-[52px]"
                />
              </Link>,
              <BuildTitle
                key={b._id}
                id={b._id}
                title={b.item.title}
                buildVersion={b.buildVersion}
              />,
              calculateSize(b.downloadSizeBytes),
              formatDate(b.createdAt),
            ])}
            hoverCardType="build"
            builds={latestBuilds}
          />
        </Section>

        {/* Latest Changes full width */}
        {/* <Section title="Latest Changes" spanFull>
          <SimpleTable
            headers={['Time', 'Offer']}
            rows={latestChanges.map((c) => [
              c.id,
              c.lastModifiedDate ? formatDate(c.lastModifiedDate) : 'N/A',
              c.title ?? 'N/A',
            ])}
          />
        </Section> */}
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
