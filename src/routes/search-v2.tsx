import { useEffect, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { httpClient } from '@/lib/http-client';
import { dehydrate, keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { zodSearchValidator } from '@tanstack/router-zod-adapter';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import type { FullTag } from '@/types/tags';
import type { AggregationBuckets, SearchV2Response } from '@/types/search-v2';
import { Input } from '@/components/ui/input';
import { QuickPill } from '@/components/app/quick-pill';
import { Separator } from '@/components/ui/separator';
import { PriceRangeSlider } from '@/components/ui/price-range-slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CheckboxWithCount } from '@/components/app/checkbox-with-count';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExtendedSearch } from '@/components/app/extended-search';
import { Checkbox } from '@/components/ui/checkbox';
import { offersDictionary } from '@/lib/offers-dictionary';
import { usePreferences } from '@/hooks/use-preferences';
import { GameCardSkeleton, OfferCard } from '@/components/app/offer-card';
import { cn } from '@/lib/utils';
import { OfferListItem } from '@/components/app/game-card';
import { DynamicPagination } from '@/components/app/dynamic-pagination';
import { useDebounce } from '@uidotdev/usehooks';
import { useCountry } from '@/hooks/use-country';
import { useMemo } from 'react';
import type { SingleOffer } from '@/types/single-offer';
import { Button } from '@/components/ui/button';
import { ListBulletIcon } from '@radix-ui/react-icons';
import { GridIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDown } from 'lucide-react';
import { useStore } from '@tanstack/react-store';
import { searchStore, DEFAULT_LIMIT, formSchema } from '@/stores/searchStore';

export const Route = createFileRoute('/search-v2')({
  component: () => {
    return <RouteComponent />;
  },

  beforeLoad: ({ search }) => {
    return {
      search,
    };
  },

  loader: async ({ context }) => {
    const { country, queryClient, search } = context;

    const { page = 1, limit = DEFAULT_LIMIT } = search;

    const [tagsData] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['all-tags'],
        queryFn: () => httpClient.get<FullTag[]>('/search/tags?raw=true'),
      }),
      queryClient.ensureQueryData({
        queryKey: ['search-v2', search],
        queryFn: () =>
          httpClient.post<SearchV2Response>(
            `/search/v2/search?country=${country}`,
            search,
          ),
      }),
    ]);

    const tags = tagsData;

    return {
      tags,
      country,
      page,
      limit,
      dehydratedState: dehydrate(queryClient),
    };
  },

  validateSearch: zodSearchValidator(formSchema),

  loaderDeps(opts) {
    return {
      searchParams: opts.search,
    };
  },

  head() {
    return {
      meta: [
        {
          title: 'Search | egdata.app',
        },
        {
          name: 'description',
          content: 'Search for offers from the Epic Games Store.',
        },
        {
          name: 'og:title',
          content: 'Search | egdata.app',
        },
        {
          name: 'og:description',
          content: 'Search for offers from the Epic Games Store.',
        },
        {
          property: 'twitter:title',
          content: 'Search | egdata.app',
        },
        {
          property: 'twitter:description',
          content: 'Search for offers from the Epic Games Store.',
        },
      ],
    };
  },
});

const tagTypesDictionary = {
  event: 'Event',
  genre: 'Genre',
  epicfeature: 'Epic Feature',
  accessibility: 'Accessibility',
  feature: 'Feature',
  usersay: 'Usersay',
  subscription: 'Subscription',
  platform: 'Platform',
};

const sortByDisplay: Record<string, string> = {
  releaseDate: 'Release Date',
  lastModifiedDate: 'Modified Date',
  effectiveDate: 'Effective Date',
  creationDate: 'Creation Date',
  viewableDate: 'Viewable Date',
  pcReleaseDate: 'PC Release Date',
  upcoming: 'Upcoming',
  price: 'Price',
  discount: 'Discount',
  discountPercent: 'Discount %',
};

