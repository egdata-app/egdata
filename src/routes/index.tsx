import { createFileRoute } from '@tanstack/react-router';
import { getLatestOffers } from '@/queries/latest-offers';
import { getFeaturedDiscounts } from '@/queries/featured-discounts';
import { httpClient } from '@/lib/http-client';
import type { FullTag } from '@/types/tags';
import type { GiveawayOffer } from '@/types/giveaways';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { XCircle } from 'lucide-react';
import { GiveawaysCarousel } from '@/components/modules/giveaways';
import { GamesWithAchievements } from '@/components/modules/achievements-blade';
import { ChangelistModule } from '@/components/modules/changelist';
import { FeaturedDiscounts } from '@/components/modules/featured-discounts';
import { LastModifiedGames } from '@/components/modules/last-modified-offers';
import { LatestOffers } from '@/components/modules/latest-offers';
import { LatestReleased } from '@/components/modules/latest-released';
import { SalesModule } from '@/components/modules/sales';
import { StatsModule } from '@/components/modules/stats';
import { TopSection } from '@/components/modules/top-section';
import { UpcomingOffers } from '@/components/modules/upcoming';
import { UpcomingCalendar } from '@/components/modules/upcoming-calendar';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: () => {
    return <Home />;
  },
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
        queryKey: ['featuredDiscounts', { country }],
        queryFn: () => getFeaturedDiscounts({ country }),
        staleTime: 6000,
      }),
      queryClient.prefetchQuery({
        queryKey: ['latest-games'],
        queryFn: () => getLatestOffers(country),
      }),
    ]);

    const events = eventsData.status === 'fulfilled' ? eventsData.value : [];

    return {
      events: events,
    };
  },
  errorComponent: ({ error, reset }) => {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <Button onClick={reset}>Try again</Button>
      </Alert>
    );
  },
});

function Home() {
  const { events } = Route.useLoaderData();
  const sections = [
    {
      key: 'featuredDiscounts',
      component: <FeaturedDiscounts key={'featuredDiscounts'} />,
    },
    {
      key: 'giveaways',
      component: <GiveawaysCarousel key={'giveaways'} />,
    },
    { key: 'latest', component: <LatestOffers key={'latest'} /> },
    {
      key: 'latestReleased',
      component: <LatestReleased key={'latestReleased'} />,
    },
    {
      key: 'upcomingCalendar',
      component: <UpcomingCalendar key={'upcomingCalendar'} />,
    },
    {
      key: 'upcomingOffers',
      component: <UpcomingOffers key={'upcomingOffers'} />,
    },
    {
      key: 'lastModified',
      component: <LastModifiedGames key={'lastModified'} />,
    },
    {
      key: 'topWishlisted',
      component: (
        <TopSection
          key={'topWishlisted'}
          slug="top-wishlisted"
          title="Most Anticipated"
          side="right"
        />
      ),
    },
    {
      key: 'achievements',
      component: <GamesWithAchievements key={'achievements'} />,
    },
    {
      key: 'topSeller',
      component: (
        <TopSection
          key={'topSeller'}
          slug="top-sellers"
          title="Top Seller"
          side="left"
        />
      ),
    },
    {
      key: 'event1',
      component: events[0] ? (
        <SalesModule
          key={'event1'}
          event={events[0].name}
          eventId={events[0].id}
        />
      ) : null,
    },

    {
      key: 'event3',
      component: events[2] ? (
        <SalesModule
          key={'event3'}
          event={events[2].name}
          eventId={events[2].id}
        />
      ) : null,
    },
    {
      key: 'statsCombined',
      component: (
        <section
          key={'statsCombined'}
          className="w-full flex md:flex-row justify-between gap-10 flex-col"
        >
          <StatsModule />
          <ChangelistModule />
        </section>
      ),
    },
  ];

  return (
    <main className="flex flex-col items-center justify-start h-full gap-5 p-4">
      {sections.map((section) => section?.component)}
    </main>
  );
}
