import { EGSIcon } from '@/components/icons/egs';
import { GiveawaysCarousel } from '@/components/modules/giveaways';
import { MobileFreebiesCarousel } from '@/components/modules/mobile-freebies';
import { SearchContainer } from '@/components/search/SearchContainer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCountry } from '@/hooks/use-country';
import { calculatePrice } from '@/lib/calculate-price';
import { httpClient } from '@/lib/http-client';
import { cn } from '@/lib/utils';
import type { GiveawayOffer } from '@/types/giveaways';
import type { Price } from '@/types/price';
import { dehydrate, HydrationBoundary, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getBuyLink } from '@/lib/get-build-link';
import { useLocale } from '@/hooks/use-locale';
import { mobileFreebiesQuery } from '@/queries/mobile-freebies';
import { formSchema } from '@/stores/searchStore';

const getGiveawaysStats = async ({ country }: { country: string }) => {
  const res = await httpClient.get<{
    totalValue: Price['price'];
    totalGiveaways: number;
    totalOffers: number;
    repeated: number;
    sellers: number;
  }>('/free-games/stats', {
    params: {
      country,
    },
  });

  return res;
};

export const Route = createFileRoute('/freebies/')({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();
    return (
      <HydrationBoundary state={dehydratedState}>
        <FreeGames />
      </HydrationBoundary>
    );
  },

  validateSearch: (search) => formSchema.parse(search),

  beforeLoad: (ctx) => {
    const { search } = ctx;
    return {
      search,
    };
  },

  loader: async ({ context }) => {
    const { country, queryClient } = context;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['giveaways-stats', { country }],
        queryFn: () => getGiveawaysStats({ country }),
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
      queryClient.prefetchQuery(mobileFreebiesQuery),
    ]);

    const ogId = await httpClient.get<{ id: string }>('/free-games/og');

    return {
      dehydratedState: dehydrate(queryClient),
      og: ogId.id,
    };
  },

  head: (ctx) => {
    const { loaderData } = ctx;

    const ogImage =
      'https://cdn.egdata.app/cdn-cgi/imagedelivery/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>'
        .replace('<ACCOUNT_HASH>', 'RlN2EBAhhGSZh5aeUaPz3Q')
        .replace('<IMAGE_ID>', String(loaderData?.og ?? ''))
        .replace('<VARIANT_NAME>', 'og');

    return {
      meta: [
        {
          title: 'Free Games | egdata.app',
        },
        {
          name: 'description',
          content: 'Browse free games from the Epic Games Store.',
        },
        {
          name: 'og:title',
          content: 'Free Games | egdata.app',
        },
        {
          name: 'og:description',
          content: 'Browse free games from the Epic Games Store.',
        },
        {
          property: 'twitter:title',
          content: 'Free Games | egdata.app',
        },
        {
          property: 'twitter:description',
          content: 'Browse free games from the Epic Games Store.',
        },
        {
          property: 'og:image',
          content: ogImage,
        },
        {
          property: 'og:image:alt',
          content: 'Free Games | egdata.app',
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          property: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          property: 'twitter:image',
          content: ogImage,
        },
      ],
    };
  },
});

function FreeGames() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="flex flex-col items-start justify-start h-full gap-4 p-4">
      <GiveawaysStats />
      <div className="flex flex-row justify-between items-center gap-4 w-full">
        <h2 className="text-xl font-semibold mb-4">Current Free Games</h2>
        <Button
          className="bg-black text-white hover:bg-card border inline-flex items-center gap-2 w-fit"
          onClick={() => {
            // TODO: Implement redeem functionality for current free games
            console.log('Redeem current free games');
          }}
        >
          <EGSIcon className="w-5 h-5" />
          <span>Redeem Now</span>
        </Button>
      </div>
      <GiveawaysCarousel hideTitle={true} />
      <Separator orientation="horizontal" className="my-4" />
      <MobileFreebiesCarousel />
      <Separator orientation="horizontal" className="my-4" />
      <SearchContainer
        contextId="freebies"
        initialSearch={search}
        fixedParams={{ pastGiveaways: true, sortBy: 'giveawayDate' }}
        onSearchChange={(s) => {
          navigate({
            search: s,
            resetScroll: false,
          });
        }}
        title="Past Free Games"
        controls={{
          showPastGiveaways: false, // Hide this filter since it's fixed to true
        }}
      />
    </div>
  );
}

