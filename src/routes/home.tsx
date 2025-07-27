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
import { useQueries } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  type LinkComponentProps,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { DateTime } from 'luxon';

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
        queryKey: ['latest-released', { country }],
        queryFn: () => getLatestReleased({ country }),
      }),
      queryClient.prefetchQuery({
        queryKey: ['offers-with-achievements', { country }],
        queryFn: () => getOffersWithAchievements(country),
      }),
      queryClient.prefetchQuery({
        queryKey: ['top-sellers', { country }],
        queryFn: () => getTopSellers(country),
      }),
      queryClient.prefetchQuery({
        queryKey: ['last-modified', { country }],
        queryFn: () => getLastModified(country),
      }),
      queryClient.prefetchQuery({
        queryKey: ['stats', { country }],
        queryFn: () => getStats({ country }),
      }),
    ]);

    const events = eventsData.status === 'fulfilled' ? eventsData.value : [];

    return {
      events,
    };
  },
});

function RouteComponent() {
  const { timezone } = useLocale();
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
    return DateTime.fromISO(iso)
      .setZone(timezone)
      .toFormat('MMM d, HH:mm');
  }

  const SimpleTable = ({
    headers,
    rows,
  }: { headers: string[]; rows: (string | number)[][] }) => (
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
          {rows.map((cells) => (
            <tr
              key={cells.join('-')}
              className="border-b border-neutral-800 hover:bg-neutral-800/60"
            >
              {cells.map((cell, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                <td key={j} className="px-3 py-2 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
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
  }: {
    title: string;
    children: ReactNode;
    spanFull?: boolean;
    href?: LinkComponentProps['to'];
    search?: LinkComponentProps['search'];
    params?: LinkComponentProps['params'];
  }) => (
    <Card
      className={`flex flex-col rounded-lg border ${spanFull ? 'md:col-span-2' : ''} h-[500px]`}
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
        <ScrollArea className="h-[450px] p-4">{children}</ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-10 px-6 py-8">
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
        <Section title="Featured Offers (Discounts)">
          <SimpleTable
            headers={['Offer', 'Developer', 'Release', 'Discount', 'Price']}
            rows={featuredOffers
              .slice(0, 10)
              .map((o) => [
                o.title ?? 'N/A',
                o.developerDisplayName ?? 'N/A',
                o.releaseDate ? formatDate(o.releaseDate) : 'N/A',
                o.price?.price.discount ? `-${o.price.price.discount}%` : 'N/A',
                o.price?.price.discountPrice ?? 'N/A',
              ])}
          />
        </Section>
        <Section title="Giveaway Offers" href="/freebies">
          <SimpleTable
            headers={['Title', 'Starts', 'Ends']}
            rows={giveawayOffers
              .slice(0, 10)
              .map((g) => [
                g.title ?? 'N/A',
                g.giveaway.startDate ? formatDate(g.giveaway.startDate) : 'N/A',
                g.giveaway.endDate ? formatDate(g.giveaway.endDate) : 'N/A',
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
            headers={['Offer', 'Developer', 'Release', 'Price']}
            rows={latestOffers
              .slice(0, 10)
              .map((o) => [
                o.title ?? 'N/A',
                o.developerDisplayName ?? 'N/A',
                o.releaseDate ? formatDate(o.releaseDate) : 'N/A',
                o.price?.price.discountPrice ?? 'N/A',
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
            headers={['Date', 'Offer', 'Developer']}
            rows={upcomingOffers.elements
              .slice(0, 10)
              .map((u) => [
                u.releaseDate ? formatDate(u.releaseDate) : 'N/A',
                u.title ?? 'N/A',
                u.developerDisplayName ?? 'N/A',
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
            headers={['Offer', 'Developer']}
            rows={achievementOffers
              .slice(0, 10)
              .map((a) => [a.title ?? 'N/A', a.developerDisplayName ?? 'N/A'])}
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
            headers={['Offer', 'Developer', 'Price']}
            rows={topSellerOffers
              .slice(0, 10)
              .map((t) => [
                t.title ?? 'N/A',
                t.developerDisplayName ?? 'N/A',
                t.price?.price.discountPrice ?? 'N/A',
              ])}
          />
        </Section>

        {/* Latest Changes full width */}
        <Section title="Latest Changes" spanFull>
          <SimpleTable
            headers={['Time', 'Offer']}
            rows={latestChanges.map((c) => [
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
