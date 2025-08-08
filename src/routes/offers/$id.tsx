import defaultPlayerTheme from '@vidstack/react/player/styles/default/theme.css?url';
import defaultAudioPlayer from '@vidstack/react/player/styles/default/layouts/audio.css?url';
import defaultVideoPlayer from '@vidstack/react/player/styles/default/layouts/video.css?url';
import { BaseGame } from '@/components/app/base-game';
import { BlurredBackground } from '@/components/app/blurred-background';
import { OfferInBundle } from '@/components/app/bundle-game';
import { InternalBanner } from '@/components/app/internal-banner';
import { OfferHero } from '@/components/app/offer-hero';
import { SectionsNav } from '@/components/app/offer-sections';
import { OpenLauncher } from '@/components/app/open-launcher';
import { platformIcons } from '@/components/app/platform-icons';
import { PrepurchasePopup } from '@/components/app/prepurchase-popup';
import { StoreDropdown } from '@/components/app/store-dropdown';
import { AddIcon } from '@/components/icons/add';
import { RemoveIcon } from '@/components/icons/remove';
import { Bundle } from '@/components/modules/bundle';
import { CollectionOffers } from '@/components/modules/collection-offers';
import { SellerOffers } from '@/components/modules/seller-offers';
import { SuggestedOffers } from '@/components/modules/suggested-offers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useCompare } from '@/hooks/use-compare';
import { useLocale } from '@/hooks/use-locale';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { ClientOnly } from '@/lib/cllient-only';
import { generateOfferMeta } from '@/lib/generate-offer-meta';
import { getImage } from '@/lib/get-image';
import { Seller } from '@/lib/get-seller';
import { httpClient } from '@/lib/http-client';
import { internalNamespaces } from '@/lib/internal-namespaces';
import { offersDictionary } from '@/lib/offers-dictionary';
import { compareDates, timeAgo } from '@/lib/time-ago';
import { cn } from '@/lib/utils';
import { VideoProvider } from '@/providers/offers-video';
import type { Asset } from '@/types/asset';
import type { Technology } from '@/types/builds';
import type { Price } from '@/types/price';
import type { SingleOffer } from '@/types/single-offer';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  getRouteApi,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { OffersHomeSkeleton } from '@/components/skeletons/offers-home';
import { FabIcon } from '@/components/icons/fab';
import consola from 'consola';
import { DateTime } from 'luxon';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useCookies } from 'react-cookie';

