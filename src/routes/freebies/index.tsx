import { DynamicPagination } from '@/components/app/dynamic-pagination';
import { OfferListItem } from '@/components/app/game-card';
import { OfferCard } from '@/components/app/offer-card';
import { EGSIcon } from '@/components/icons/egs';
import { GiveawaysCarousel } from '@/components/modules/giveaways';
import { MobileFreebiesCarousel } from '@/components/modules/mobile-freebies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCountry } from '@/hooks/use-country';
import { usePreferences } from '@/hooks/use-preferences';
import { calculatePrice } from '@/lib/calculate-price';
import { getQueryClient } from '@/lib/client';
import getCountryCode from '@/lib/get-country-code';
import { httpClient } from '@/lib/http-client';
import { offersDictionary } from '@/lib/offers-dictionary';
import { parseCookieString } from '@/lib/parse-cookies';
import { cn } from '@/lib/utils';
import type { GiveawayOffer } from '@/types/giveaways';
import type { Price } from '@/types/price';
import type { SingleOffer } from '@/types/single-offer';
import { ListBulletIcon } from '@radix-ui/react-icons';
import {
  dehydrate,
  HydrationBoundary,
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useDebounce } from '@uidotdev/usehooks';
import {
  freebiesSearchStore,
  freebiesFormSchema,
} from '@/stores/freebiesSearchStore';
import { useStore } from '@tanstack/react-store';
import { ArrowDown, GridIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getBuyLink } from '@/lib/get-build-link';
import { useLocale } from '@/hooks/use-locale';
import consola from 'consola';
import { mobileFreebiesQuery } from '@/queries/mobile-freebies';

const sortByList: Record<string, string> = {
  giveawayDate: 'Giveaway Date',
  releaseDate: 'Release Date',
  lastModifiedDate: 'Modified Date',
  effectiveDate: 'Effective Date',
  creationDate: 'Creation Date',
  viewableDate: 'Viewable Date',
  price: 'Price',
};

interface SearchGiveawaysParams {
  query?: string;
  sortBy: keyof typeof sortByList;
  sortDir: 'asc' | 'desc';
  offerType?: keyof typeof offersDictionary;
  country: string;
  page: number;
  year?: number;
}