function RouteComponent() {
  const search = Route.useSearch();
  const query = useStore(searchStore) as TypeOf<typeof formSchema>;
  const setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void = (field, value) => {
    searchStore.setState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only on mount
  useEffect(() => {
    searchStore.setState({
      ...searchStore.state,
      ...search,
      page: search.page ?? 1,
      limit: search.limit ?? DEFAULT_LIMIT,
    });
  }, []);
  const navigate = useNavigate({ from: '/search-v2' });
  const { country } = useCountry();
  const debouncedQuery = useDebounce(query, 300);

  const {
    data: results,
    isFetching,
    isLoading,
  } = useQuery({
    queryKey: ['search-v2', debouncedQuery],
    queryFn: () =>
      httpClient.post<SearchV2Response>(
        `/search/v2/search?country=${country}`,
        debouncedQuery,
      ),
    placeholderData: keepPreviousData,
  });
  const { data: tags } = useQuery({
    queryKey: ['all-tags'],
    queryFn: () => httpClient.get<FullTag[]>('/search/tags?raw=true'),
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });

  // Compute tagTypes from tags
  const tagTypes = Array.from(
    new Map(
      tags
        ?.filter((tag) => tag.groupName)
        .map((tag) => [
          tag.groupName,
          {
            name: tag.groupName,
            label: tagTypesDictionary[tag.groupName] ?? tag.groupName,
          },
        ]),
    ).values(),
  );

  // Helper type guard for priceAgg
  function isPriceStats(obj: unknown): obj is { min: number; max: number } {
    if (typeof obj !== 'object' || obj === null) return false;
    return (
      Object.prototype.hasOwnProperty.call(obj, 'min') &&
      typeof (obj as { min?: unknown }).min === 'number' &&
      Object.prototype.hasOwnProperty.call(obj, 'max') &&
      typeof (obj as { max?: unknown }).max === 'number'
    );
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const priceRange = useMemo(() => {
    const priceAgg = results?.aggregations?.price_stats;
    if (isPriceStats(priceAgg)) {
      return {
        ...priceAgg,
        // @ts-expect-error - TODO: fix this
        currency: results?.offers?.[0]?.price?.price?.currencyCode ?? 'USD',
      };
    }
    return {
      min: 0,
      max: 1000,
      currency: 'USD',
    };
  }, [results]);

  const parseAggregationBuckets = (
    aggregation: AggregationBuckets,
    transformKey?: (key: string) => string,
  ): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const bucket of aggregation?.buckets ?? []) {
      if (transformKey) {
        counts[transformKey(bucket.key)] = bucket.doc_count;
      } else {
        counts[bucket.key] = bucket.doc_count;
      }
    }
    return counts;
  };

  // Offer type counts
  const offerTypeCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.offerType as AggregationBuckets,
  );
  // Tag counts
  const tagCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.tags as AggregationBuckets,
    (key) => tags?.find((t) => t.name === key)?.id ?? key,
  );
  // Developer counts
  const developerCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.developerDisplayName as AggregationBuckets,
  );
  // Publisher counts
  const publisherCounts: Record<string, number> = parseAggregationBuckets(
    results?.aggregations?.publisherDisplayName as AggregationBuckets,
  );

  // Controls (customize as needed)
  const controls = {
    showTitle: true,
    showTags: true,
    showDeveloper: true,
    showPublisher: true,
    showOfferType: true,
    showOnSale: true,
    showCodeRedemption: true,
    showBlockchain: true,
    showPastGiveaways: true,
    showSeller: true,
    showPrice: true,
  };

  useEffect(() => {
    navigate({ search: { ...(query as TypeOf<typeof formSchema>) } });
  }, [query, navigate]);

  return (
    <div className="flex flex-col gap-4 min-h-screen">
      <main className="flex flex-row flex-nowrap items-start justify-between gap-4">
        <SearchFilters
          query={query as TypeOf<typeof formSchema>}
          setField={setField}
          loading={isLoading}
          results={results}
          tags={tags ?? []}
          tagTypes={tagTypes}
          priceRange={priceRange}
          offerTypeCounts={offerTypeCounts}
          tagCounts={tagCounts}
          developerCounts={developerCounts}
          publisherCounts={publisherCounts}
          controls={controls}
        />
        <div className="flex flex-col gap-4 w-full justify-start items-start relative">
          <SearchHeader
            query={query as TypeOf<typeof formSchema>}
            setField={setField}
            loading={isFetching}
            title="Search"
            showSort={true}
            showViewToggle={true}
          />
          <SearchResults
            query={query as TypeOf<typeof formSchema>}
            setField={setField}
            loading={isLoading}
            results={results}
          />
        </div>
      </main>
    </div>
  );
}