export const Route = createFileRoute('/offers/$id')({
  component: () => {
    return <OfferPage />;
  },

  loader: async ({ params, context, cause }) => {
    const startTime = performance.now();
    const { country, queryClient } = context;
    const { id } = params;

    const isPreload = cause === 'preload';

    // Always fetch the offer first
    const offer = await queryClient.ensureQueryData({
      queryKey: ['offer', { id: params.id }],
      queryFn: () => httpClient.get<SingleOffer>(`/offers/${params.id}`),
    });

    // Prepare additional queries for SSR/SEO only
    const extraQueries: Promise<unknown>[] = [];
    if (!isPreload) {
      extraQueries.push(
        queryClient.prefetchQuery({
          queryKey: ['price', { id: params.id, country }],
          queryFn: () =>
            httpClient.get<Price>(
              `/offers/${params.id}/price?country=${country || 'US'}`,
            ),
        }),
        queryClient.ensureQueryData({
          queryKey: ['offer-technologies', { id: params.id }],
          queryFn: () =>
            httpClient.get<Technology[]>(`/offers/${params.id}/technologies`),
        }),
        queryClient.prefetchQuery({
          queryKey: ['offer-assets', { id }],
          queryFn: () => httpClient.get<Asset[]>(`/offers/${id}/assets`),
        }),
      );
    }
    await Promise.all(extraQueries);

    const endTime = performance.now();
    consola.info(
      `[offers-root] Time taken: ${(endTime - startTime).toFixed(2)} milliseconds`,
    );

    return {
      id,
      country,
      offer,
    };
  },

  head: (ctx) => {
    const { loaderData } = ctx;

    if (!loaderData)
      return {
        meta: [
          {
            title: 'Offer not found',
            description: 'Offer not found',
          },
        ],
      };

    const { offer } = loaderData;

    if (!offer) {
      return {
        meta: [
          {
            title: 'Offer not found',
            description: 'Offer not found',
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer),
      links: [
        {
          rel: 'stylesheet',
          href: defaultPlayerTheme,
        },
        {
          rel: 'stylesheet',
          href: defaultAudioPlayer,
        },
        {
          rel: 'stylesheet',
          href: defaultVideoPlayer,
        },
        // Preload all the styles for the video player
        {
          rel: 'preload',
          href: defaultPlayerTheme,
          as: 'style',
        },
        {
          rel: 'preload',
          href: defaultAudioPlayer,
          as: 'style',
        },
        {
          rel: 'preload',
          href: defaultVideoPlayer,
          as: 'style',
        },
      ],
    };
  },

  pendingComponent: () => {
    return <OffersHomeSkeleton />;
  },

  pendingMs: 1000,
});

function OfferPage() {
  const { id } = Route.useLoaderData();
  const { timezone } = useLocale();
  const { addToCompare, removeFromCompare, compare } = useCompare();
  const navigate = useNavigate();
  const location = useLocation();
  // Auth and push notifications
  const [cookies] = useCookies(['push-notifications-api-key']);
  const { 
    canPerformTopicOperations, 
    subscribeToTopic, 
    unsubscribeFromTopic,
    canSubscribeToTopic,
    isSubscribedToTopic 
  } = usePushNotifications(
    cookies['push-notifications-api-key'],
  );

  // Topic names for this offer
  const allChangesToopic = `offer-${id}-all`;
  const dataChangesToopic = `offer-${id}-data`;
  const priceChangesToopic = `offer-${id}-price`;

  // Check current subscription status
  const allChanges = isSubscribedToTopic(allChangesToopic);
  const dataChanges = isSubscribedToTopic(dataChangesToopic);
  const priceChanges = isSubscribedToTopic(priceChangesToopic);

  // Handle notification setting changes
  const handleNotificationChange = async (setting: string, checked: boolean) => {
    if (!canPerformTopicOperations) return;

    if (setting === 'allChanges') {
      if (checked) {
        // Subscribe to all changes and unsubscribe from specific ones
        await subscribeToTopic(allChangesToopic);
        if (isSubscribedToTopic(dataChangesToopic)) {
          await unsubscribeFromTopic(dataChangesToopic);
        }
        if (isSubscribedToTopic(priceChangesToopic)) {
          await unsubscribeFromTopic(priceChangesToopic);
        }
      } else {
        // Unsubscribe from all changes
        await unsubscribeFromTopic(allChangesToopic);
      }
    } else if (setting === 'dataChanges') {
      if (checked) {
        // Unsubscribe from all changes first, then subscribe to data changes
        if (isSubscribedToTopic(allChangesToopic)) {
          await unsubscribeFromTopic(allChangesToopic);
        }
        await subscribeToTopic(dataChangesToopic);
      } else {
        await unsubscribeFromTopic(dataChangesToopic);
      }
    } else if (setting === 'priceChanges') {
      if (checked) {
        // Unsubscribe from all changes first, then subscribe to price changes
        if (isSubscribedToTopic(allChangesToopic)) {
          await unsubscribeFromTopic(allChangesToopic);
        }
        await subscribeToTopic(priceChangesToopic);
      } else {
        await unsubscribeFromTopic(priceChangesToopic);
      }
    }
  };

  const { data: offer, isLoading: offerLoading } = useSuspenseQuery({
    queryKey: ['offer', { id }],
    queryFn: () => httpClient.get<SingleOffer>(`/offers/${id}`),
  });
  const { data: technologies } = useSuspenseQuery({
    queryKey: ['offer-technologies', { id }],
    queryFn: () => httpClient.get<Technology[]>(`/offers/${id}/technologies`),
  });

  const subPath = location.pathname.split(`/${id}/`)[1];

  if (offerLoading) {
    return <div>Loading...</div>;
  }

  if (!offer) {
    return <div>Offer not found</div>;
  }

  if (offer.title === 'Error') {
    return <div>{offer.description}</div>;
  }

  const isFabItem = offer.customAttributes.FabListingId;
  const platformTags = offer.tags
    .filter((tag) => tag !== null)
    .filter((tag) => platformIcons[tag.id]);

  return (
    <VideoProvider>
      <main className="flex flex-col items-start justify-start w-full min-h-screen gap-4 relative px-5 md:px-0">
        <ClientOnly>
          <PrepurchasePopup id={offer.id} />
        </ClientOnly>
        <BlurredBackground
          src={
            getImage(offer.keyImages, [
              'DieselStoreFrontWide',
              'OfferImageWide',
              'DieselGameBoxWide',
              'TakeoverWide',
            ])?.url ?? '/placeholder.webp'
          }
        />
        <header className="grid col-span-1 gap-4 md:grid-cols-2 w-full">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-4">
              {isFabItem && <FabIcon className="size-10" />}
              <h1 className="text-4xl font-bold">{offer.title}</h1>
            </div>
            <h4
              className="text-lg font-semibold opacity-50 inline-flex items-center gap-2"
              aria-label={`Offered by ${offer.seller.name}`}
            >
              <Seller
                developerDisplayName={offer.developerDisplayName as string}
                publisherDisplayName={offer.publisherDisplayName as string}
                seller={offer.seller.name}
                customAttributes={offer.customAttributes}
              />
              {offer.prePurchase && (
                <Badge variant="outline">Pre-Purchase</Badge>
              )}
              {offer.tags.find((tag) => tag.id === '1310') && (
                <Badge variant="outline">Early Access</Badge>
              )}
            </h4>

            <div className="rounded-xl border border-gray-300/10 mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Offer ID</TableHead>
                    <TableHead className="text-left font-mono border-l-gray-300/10 border-l">
                      {offer.id}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Namespace</TableCell>
                    <TableCell
                      className={
                        'text-left font-mono border-l-gray-300/10 border-l underline decoration-dotted decoration-slate-600 underline-offset-4'
                      }
                    >
                      <Link
                        to={'/sandboxes/$id/offers'}
                        params={{
                          id: offer.namespace,
                        }}
                      >
                        {internalNamespaces.includes(offer.namespace) ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>{offer.namespace}</TooltipTrigger>
                              <TooltipContent>
                                <p>Epic Games internal namespace</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          offer.namespace
                        )}
                      </Link>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Offer Type</TableCell>
                    <TableCell className="text-left border-l-gray-300/10 border-l">
                      {offersDictionary[offer.offerType] || offer.offerType}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Seller</TableCell>
                    <TableCell className="text-left border-l-gray-300/10 border-l">
                      <Link
                        to="/sellers/$id"
                        params={{ id: offer.seller.id }}
                        className="underline underline-offset-4"
                      >
                        {offer.seller.name}
                      </Link>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Developer</TableCell>
                    <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                      <Seller
                        developerDisplayName={
                          offer.developerDisplayName as string
                        }
                        publisherDisplayName={
                          offer.publisherDisplayName as string
                        }
                        seller={offer.seller.name}
                        customAttributes={offer.customAttributes}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Supported Platforms
                    </TableCell>
                    <TableCell className="text-left border-l-gray-300/10 border-l inline-flex items-center justify-start gap-1">
                      {platformTags.map((tag) => (
                        <span key={tag.id} className="text-xs">
                          {platformIcons[tag.id]}
                        </span>
                      ))}

                      {!platformTags.length && <div>N/A</div>}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Release Date</TableCell>
                    <TableCell
                      className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l"
                      suppressHydrationWarning
                    >
                      <ReleaseDate
                        releaseDate={offer.releaseDate}
                        pcReleaseDate={offer.pcReleaseDate}
                        timezone={timezone}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Last Update</TableCell>
                    <TableCell
                      className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l"
                      suppressHydrationWarning
                    >
                      {offer.lastModifiedDate
                        ? DateTime.fromISO(offer.lastModifiedDate, {
                            zone: timezone,
                          })
                            .setLocale('en-GB')
                            .toLocaleString({
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                              timeZoneName: 'short',
                            })
                        : 'Not available'}
                      <TimeAgo targetDate={offer.lastModifiedDate} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Creation Date</TableCell>
                    <TableCell
                      className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l"
                      suppressHydrationWarning
                    >
                      {offer.creationDate
                        ? DateTime.fromISO(offer.creationDate, {
                            zone: timezone,
                          })
                            .setLocale('en-GB')
                            .toLocaleString({
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                              timeZoneName: 'short',
                            })
                        : 'Not available'}
                      <TimeAgo targetDate={offer.creationDate} />
                    </TableCell>
                  </TableRow>
                  {technologies && technologies.length > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="underline decoration-dotted decoration-gray-300/50 underline-offset-4 cursor-help">
                                Technologies
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm max-w-md">
                                We use the{' '}
                                <a
                                  href="https://steamdb.info/tech/"
                                  className="text-blue-700 font-semibold"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  SteamDB
                                </a>{' '}
                                technologies list to track the used engines and
                                different technologies from the game files.
                                <br />
                                <a
                                  href="https://github.com/SteamDatabase/FileDetectionRuleSets"
                                  className="text-blue-700 font-semibold"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Source
                                </a>
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-left border-l-gray-300/10 border-l flex flex-wrap flex-row gap-1">
                        {technologies
                          .filter(
                            (technology) =>
                              technology.section === 'Engine' ||
                              technology.section === 'AntiCheat' ||
                              technology.section === 'Container' ||
                              technology.section === 'Emulator' ||
                              technology.section === 'Launcher' ||
                              technology.technology === 'SteamworksNET' ||
                              technology.technology === 'EpicOnlineServices' ||
                              technology.technology === 'Steam_Networking',
                          )
                          // Sort by
                          // Engine
                          // Launcher
                          // Anti-cheat
                          .sort((a, b) => {
                            if (a.section === 'Engine') {
                              return -1;
                            }

                            if (b.section === 'Engine') {
                              return 1;
                            }

                            if (a.section === 'Launcher') {
                              return -1;
                            }

                            if (b.section === 'Launcher') {
                              return 1;
                            }

                            if (a.section === 'AntiCheat') {
                              return -1;
                            }

                            if (b.section === 'AntiCheat') {
                              return 1;
                            }

                            return 0;
                          })
                          .map((technology, index, array) => (
                            <span
                              key={`${technology.section}-${technology.technology}`}
                              className="font-mono"
                            >
                              {technology.technology}
                              <sup className="text-[9px] ml-[2px]">
                                {technology.section}
                              </sup>
                              {index < array.length - 1 && ','}
                            </span>
                          ))}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <InternalBanner offer={offer} />
            <BaseGame offer={offer} />
            <OfferInBundle offer={offer} />
          </div>
          <div className="flex justify-start items-start flex-col gap-4">
            <div className="inline-flex items-center gap-2 justify-end w-full h-8">
              <StoreDropdown offer={offer} />
              <OpenLauncher id={offer.id} />
              <Button
                onClick={() => {
                  if (compare.includes(offer.id)) {
                    removeFromCompare(offer.id);
                  } else {
                    addToCompare(offer.id);
                  }
                }}
                className="inline-flex items-center gap-1 bg-card text-white hover:bg-card-hover border"
              >
                {compare.includes(offer.id) ? <RemoveIcon /> : <AddIcon />}
                <span>Compare</span>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="inline-flex items-center gap-1 bg-card text-white hover:bg-card-hover border"
                    size="sm"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">
                      Notification Settings
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Choose what notifications you want to receive for this
                      offer.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="all-changes"
                          checked={allChanges}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(
                              'allChanges',
                              checked as boolean,
                            )
                          }
                          disabled={dataChanges || priceChanges}
                        />
                        <label
                          htmlFor="all-changes"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          All changes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="data-changes"
                          checked={dataChanges}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(
                              'dataChanges',
                              checked as boolean,
                            )
                          }
                          disabled={allChanges}
                        />
                        <label
                          htmlFor="data-changes"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Data changes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="price-changes"
                          checked={priceChanges}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(
                              'priceChanges',
                              checked as boolean,
                            )
                          }
                          disabled={allChanges}
                        />
                        <label
                          htmlFor="price-changes"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Price changes
                        </label>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <OfferHero offer={offer} />
            <p className="px-1">{offer.description}</p>
          </div>
        </header>

        {offer.categories.findIndex(
          (category) => category === 'collections',
        ) !== -1 && (
          <section className="w-full min-h-[50vh] flex flex-col gap-4">
            <CollectionOffers id={offer.id} />
          </section>
        )}

        {offer.offerType === 'BUNDLE' || offer.offerType === 'Bundle' ? (
          <section className="w-full min-h-[50vh] flex flex-col gap-4">
            <hr className="my-4" />
            <Bundle id={offer.id} offer={offer} />
            <hr className="my-4" />
          </section>
        ) : null}

        <section
          id="offer-information"
          className="w-full min-h-[50vh] flex flex-col gap-4"
        >
          <SectionsNav
            links={[
              {
                id: '',
                label: 'Overview',
                href: `/offers/${offer.id}`,
              },
              {
                id: 'price',
                label: 'Price',
                href: `/offers/${offer.id}/price`,
              },
              {
                id: 'items',
                label: 'Items',
                href: `/offers/${offer.id}/items`,
              },
              {
                id: 'builds',
                label: 'Builds',
                href: `/offers/${offer.id}/builds`,
              },
              {
                id: 'achievements',
                label: 'Achievements',
                href: `/offers/${offer.id}/achievements`,
              },
              {
                id: 'related',
                label: 'Related',
                href: `/offers/${offer.id}/related`,
              },
              {
                id: 'metadata',
                label: 'Metadata',
                href: `/offers/${offer.id}/metadata`,
              },
              {
                id: 'changelog',
                label: 'Changelog',
                href: `/offers/${offer.id}/changelog`,
              },
              {
                id: 'media',
                label: 'Media',
                href: `/offers/${offer.id}/media`,
              },
              {
                id: 'reviews',
                label: 'Reviews',
                href: `/offers/${offer.id}/reviews`,
              },
            ]}
            activeSection={subPath ?? ''}
            onSectionChange={(id) => {
              navigate({
                to: `/offers/${offer.id}/${id}`,
                replace: false,
                resetScroll: false,
              });
            }}
          />

          <Outlet />
        </section>

        <hr className="my-4 border-gray-300/40" />

        <SellerOffers
          id={offer.seller.id}
          name={offer.seller.name}
          currentOffer={offer}
        />

        <SuggestedOffers id={offer.id} />
      </main>
    </VideoProvider>
  );
}