const searchGiveaways = async ({
  query,
  sortBy,
  sortDir,
  offerType,
  country,
  page,
  year,
}: SearchGiveawaysParams): Promise<{
  elements: SingleOffer[];
  page: number;
  limit: number;
  total: number;
}> => {
  const res = await httpClient.get<{
    elements: SingleOffer[];
    page: number;
    limit: number;
    total: number;
  }>('/free-games/search', {
    params: {
      title: query ?? undefined,
      sortBy,
      sortDir,
      offerType,
      country,
      limit: 25,
      page,
      year,
    },
  });

  return res;
};

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

  validateSearch: (search) => freebiesFormSchema.parse(search),

  beforeLoad: (ctx) => {
    const { search } = ctx;
    return {
      search,
    };
  },

  loader: async ({ context }) => {
    const client = getQueryClient();

    let url: URL;
    let cookieHeader: string;

    if (import.meta.env.SSR) {
      const { getEvent } = await import('@tanstack/react-start/server');
      const event = getEvent();
      url = new URL(`https://egdata.app${event.node.req.url}`);
      cookieHeader = event.headers.get('Cookie') ?? '';
    } else {
      url = new URL(window.location.href);
      cookieHeader = document.cookie;
    }

    if (typeof cookieHeader !== 'string') {
      cookieHeader = '';
    }

    const parsedCookies = parseCookieString(cookieHeader);
    const cookies = Object.fromEntries(
      Object.entries(parsedCookies).map(([key, value]) => [key, value || '']),
    );
    const country = getCountryCode(url, cookies);

    const {
      page = 1,
      query = undefined,
      sortBy = 'giveawayDate',
      offerType = undefined,
      sortDir = 'desc',
      year = undefined,
    } = context.search;

    await Promise.all([
      client.prefetchQuery({
        queryKey: ['search-giveaways', context.search],
        queryFn: () =>
          searchGiveaways({
            query,
            sortBy,
            sortDir,
            offerType: offerType as keyof typeof offersDictionary | undefined,
            country,
            page,
            year,
          }),
      }),
      client.prefetchQuery({
        queryKey: ['giveaways-stats', { country }],
        queryFn: () => getGiveawaysStats({ country }),
      }),
      client.prefetchQuery({
        queryKey: ['giveaways'],
        queryFn: () =>
          httpClient.get<GiveawayOffer[]>('/free-games', {
            params: {
              country,
            },
          }),
      }),
      client.prefetchQuery(mobileFreebiesQuery),
    ]);

    const ogId = await httpClient.get<{ id: string }>('/free-games/og');

    return {
      dehydratedState: dehydrate(client),
      page,
      query,
      sortBy,
      offerType,
      sortDir,
      year,
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
  const { view, setView } = usePreferences();
  const { country } = useCountry();
  const years = useMemo(() => getYearsFrom2018ToCurrent(), []);
  const navigate = Route.useNavigate();
  const freebiesQuery = useStore(freebiesSearchStore);
  const setField = (
    field: keyof typeof freebiesQuery,
    value: (typeof freebiesQuery)[keyof typeof freebiesQuery],
  ) => {
    freebiesSearchStore.setState((prev) => ({ ...prev, [field]: value }));
  };
  const debouncedSearch = useDebounce(freebiesQuery, 300);

  // Stable query key object
  const stableQueryKey = useMemo(
    () => ({
      page: debouncedSearch.page ?? 1,
      query: debouncedSearch.query ?? undefined,
      sortBy: debouncedSearch.sortBy ?? 'giveawayDate',
      offerType: debouncedSearch.offerType ?? undefined,
      sortDir: debouncedSearch.sortDir ?? 'desc',
      year: debouncedSearch.year ?? undefined,
    }),
    [
      debouncedSearch.page,
      debouncedSearch.query,
      debouncedSearch.sortBy,
      debouncedSearch.offerType,
      debouncedSearch.sortDir,
      debouncedSearch.year,
    ],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['search-giveaways', stableQueryKey],
    queryFn: () =>
      searchGiveaways({
        query: stableQueryKey.query,
        sortBy: stableQueryKey.sortBy as keyof typeof sortByList,
        sortDir: stableQueryKey.sortDir as 'asc' | 'desc',
        offerType: stableQueryKey.offerType as
          | keyof typeof offersDictionary
          | undefined,
        country,
        page: stableQueryKey.page,
        year: stableQueryKey.year,
      }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    navigate({
      search: stableQueryKey,
      resetScroll: false,
    });
  }, [stableQueryKey, navigate]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!data) {
    return <p>No data</p>;
  }

  const totalPages = useMemo(
    () => Math.ceil((data?.total ?? 0) / (data?.limit ?? 0)),
    [data?.total, data?.limit],
  );

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setField('page', newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col items-start justify-start h-full gap-4 p-4">
      <GiveawaysStats />
      <div className="flex flex-row justify-between items-center gap-4 w-full">
        <h2 className="text-xl font-semibold mb-4">Current Free Games</h2>
        <Button
          className="bg-black text-white hover:bg-card border inline-flex items-center gap-2 w-fit"
          onClick={() => {
            const proxy = window.open(
              getBuyLink({
                // Get the offers that are available right now
                offers: data.elements.filter((offer) => {
                  if (!offer.giveaway) return false;
                  const startDate = new Date(offer.giveaway.startDate);
                  const endDate = new Date(offer.giveaway.endDate);
                  const now = new Date();

                  const isOnGoing = startDate < now && endDate > now;

                  if (isOnGoing) {
                    return true;
                  }

                  return false;
                }),
              }),
              '_blank',
              'width=1000,height=700',
            );

            if (proxy) {
              proxy.focus();
              proxy.onclose = () => {
                window.location.reload();
              };
            } else {
              consola.error('Failed to open window');
            }
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
      <header className="flex flex-row justify-between items-center gap-4 w-full">
        <h2 className="text-xl font-semibold">Past Free Games</h2>
        <div id="filters" className="flex flex-row gap-2 items-center">
          <Input
            type="search"
            placeholder="Search for games"
            onChange={(e) => setField('query', e.target.value)}
            value={freebiesQuery.query ?? ''}
          />
          <Select
            value={
              freebiesQuery.offerType ? String(freebiesQuery.offerType) : ''
            }
            onValueChange={(value) => setField('offerType', value || undefined)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue className="text-sm" placeholder="All">
                {freebiesQuery.offerType
                  ? (offersDictionary[
                      freebiesQuery.offerType as keyof typeof offersDictionary
                    ] ?? freebiesQuery.offerType)
                  : 'All'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined as unknown as string}>
                All
              </SelectItem>
              {Object.entries(offersDictionary)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .filter(([key]) => key !== 'null' && key !== 'undefined')
                .map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={
              freebiesQuery.sortBy
                ? String(freebiesQuery.sortBy)
                : 'giveawayDate'
            }
            onValueChange={(value) => setField('sortBy', value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue className="text-sm">
                {sortByList[
                  (freebiesQuery.sortBy ??
                    'giveawayDate') as keyof typeof sortByList
                ] ?? freebiesQuery.sortBy}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortByList).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={freebiesQuery.year ? String(freebiesQuery.year) : ''}
            onValueChange={(value) => setField('year', value || undefined)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue className="text-sm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined as unknown as string}>
                All Years
              </SelectItem>
              {years
                .sort((a, b) => b - a)
                .map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="h-9 w-9 p-0"
            onClick={() =>
              setField(
                'sortDir',
                (freebiesQuery.sortDir ?? 'desc') === 'asc' ? 'desc' : 'asc',
              )
            }
          >
            <ArrowDown
              className={cn(
                'h-5 w-5 m-2 transition-transform ease-in-out duration-300',
                {
                  '-rotate-180': (freebiesQuery.sortDir ?? 'desc') === 'asc',
                },
              )}
            />
          </Button>
          <Button
            variant="outline"
            className="h-9 w-9 p-0 hidden md:flex"
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          >
            {view === 'grid' ? (
              <ListBulletIcon className="size-5 m-2" aria-hidden="true" />
            ) : (
              <GridIcon className="size-5 m-2" aria-hidden="true" />
            )}
          </Button>
        </div>
      </header>
      <section
        className={cn(
          'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 mt-4 w-full',
          view === 'list' ? 'flex flex-col gap-4' : '',
        )}
      >
        {data.elements?.map((game) => {
          if (view === 'grid') {
            return <OfferCard key={game._id} offer={game} size="md" />;
          }
          return <OfferListItem key={game._id} game={game} />;
        })}
      </section>
      <DynamicPagination
        currentPage={freebiesQuery.page ?? 1}
        setPage={handlePageChange}
        totalPages={totalPages}
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

function getYearsFrom2018ToCurrent(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];

  for (let year = 2018; year <= currentYear; year++) {
    years.push(year);
  }

  return years;
}
