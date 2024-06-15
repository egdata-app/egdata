import type { LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData, type MetaFunction } from '@remix-run/react';
import cookie from 'cookie';
import { Image } from '~/components/app/image';
import { client } from '~/lib/client';
import { getImage } from '~/lib/getImage';
import { getSeller } from '~/lib/get-seller';
import type { Price, SingleOffer } from '~/types/single-offer';
import type { SingleItem } from '~/types/single-item';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { offersDictionary } from '~/lib/offers-dictionary';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { lazy, useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { compareDates, timeAgo } from '~/lib/time-ago';
import { internalNamespaces } from '~/lib/internal-namespaces';
import GameFeatures from '~/components/app/game-features';
import { cn } from '~/lib/utils';
import { BaseGame } from '~/components/app/base-game';
import { Echarts } from '~/components/app/echarts';
import getCountryCode from '~/lib/get-country-code';

function supportedPlatforms(items: SingleItem[]): string[] {
  try {
    if (items.length === 0) {
      return [];
    }
    const platforms = items
      .flatMap((item) => item.releaseInfo)
      .map((releaseInfo) => releaseInfo.platform)
      .filter((platform) => platform !== null)
      .flat();

    const platformSet = new Set(platforms);
    return Array.from(platformSet);
  } catch (error) {
    return [];
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      {
        title: 'Offer not found',
        description: 'Offer not found',
      },
    ];
  }

  const { offer: offerData } = data;

  if (offerData.title === 'Error') {
    return [
      {
        title: 'Offer not found',
        description: 'Offer not found',
      },
    ];
  }

  return [
    {
      title: `${offerData.title} - egdata.app`,
    },
    {
      name: 'description',
      content: offerData.description,
    },
    {
      name: 'keywords',
      content: 'Epic Games, Epic Games Store, Offer, Sale, Game',
    },
    {
      name: 'author',
      content: offerData.seller.name,
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: `${offerData.title} - egdata.app`,
    },
    {
      property: 'og:description',
      content: offerData.description,
    },
    {
      property: 'og:image',
      content:
        getImage(offerData.keyImages, ['OfferImageWide', 'DieselGameBoxWide', 'TakeoverWide'])
          ?.url ?? 'https://via.placeholder.com/1920x1080',
    },
    {
      property: 'og:url',
      content: `https://egdata.app/offers/${offerData.id}`,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:site_name',
      content: 'egdata.app',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:site',
      content: '@egdataapp',
    },
    {
      name: 'twitter:title',
      content: `${offerData.title} - egdata.app`,
    },
    {
      name: 'twitter:description',
      content: offerData.description,
    },
    {
      name: 'twitter:image',
      content:
        getImage(offerData.keyImages, ['OfferImageWide', 'DieselGameBoxWide', 'TakeoverWide'])
          ?.url ?? 'https://via.placeholder.com/1920x1080',
    },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: offerData.title,
        applicationCategory: 'Game',
        description: offerData.description,
        softwareVersion: undefined,
        operatingSystem: supportedPlatforms(data.items).join(', '),
        datePublished: offerData.releaseDate,
        dateModified: offerData.lastModifiedDate,
        publisher: {
          '@type': 'Organization',
          name: offerData.seller.name,
        },
        // offers: {
        //   '@type': 'Offer',
        //   price: (offerData.price?.totalPrice.discountPrice || 0) / 100,
        //   priceCurrency: offerData.price?.currency,
        //   priceValidUntil: undefined,
        //   availability: 'https://schema.org/InStock',
        //   url: `https://store.epicgames.com/product/${
        //     offerData.productSlug ?? offerData.url ?? offerData.urlSlug
        //   }`,
        // },
        sameAs: `https://store.epicgames.com/product/${
          offerData.productSlug ?? offerData.url ?? offerData.urlSlug
        }`,
        image:
          getImage(offerData.keyImages, ['OfferImageWide', 'DieselGameBoxWide', 'TakeoverWide'])
            ?.url ?? 'https://via.placeholder.com/1920x1080',
      },
    },
    {
      rel: 'canonical',
      href: `https://egdata.app/offers/${offerData.id}`,
    },
    {
      rel: 'prefetch',
      href: `https://api.egdata.app/base-game/${offerData.namespace}`,
    },
  ];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const country = getCountryCode(url, cookie.parse(request.headers.get('Cookie') || ''));

  const [offerData, itemsData, priceData, regionData] = await Promise.allSettled([
    client.get<SingleOffer>(`/offers/${params.id}`).then((response) => response.data),
    client
      .get<Array<SingleItem>>(`/items-from-offer/${params.id}`)
      .then((response) => response.data),
    client
      .get<Array<Price>>(`/offers/${params.id}/price-history?country=${country}`)
      .then((response) => response.data),
    client
      .get<{
        region: {
          code: string;
          currencyCode: string;
          description: string;
          countries: string[];
        };
      }>(`/region?country=${country}`)
      .then((response) => response.data),
  ]);

  const offer = offerData.status === 'fulfilled' ? offerData.value : null;
  const items = itemsData.status === 'fulfilled' ? itemsData.value : [];
  const prices = priceData.status === 'fulfilled' ? priceData.value : [];
  const region = regionData.status === 'fulfilled' ? regionData.value : null;

  return {
    offer: offer as SingleOffer,
    items,
    prices,
    region: region?.region,
  };
}