const TimeAgo: React.FC<{
  targetDate: string;
}> = ({ targetDate }) => {
  return (
    <span className="opacity-50">
      ({targetDate ? timeAgo(new Date(targetDate)) : 'Not available'})
    </span>
  );
};

const ReleaseDate: React.FC<{
  releaseDate: string | null;
  pcReleaseDate: string | null;
  timezone: string | undefined;
}> = ({ releaseDate, pcReleaseDate, timezone }) => {
  if (!releaseDate || releaseDate.includes('2099')) {
    return <span>Not available</span>;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip open={!pcReleaseDate ? false : undefined}>
          <TooltipTrigger className="flex items-center gap-1 cursor-default">
            <span
              className={cn(
                pcReleaseDate &&
                  releaseDate !== pcReleaseDate &&
                  'underline decoration-dotted underline-offset-4',
              )}
            >
              {DateTime.fromISO(releaseDate, { zone: timezone })
                .setLocale('en-GB')
                .toLocaleString({
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  timeZoneName: 'short',
                })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {!pcReleaseDate || releaseDate === pcReleaseDate ? (
              'Released on Epic the same day as PC'
            ) : (
              <span>
                <span>Released on PC </span>
                <span>
                  {compareDates(new Date(pcReleaseDate), new Date(releaseDate))}
                </span>
                <span> the EGS</span>
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TimeAgo targetDate={releaseDate} />
    </>
  );
};
