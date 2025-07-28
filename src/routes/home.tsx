import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
            ])?.url ?? '/placeholder-1080.webp'
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

function RouteComponent() {
  const { timezone, locale } = useLocale();
  const { country } = useCountry();
  const [
    freebiesQuery,
    featuredDiscountsQuery,
    latestGamesQuery,
    upcomingQuery,
    achievementsQuery,
    topSellersQuery,
    latestChangesQuery,
    statsQuery,
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

  function formatDate(iso: string) {
    return DateTime.fromISO(iso).setZone(timezone).toFormat('MMM d, HH:mm');
  }

  const SimpleTable = ({
    headers,
    rows,
  }: { headers: string[]; rows: (string | number | JSX.Element)[][] }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-neutral-800/60 text-neutral-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const [id, ...cells] = c;
            const isElement = (cell: string | number | JSX.Element) =>
              typeof cell === 'object' && 'props' in cell;
            const isImage = (cell: string | number | JSX.Element) =>
              isElement(cell) &&
              typeof cell === 'object' &&
              'type' in cell &&
              cell.type === Image;
            return (
              <HoverCard key={id as string} openDelay={300} closeDelay={200}>
                <HoverCardTrigger asChild>
                  <tr className="border-b border-neutral-800 hover:bg-neutral-800/60">
                    {cells.map((cell, j) => (
                      <td
                        key={`${id}-${headers[j - 1]}`}
                        className={cn(
                          'px-3 py-2 whitespace-nowrap',
                          isImage(cell) && 'px-2 py-2 w-32',
                          isElement(cell) && !isImage(cell) && 'px-0 py-0',
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
                      </td>
                    ))}
                  </tr>
                </HoverCardTrigger>
                <HoverCardContent
                  side="left"
                  align="start"
                  sideOffset={5}
                  className="w-80 bg-transparent p-0 border-0"
                >
                  <OfferHoverCard id={id as string} />
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </tbody>
      </table>
    </div>
  );

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
              <img
                key={g.id}
                src={
                  getImage(g.keyImages, ['DieselGameBoxTall', 'OfferImageTall'])
                    ?.url
                }
                alt={g.title}
                className="w-[40px] h-[52px]"
              />,
              g.title ?? 'N/A',
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
              <img
                key={o.id}
                src={
                  getImage(o.keyImages, ['DieselGameBoxTall', 'OfferImageTall'])
                    ?.url
                }
                alt={o.title}
                className="w-[40px] h-[52px]"
              />,
              o.title ?? 'N/A',
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
              <img
                key={o.id}
                src={
                  getImage(o.keyImages, ['DieselGameBoxTall', 'OfferImageTall'])
                    ?.url
                }
                alt={o.title}
                className="w-[40px] h-[52px]"
              />,
              o.title ?? 'N/A',
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
              <img
                key={u.id}
                src={
                  getImage(u.keyImages, ['DieselGameBoxTall', 'OfferImageTall'])
                    ?.url
                }
                alt={u.title}
                className="w-[40px] h-[52px]"
              />,
              u.releaseDate ? formatDate(u.releaseDate) : 'N/A',
              u.title ?? 'N/A',
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
            headers={['#', 'Title', 'Developer']}
            rows={achievementOffers
              .slice(0, 10)
              .map((a) => [
                a.id,
                <img
                  key={a.id}
                  src={
                    getImage(a.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url
                  }
                  alt={a.title}
                  className="w-[40px] h-[52px]"
                />,
                a.title ?? 'N/A',
                a.developerDisplayName ?? 'N/A',
              ])}
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
            headers={['#', 'Position', 'Title', 'Developer']}
            rows={topSellerOffers
              .slice(0, 10)
              .map((t, i) => [
                t.id,
                i + 1,
                <img
                  key={t.id}
                  src={
                    getImage(t.keyImages, [
                      'DieselGameBoxTall',
                      'OfferImageTall',
                    ])?.url
                  }
                  alt={t.title}
                  className="w-[40px] h-[52px]"
                />,
                t.title,
                t.developerDisplayName ?? t.seller.name,
              ])}
          />
        </Section>

        {/* Latest Changes full width */}
        <Section title="Latest Changes" spanFull>
          <SimpleTable
            headers={['Time', 'Offer']}
            rows={latestChanges.map((c) => [
              c.id,
              c.lastModifiedDate ? formatDate(c.lastModifiedDate) : 'N/A',
              c.title ?? 'N/A',
            ])}
          />
        </Section>
      </div>
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