export default function Index() {
  const { offer: offerData, items, prices } = useLoaderData<typeof loader>();

  if (!offerData) {
    return <div>Offer not found</div>;
  }

  if (offerData.title === 'Error') {
    return <div>{offerData.description}</div>;
  }

  const mergedCustomAttributes = items.reduce((acc, item) => {
    return Object.assign({}, acc, item.customAttributes);
  }, {});

  return (
    <main className="flex flex-col items-start justify-start w-full min-h-screen gap-4">
      <header className="grid col-span-1 gap-4 md:grid-cols-2 w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-bold">{offerData.title}</h1>
          <h4
            className="text-lg font-semibold opacity-50"
            aria-label={`Offered by ${offerData.seller.name}`}
          >
            {getSeller({
              developerDisplayName: offerData.developerDisplayName as string,
              publisherDisplayName: offerData.publisherDisplayName as string,
              seller: offerData.seller.name,
            })}
          </h4>
          <div className="rounded-xl border border-gray-300/10 mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Offer ID</TableHead>
                  <TableHead className="text-left font-mono border-l-gray-300/10 border-l">
                    {offerData.id}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Namespace</TableCell>
                  <TableCell className={'text-left font-mono border-l-gray-300/10 border-l'}>
                    {internalNamespaces.includes(offerData.namespace) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="underline decoration-dotted underline-offset-4">
                            {offerData.namespace}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Epic Games internal namespace</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      offerData.namespace
                    )}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="font-medium">Offer Type</TableCell>
                  <TableCell className="text-left border-l-gray-300/10 border-l">
                    {offersDictionary[offerData.offerType]}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Seller</TableCell>
                  <TableCell className="text-left border-l-gray-300/10 border-l">
                    {offerData.seller.name}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Developer</TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                    {offerData.developerDisplayName ?? offerData.seller.name}
                    {offerData.publisherDisplayName !== offerData.developerDisplayName && (
                      <span className="opacity-50">({offerData.publisherDisplayName})</span>
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Supported Platforms</TableCell>
                  <TableCell className="text-left border-l-gray-300/10 border-l">
                    {supportedPlatforms(items).length > 0
                      ? supportedPlatforms(items).join(', ')
                      : 'Unknown'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Release Date</TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                    <ReleaseDate
                      releaseDate={offerData.releaseDate}
                      pcReleaseDate={offerData.pcReleaseDate}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Last Update</TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                    {offerData.lastModifiedDate
                      ? new Date(offerData.lastModifiedDate).toLocaleDateString('en-UK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        })
                      : 'Not available'}
                    {' (UTC) '}
                    <TimeAgo targetDate={offerData.lastModifiedDate} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Creation Date</TableCell>
                  <TableCell className="text-left inline-flex items-center gap-1 border-l-gray-300/10 border-l">
                    {offerData.creationDate
                      ? new Date(offerData.creationDate).toLocaleDateString('en-UK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        })
                      : 'Not available'}
                    {' (UTC) '}
                    <TimeAgo targetDate={offerData.creationDate} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <InternalBanner title={offerData.title} namespace={offerData.namespace} />
          <BaseGame offer={offerData} />
        </div>
        <div className="flex justify-start items-start flex-col gap-4">
          <div className="relative w-full h-auto">
            <Image
              src={
                getImage(offerData.keyImages, [
                  'OfferImageWide',
                  'DieselGameBoxWide',
                  'TakeoverWide',
                ])?.url ?? 'https://via.placeholder.com/1920x1080'
              }
              alt={offerData.title}
              width={1920}
              height={1080}
              quality={100}
              className="rounded-xl shadow-lg"
            />
            <GameFeatures attributes={mergedCustomAttributes} />
          </div>
          <p className="px-1">{offerData.description}</p>
        </div>
      </header>
      <section id="historical-prices" className="w-full">
        <h2 className="text-2xl font-bold">Historical Prices</h2>
        <Echarts offerId={offerData.id} initialData={prices} />
      </section>
      <section id="items" className="w-full">
        <h2 className="text-2xl font-bold">Items</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Item ID</TableHead>
              <TableHead>Item Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono">{item.id}</TableCell>
                <TableCell className="text-left">{item.title}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
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
}> = ({ releaseDate, pcReleaseDate }) => {
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
              {new Date(releaseDate).toLocaleDateString('en-UK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {!pcReleaseDate || releaseDate === pcReleaseDate ? (
              'Released on Epic the same day as PC'
            ) : (
              <span>
                <span>Released on PC </span>
                <span>{compareDates(new Date(pcReleaseDate), new Date(releaseDate))}</span>
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

const InternalBanner: React.FC<{
  title: string;
  namespace: string;
}> = ({ title, namespace }) => {
  if (!internalNamespaces.includes(namespace)) {
    return null;
  }
  const [results, setResults] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    client
      .get<{
        elements: Array<{
          _id: string;
          id: string;
          namespace: string;
          title: string;
          keyImages: Array<{
            type: string;
            url: string;
            md5: string;
          }>;
        }>;
        total: number;
      }>(`/autocomplete?query=${title}`)
      .then((response) => {
        setResults(
          response.data.elements
            .filter(({ namespace }) => !internalNamespaces.includes(namespace))
            .sort((a, b) => a.title.localeCompare(b.title)),
        );
      });
  }, [title]);

  return (
    <Alert variant="destructive" className="mt-1">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle className="font-bold">Epic Internal Offer</AlertTitle>
      <AlertDescription>
        This offer is an internal entry from Epic Games and may not be available to the general
        public.
      </AlertDescription>
      {results.length > 0 && (
        <Link to={`/offers/${results[0].id}`} className="underline">
          Go to public offer
        </Link>
      )}
    </Alert>
  );
};
