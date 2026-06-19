import { Image } from "@/components/app/image";
import { OpenLauncher } from "@/components/app/open-launcher";
import { OfferCard } from "@/components/app/offer-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountry } from "@/hooks/use-country";
import { useLocale } from "@/hooks/use-locale";
import { calculatePrice } from "@/lib/calculate-price";
import { calculateSize } from "@/lib/calculate-size";
import { getImage } from "@/lib/get-image";
import { cn } from "@/lib/utils";
import { sandboxHubQueryOptions, type SandboxHubData } from "@/queries/sandbox-hub";
import type { Price } from "@/types/price";
import type { SingleOffer } from "@/types/single-offer";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import {
  Archive,
  BoxIcon,
  CalendarDays,
  Clock3,
  Gamepad2,
  LibrarySquareIcon,
  PackageIcon,
  ShoppingBag,
  StoreIcon,
  Trophy,
} from "lucide-react";

export const Route = createFileRoute("/sandboxes/$id/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { country, queryClient } = context;

    await queryClient
      .ensureQueryData(
        sandboxHubQueryOptions({
          id,
          country: country || "US",
          offerLimit: 8,
          updateLimit: 8,
        }),
      )
      .catch(() => null);

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

function SandboxPage() {
  const { id } = Route.useParams();
  const { country } = useCountry();
  const {
    data: hub,
    isError,
    isLoading,
  } = useQuery(
    sandboxHubQueryOptions({
      id,
      country: country || "US",
      offerLimit: 8,
      updateLimit: 8,
    }),
  );

  if (isLoading) {
    return <SandboxHubSkeleton />;
  }

  if (isError) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sandbox unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">The product hub could not be loaded.</p>
        </div>
      </main>
    );
  }

  if (!hub) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-6xl items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Sandbox not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No product data exists for this sandbox.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-10 px-4 pb-16 md:px-8">
      <SandboxHero hub={hub} />
      <Overview hub={hub} />
      <FeaturedOffers offers={hub.featuredOffers} />
      <RecentActivity hub={hub} />
      <AdvancedLinks hub={hub} />
    </main>
  );
}