interface SearchFiltersProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  results: SearchV2Response | null | undefined;
  tags: FullTag[];
  tagTypes: { name: string; label: string }[];
  priceRange: { min: number; max: number; currency: string };
  offerTypeCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  developerCounts: Record<string, number>;
  publisherCounts: Record<string, number>;
  controls: {
    showTitle: boolean;
    showTags: boolean;
    showDeveloper: boolean;
    showPublisher: boolean;
    showOfferType: boolean;
    showOnSale: boolean;
    showCodeRedemption: boolean;
    showBlockchain: boolean;
    showPastGiveaways: boolean;
    showSeller: boolean;
    showPrice: boolean;
  };
}

function SearchFilters({
  query,
  setField,
  tags,
  tagTypes,
  priceRange,
  offerTypeCounts,
  tagCounts,
  developerCounts,
  publisherCounts,
  controls,
}: SearchFiltersProps) {
  const {
    showTitle,
    showTags,
    showDeveloper,
    showPublisher,
    showOfferType,
    showOnSale,
    showCodeRedemption,
    showBlockchain,
    showPastGiveaways,
    showSeller,
    showPrice,
  } = controls;

  // Handlers for updating query
  const handleFieldChange = <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => {
    setField(field, value);
  };

  // For array fields like tags
  const handleArrayFieldChange = (
    field: keyof TypeOf<typeof formSchema>,
    value: string[],
  ) => {
    setField(field, value as TypeOf<typeof formSchema>[typeof field]);
  };

  // Helper type guard for string array
  function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every((v) => typeof v === 'string');
  }

  return (
    <aside className="flex flex-col gap-4 w-80">
      {showTitle && (
        <Input
          type="search"
          placeholder="Search for games"
          name="title"
          value={query.title || ''}
          onChange={(e) =>
            handleFieldChange(
              'title',
              e.target.value === '' ? undefined : e.target.value,
            )
          }
        />
      )}

      {/* Selected Filters Pills */}
      <div id="selected_filters" className="flex flex-row flex-wrap gap-2">
        {showTags &&
          (isStringArray(query.tags) ? query.tags : []).map((tag) => {
            const tagData = tags?.find((t) => t.id === tag);
            return (
              <QuickPill
                key={tag}
                label={tagData?.name ?? tag}
                onRemove={() => {
                  handleArrayFieldChange(
                    'tags',
                    (isStringArray(query.tags) ? query.tags : []).filter(
                      (t) => t !== tag,
                    ),
                  );
                }}
              />
            );
          })}
        {showDeveloper && query.developerDisplayName && (
          <QuickPill
            label={query.developerDisplayName}
            onRemove={() =>
              handleFieldChange('developerDisplayName', undefined)
            }
          />
        )}
        {showPublisher && query.publisherDisplayName && (
          <QuickPill
            label={query.publisherDisplayName}
            onRemove={() =>
              handleFieldChange('publisherDisplayName', undefined)
            }
          />
        )}
        {showOfferType && query.offerType && (
          <QuickPill
            label={offersDictionary[query.offerType] ?? query.offerType}
            onRemove={() => handleFieldChange('offerType', undefined)}
          />
        )}
        {showOnSale && query.onSale && (
          <QuickPill
            label="On Sale"
            onRemove={() => handleFieldChange('onSale', undefined)}
          />
        )}
        {showCodeRedemption && query.isCodeRedemptionOnly && (
          <QuickPill
            label="Code Redemption Only"
            onRemove={() =>
              handleFieldChange('isCodeRedemptionOnly', undefined)
            }
          />
        )}
        {showBlockchain && query.excludeBlockchain && (
          <QuickPill
            label="Exclude Blockchain/NFT"
            onRemove={() => handleFieldChange('excludeBlockchain', undefined)}
          />
        )}
        {showSeller && query.seller && (
          <QuickPill
            label={query.seller}
            onRemove={() => handleFieldChange('seller', undefined)}
          />
        )}
        {showPastGiveaways && query.pastGiveaways && (
          <QuickPill
            label="Past Giveaways"
            onRemove={() => handleFieldChange('pastGiveaways', undefined)}
          />
        )}
      </div>

      <Separator />

      {showPrice && (
        <PriceRangeSlider
          min={priceRange.min}
          max={Math.min(priceRange.max, 1000)}
          step={1}
          defaultValue={[
            query.price?.min || priceRange.min,
            query.price?.max || priceRange.max,
          ]}
          onValueChange={(value) => {
            handleFieldChange('price', { min: value[0], max: value[1] });
          }}
          currency={priceRange.currency === '' ? 'USD' : priceRange.currency}
        />
      )}

      <Accordion type="single" collapsible className="w-full">
        {showOfferType && (
          <AccordionItem value="offerType">
            <AccordionTrigger>Offer Type</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2 w-full mt-2">
              {Object.entries(offersDictionary)
                .filter(([, value]) => value !== 'Unknown')
                .filter(([key]) => offerTypeCounts[key] > 0)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([key, value]) => (
                  <CheckboxWithCount
                    key={key}
                    checked={query.offerType === key}
                    onChange={(checked: boolean) =>
                      handleFieldChange(
                        'offerType',
                        checked
                          ? (key as (typeof formSchema.shape.offerType._def.values)[number])
                          : undefined,
                      )
                    }
                    count={offerTypeCounts[key] || undefined}
                    label={value}
                  />
                ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {showTags &&
          tagTypes.map((tagType) => {
            const tagTypeTags = tags?.filter(
              (tag) => tag.groupName === tagType.name,
            );
            return (
              <AccordionItem
                key={tagType.name}
                value={tagType.name ?? 'alltags'}
              >
                <AccordionTrigger>{tagType.label}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-2 mt-2">
                  <ScrollArea>
                    <div className="max-h-[400px] flex flex-col gap-1">
                      {tagTypeTags
                        ?.filter((tag) => tagCounts[tag.id] > 0)
                        .map((tag) => (
                          <CheckboxWithCount
                            key={tag.id}
                            checked={
                              isStringArray(query.tags) &&
                              query.tags.includes(tag.id)
                            }
                            onChange={(checked: boolean) => {
                              if (checked) {
                                handleArrayFieldChange('tags', [
                                  ...(isStringArray(query.tags)
                                    ? query.tags
                                    : []),
                                  tag.id,
                                ]);
                              } else {
                                handleArrayFieldChange(
                                  'tags',
                                  (isStringArray(query.tags)
                                    ? query.tags
                                    : []
                                  ).filter((t) => t !== tag.id),
                                );
                              }
                            }}
                            count={tagCounts[tag.id] || undefined}
                            label={tag.name}
                          />
                        ))}
                      {tagTypeTags?.filter((tag) => tagCounts[tag.id] > 0)
                        .length === 0 && (
                        <span className="text-gray-400 px-4">
                          No tags found
                        </span>
                      )}
                    </div>
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            );
          })}

        {showDeveloper && (
          <AccordionItem value="developer">
            <AccordionTrigger>Developer</AccordionTrigger>
            <AccordionContent>
              {(Object.keys(developerCounts).length > 0 ||
                query.developerDisplayName) && (
                <ExtendedSearch
                  name="developers"
                  items={Object.entries(developerCounts).map(
                    ([key, value]) => ({
                      id: key,
                      name: key,
                      count: value as number,
                    }),
                  )}
                  value={query.developerDisplayName}
                  setValue={(val) =>
                    handleFieldChange('developerDisplayName', val)
                  }
                />
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {showPublisher && (
          <AccordionItem value="publisher">
            <AccordionTrigger>Publisher</AccordionTrigger>
            <AccordionContent>
              {(Object.keys(publisherCounts).length > 0 ||
                query.publisherDisplayName) && (
                <ExtendedSearch
                  name="publishers"
                  items={Object.entries(publisherCounts).map(
                    ([key, value]) => ({
                      id: key,
                      name: key,
                      count: value as number,
                    }),
                  )}
                  value={query.publisherDisplayName}
                  setValue={(val) =>
                    handleFieldChange('publisherDisplayName', val)
                  }
                />
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Seller search can be implemented similarly if needed */}
      </Accordion>

      {showPastGiveaways && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pastGiveaways"
            checked={Boolean(query.pastGiveaways)}
            onCheckedChange={(value) =>
              handleFieldChange('pastGiveaways', Boolean(value))
            }
          />
          <label
            htmlFor="pastGiveaways"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Past Giveaways
          </label>
        </div>
      )}

      {showOnSale && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="onSale"
            checked={!!query.onSale}
            onCheckedChange={(value) =>
              handleFieldChange('onSale', Boolean(value))
            }
          />
          <label
            htmlFor="onSale"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            On Sale
          </label>
        </div>
      )}

      {showCodeRedemption && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isCodeRedemptionOnly"
            checked={!!query.isCodeRedemptionOnly}
            onCheckedChange={(value) =>
              handleFieldChange('isCodeRedemptionOnly', Boolean(value))
            }
          />
          <label
            htmlFor="isCodeRedemptionOnly"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Code Redemption Only
          </label>
        </div>
      )}

      {showBlockchain && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="excludeBlockchain"
            checked={!!query.excludeBlockchain}
            onCheckedChange={(value) =>
              handleFieldChange('excludeBlockchain', Boolean(value))
            }
          />
          <label
            htmlFor="excludeBlockchain"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Exclude Blockchain/NFT
          </label>
        </div>
      )}
    </aside>
  );
}

interface SearchHeaderProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  title: string;
  showSort: boolean;
  showViewToggle: boolean;
}

function SearchHeader(props: SearchHeaderProps) {
  const { view, setView } = usePreferences();
  const { query, setField, loading, title, showSort, showViewToggle } = props;

  return (
    <header
      className={cn('inline-flex items-center justify-between w-full gap-2')}
    >
      <div className="flex flex-row items-center justify-start gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>
      <div className="flex flex-row items-center justify-start gap-2">
        {showSort && (
          <>
            <Select
              value={query.sortBy ?? undefined}
              onValueChange={(value) =>
                setField('sortBy', value as typeof query.sortBy)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortByDisplay).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                setField('sortDir', query.sortDir === 'asc' ? 'desc' : 'asc')
              }
              variant="outline"
              className="w-9"
            >
              <ArrowDown
                className={cn(
                  'transition-transform duration-300 ease-in-out',
                  query.sortDir === 'asc' ? 'rotate-180' : 'rotate-0',
                )}
              />
            </Button>
          </>
        )}
        {showViewToggle && (
          <Button
            variant="outline"
            className="h-9 w-9 p-0 hidden md:flex"
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          >
            {view === 'grid' ? (
              <ListBulletIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <GridIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}

interface SearchResultsProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  results: SearchV2Response | null | undefined;
}

function SearchResults(props: SearchResultsProps) {
  const { view } = usePreferences();
  const { query, setField, loading, results } = props;

  if (loading && !results) {
    return (
      <div
        className={cn(
          'w-full flex flex-col gap-4',
          view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
            : 'flex flex-col gap-4',
        )}
      >
        {Array.from({ length: 34 }).map((_, i) => (
          <GameCardSkeleton
            key={`skeleton-${
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              i
            }`}
          />
        ))}
      </div>
    );
  }

  if (!results || results.offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-gray-400">No results found</span>
      </div>
    );
  }

  return (
    <section className={cn('flex flex-col gap-4 w-full overflow-hidden')}>
      <div
        className={cn(
          view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'
            : 'flex flex-col gap-4',
        )}
      >
        {results.offers.map((offer) => {
          if (view === 'grid') {
            return (
              <OfferCard
                key={offer.id}
                offer={offer as unknown as SingleOffer}
                size="md"
              />
            );
          }

          return (
            <OfferListItem
              key={offer.id}
              game={offer as unknown as SingleOffer}
            />
          );
        })}
      </div>
      <DynamicPagination
        currentPage={query.page ?? 1}
        totalPages={Math.ceil(results.total / (query.limit ?? DEFAULT_LIMIT))}
        setPage={(page) => setField('page', page)}
      />
    </section>
  );
}