function GiveawaysStats() {
  const { country } = useCountry();
  const { locale } = useLocale();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['giveaways-stats', { country }],
    queryFn: () => getGiveawaysStats({ country }),
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className="flex flex-col items-start justify-start gap-4 w-full">
      <h2 className="text-xl font-semibold">Giveaways in numbers</h2>
      <div className="flex flex-row items-center justify-center gap-10 bg-card rounded-lg p-4 w-full">
        <TooltipProvider>
          <Tooltip>
            <div className="flex flex-col items-center justify-center gap-2">
              <BigText
                value={calculatePrice(
                  data.totalValue.originalPrice,
                  data.totalValue.currencyCode,
                ).toLocaleString(locale, {
                  style: 'currency',
                  currency: data.totalValue.currencyCode,
                })}
                className="text-4xl font-semibold"
              />
              <TooltipTrigger>
                <span className="text-lg font-medium text-gray-400 decoration-dotted decoration-gray-400/50 underline underline-offset-4">
                  Total Value
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-row items-center gap-1">
                  <span className="text-xs font-medium">
                    {calculatePrice(
                      data.totalValue.discountPrice,
                      data.totalValue.currencyCode,
                    ).toLocaleString(locale, {
                      style: 'currency',
                      currency: data.totalValue.currencyCode,
                    })}
                  </span>
                  <span className="text-xs font-medium">
                    Total value including any active discounts
                  </span>
                </div>
              </TooltipContent>
            </div>
          </Tooltip>

          <Tooltip>
            <div className="flex flex-col items-center justify-center gap-2">
              <BigText
                value={data.totalGiveaways.toLocaleString(locale)}
                className="text-4xl font-semibold"
              />
              <TooltipTrigger>
                <span className="text-lg font-medium text-gray-400 decoration-dotted decoration-gray-400/50 underline underline-offset-4">
                  Giveaways
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs font-medium">
                  Total number of giveaways that appear in the database
                </span>
              </TooltipContent>
            </div>
          </Tooltip>

          <Tooltip>
            <div className="flex flex-col items-center justify-center gap-2">
              <BigText
                value={data.totalOffers.toLocaleString(locale)}
                className="text-4xl font-semibold"
              />
              <TooltipTrigger>
                <span className="text-lg font-medium text-gray-400 decoration-dotted decoration-gray-400/50 underline underline-offset-4">
                  Offers
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs font-medium">
                  Total number of unique offers that have appeared in giveaways
                </span>
              </TooltipContent>
            </div>
          </Tooltip>

          <Tooltip>
            <div className="flex flex-col items-center justify-center gap-2">
              <BigText
                value={data.repeated.toLocaleString(locale)}
                className="text-4xl font-semibold"
              />
              <TooltipTrigger>
                <span className="text-lg font-medium text-gray-400 decoration-dotted decoration-gray-400/50 underline underline-offset-4">
                  Repeated
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs font-medium">
                  Number of unique offers that appear multiple times in
                  giveaways
                </span>
              </TooltipContent>
            </div>
          </Tooltip>

          <Tooltip>
            <Link
              className="flex flex-col items-center justify-center gap-2"
              to="/freebies/sellers"
            >
              <BigText
                value={data.sellers.toLocaleString(locale)}
                className="text-4xl font-semibold"
              />
              <TooltipTrigger>
                <span className="text-lg font-medium text-gray-400 decoration-underline decoration-gray-400/50 underline underline-offset-4">
                  Sellers
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs font-medium">
                  Total number of unique sellers providing offers
                </span>
              </TooltipContent>
            </Link>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

function BigText({
  value,
  className,
}: {
  value: string | number;
  className?: string;
}) {
  return <span className={className}>{value}</span>;
}