function SandboxHero({ hub }: { hub: SandboxHubData }) {
  const title = hub.title || hub.sandbox?.displayName || hub.namespace || "Sandbox";
  const image = getImage((hub.keyImages ?? []).filter(Boolean) as SingleOffer["keyImages"], [
    "DieselStoreFrontWide",
    "OfferImageWide",
    "DieselGameBoxWide",
    "TakeoverWide",
    "Screenshot",
  ]);
  const releaseStatus = getReleaseStatus(hub.primaryOffer);

  return (
    <section className="grid w-full grid-cols-1 gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
      <div className="flex min-w-0 flex-col justify-center gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{hub.primaryKind === "item" ? "Executable" : "Product"}</Badge>
          {releaseStatus && <Badge variant="secondary">{releaseStatus}</Badge>}
          {hub.sandbox?.status && <Badge variant="outline">{hub.sandbox.status}</Badge>}
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">{title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {hub.developer && <span>{hub.developer}</span>}
            {hub.publisher && (
              <>
                <span>/</span>
                <span>{hub.publisher}</span>
              </>
            )}
            {hub.seller?.id ? (
              <>
                <span>/</span>
                <Link
                  to="/sellers/$id"
                  params={{ id: hub.seller.id }}
                  className="underline decoration-dotted underline-offset-4"
                >
                  {hub.seller.name}
                </Link>
              </>
            ) : (
              hub.seller?.name && (
                <>
                  <span>/</span>
                  <span>{hub.seller.name}</span>
                </>
              )
            )}
          </div>
        </div>

        {hub.description && (
          <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            {hub.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {hub.genres?.slice(0, 5).map((genre) => (
            <Badge key={genre?.id ?? genre?.name} variant="secondary">
              {genre?.name}
            </Badge>
          ))}
          {hub.platforms?.slice(0, 6).map((platform) => (
            <Badge key={platform} variant="outline">
              {platform}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PriceBlock price={hub.price} />
          {hub.primaryOffer && <StoreActions offer={hub.primaryOffer} />}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border bg-card">
        <Image
          src={image.url}
          alt={title}
          width={900}
          height={506}
          quality="high"
          eager
          className="aspect-video h-full w-full object-cover"
        />
      </div>
    </section>
  );
}

function StoreActions({ offer }: { offer: SingleOffer }) {
  const storeUrl = getStoreUrl(offer);

  return (
    <>
      {storeUrl && (
        <Button asChild className="h-10 gap-2 rounded-lg">
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <ShoppingBag className="size-4" />
            <span>Store Page</span>
          </a>
        </Button>
      )}
      <OpenLauncher id={offer.id} />
    </>
  );
}

function getStoreUrl(offer: SingleOffer) {
  if (offer.namespace === "ue") {
    const fabListingId = offer.customAttributes?.FabListingId?.value;
    return fabListingId ? `https://www.fab.com/listings/${fabListingId}` : null;
  }

  const isBundle = offer.offerType === "BUNDLE";
  const namespace = isBundle ? "bundles" : "product";
  const urlType = offer.offerType === "BASE_GAME" ? "product" : "url";
  const slug =
    offer.customAttributes?.["com.epicgames.app.productSlug"]?.value ??
    offer.offerMappings?.[0]?.pageSlug ??
    offer.urlSlug ??
    (urlType === "product" ? offer.productSlug : offer.urlSlug);

  if (!slug) {
    return null;
  }

  return `/store/${namespace}/${slug.replaceAll("-pp", "")}?id=${offer.id}&ns=${offer.namespace}`;
}

function Overview({ hub }: { hub: SandboxHubData }) {
  const metadata = [
    {
      icon: CalendarDays,
      label: "Release",
      value: formatDate(hub.primaryOffer?.releaseDate),
    },
    {
      icon: Clock3,
      label: "Updated",
      value: formatDate(hub.updated),
    },
    {
      icon: Gamepad2,
      label: "Platforms",
      value: hub.platforms?.length ? hub.platforms.join(", ") : "N/A",
    },
    {
      icon: Trophy,
      label: "Achievements",
      value: hub.achievements?.total ? `${hub.achievements.total} achievements` : "N/A",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metadata.map((item) => (
        <Card key={item.label} className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-5">
            <item.icon className="mt-1 size-5 text-muted-foreground" />
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="mt-1 break-words text-lg font-semibold">{item.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function FeaturedOffers({ offers }: { offers: SingleOffer[] }) {
  if (!offers.length) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="Offers and Editions" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} size="sm" />
        ))}
      </div>
    </section>
  );
}

function RecentActivity({ hub }: { hub: SandboxHubData }) {
  const recentBuilds = (hub.recentBuilds ?? []).filter((build) => build?._id).slice(0, 5);
  const recentChanges = (hub.recentChanges ?? []).filter((change) => change?._id).slice(0, 5);
  const hasBuilds = recentBuilds.length > 0;
  const hasChanges = recentChanges.length > 0;

  if (!hasBuilds && !hasChanges) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {hasBuilds && (
        <div className="flex flex-col gap-3">
          <SectionHeading title="Recent Builds" />
          <div className="flex flex-col gap-2">
            {recentBuilds.map((build) => {
              if (!build?._id) {
                return null;
              }

              return (
                <Link
                  key={build._id}
                  to="/builds/$id"
                  params={{ id: build._id }}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {build?.labelName || build?.appName || "Unknown build"}
                    </div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {build?.buildVersion || build?.appName}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm text-muted-foreground">
                    <div>{calculateSize(Number(build?.downloadSizeBytes ?? 0))}</div>
                    <div>{formatDate(build?.updatedAt)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="flex flex-col gap-3">
          <SectionHeading title="Recent Changes" />
          <div className="flex flex-col gap-2">
            {recentChanges.map((change) => {
              if (!change?._id) {
                return null;
              }

              const firstChange = change?.metadata?.changes?.[0];

              return (
                <Link
                  key={change._id}
                  to="/sandboxes/$id/changelog"
                  params={{ id: hub.id ?? "" }}
                  className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {change?.metadata?.contextType || "Change"}
                      {firstChange?.field ? ` - ${firstChange.field}` : ""}
                    </div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">
                      {change?.metadata?.contextId}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground">
                    {formatDate(change?.timestamp)}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function AdvancedLinks({ hub }: { hub: SandboxHubData }) {
  const stats = hub.stats;
  const links = [
    { label: "Offers", value: stats?.offers, to: "/sandboxes/$id/offers", icon: StoreIcon },
    { label: "Items", value: stats?.items, to: "/sandboxes/$id/items", icon: LibrarySquareIcon },
    { label: "Assets", value: stats?.assets, to: "/sandboxes/$id/assets", icon: Archive },
    { label: "Builds", value: stats?.builds, to: "/sandboxes/$id/builds", icon: PackageIcon },
    {
      label: "Achievements",
      value: stats?.achievements,
      to: "/sandboxes/$id/achievements",
      icon: Trophy,
    },
    { label: "Changelog", value: null, to: "/sandboxes/$id/changelog", icon: BoxIcon },
  ];

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="Advanced Data" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.to}
            params={{ id: hub.id ?? "" }}
            className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <link.icon className="size-4" />
              <span>{link.label}</span>
            </div>
            <div className="mt-3 text-2xl font-semibold">
              {typeof link.value === "number" ? link.value.toLocaleString("en-GB") : "View"}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PriceBlock({ price }: { price: Price | null }) {
  const { locale } = useLocale();

  if (!price) {
    return null;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.price.currencyCode || "USD",
  });
  const discountPrice = calculatePrice(price.price.discountPrice ?? 0, price.price.currencyCode);
  const originalPrice = calculatePrice(price.price.originalPrice ?? 0, price.price.currencyCode);
  const discounted = (price.price.discount ?? 0) > 0 && originalPrice > discountPrice;
  const discountPercent = discounted
    ? Math.round(((originalPrice - discountPrice) / originalPrice) * 100)
    : 0;

  return (
    <div className="flex h-10 items-center gap-3 rounded-lg border bg-card px-4">
      <span className={cn("text-lg font-semibold", discounted && "text-primary")}>
        {discountPrice === 0 ? "Free" : formatter.format(discountPrice)}
      </span>
      {discounted && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatter.format(originalPrice)}
          </span>
          <Badge className="bg-badge text-black">-{discountPercent}%</Badge>
        </>
      )}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="text-2xl font-semibold">{title}</h2>;
}

function SandboxHubSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 pb-16 md:px-8">
      <section className="grid grid-cols-1 gap-8 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="h-24 w-full max-w-3xl" />
          <Skeleton className="h-10 w-96" />
        </div>
        <Skeleton className="aspect-video w-full rounded-lg" />
      </section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
    </main>
  );
}

function getReleaseStatus(offer: SingleOffer | null) {
  if (!offer) {
    return null;
  }

  if (offer.prePurchase) {
    return "Pre-purchase";
  }

  if (!offer.releaseDate || offer.releaseDate.includes("2099")) {
    return "Date pending";
  }

  return new Date(offer.releaseDate) > new Date() ? "Coming soon" : "Released";
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  const date = DateTime.fromISO(value);
  if (!date.isValid) {
    return "N/A";
  }

  return date.setLocale("en-GB").toLocaleString({
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
