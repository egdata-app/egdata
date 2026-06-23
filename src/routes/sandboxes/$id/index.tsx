import { OfferCard } from "@/components/app/offer-card";
import {
  formatSandboxCount,
  SandboxDataSurface,
  SandboxPageHeader,
} from "@/components/app/sandbox-layout";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/hooks/use-country";
import { calculateSize } from "@/lib/calculate-size";
import { cn } from "@/lib/utils";
import { sandboxHubQueryOptions, type SandboxHubData } from "@/queries/sandbox-hub";
import type { SingleOffer } from "@/types/single-offer";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DateTime } from "luxon";
import {
  Archive,
  ArrowRight,
  FileClock,
  LibrarySquareIcon,
  PackageIcon,
  StoreIcon,
  Workflow,
} from "lucide-react";

export const Route = createFileRoute("/sandboxes/$id/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxHubPage />
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

function SandboxHubPage() {
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Sandbox unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">The product hub could not be loaded.</p>
        </div>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Sandbox not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No product data exists for this sandbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SandboxPageHeader
        icon={Workflow}
        eyebrow="Sandbox"
        title="Overview"
        description="A focused map of the storefront, ownership, delivery, and update records for this namespace."
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/sandboxes/$id/changelog" params={{ id: hub.id ?? "" }}>
            <FileClock className="size-4" />
            Latest changes
          </Link>
        </Button>
      </SandboxPageHeader>

      <EntityMap hub={hub} />
      <FeaturedOffers offers={hub.featuredOffers} />
      <RecentActivity hub={hub} />
    </div>
  );
}

function EntityMap({ hub }: { hub: SandboxHubData }) {
  const entities = [
    {
      label: "Offers",
      value: hub.stats?.offers,
      description: "Store entries",
      icon: StoreIcon,
      to: "/sandboxes/$id/offers",
    },
    {
      label: "Items",
      value: hub.stats?.items,
      description: "Ownable records",
      icon: LibrarySquareIcon,
      to: "/sandboxes/$id/items",
    },
    {
      label: "Assets",
      value: hub.stats?.assets,
      description: "Artifacts and media",
      icon: Archive,
      to: "/sandboxes/$id/assets",
    },
    {
      label: "Builds",
      value: hub.stats?.builds,
      description: "Binary bundles",
      icon: PackageIcon,
      to: "/sandboxes/$id/builds",
    },
    {
      label: "Achievements",
      value: hub.stats?.achievements,
      description: "Progression data",
      icon: EpicTrophyIcon,
      to: "/sandboxes/$id/achievements",
    },
    {
      label: "Changelog",
      value: null,
      description: "Tracked updates",
      icon: FileClock,
      to: "/sandboxes/$id/changelog",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {entities.map((entity) => (
        <Link
          key={entity.label}
          to={entity.to}
          params={{ id: hub.id ?? "" }}
          className="group rounded-md border border-border/60 bg-card/75 p-4 transition-colors hover:border-primary/40 hover:bg-muted/35"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <entity.icon className="size-4 text-primary" />
              <div className="min-w-0">
                <div className="font-medium">{entity.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{entity.description}</div>
              </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          <div className="mt-5 text-2xl font-semibold">
            {typeof entity.value === "number" ? formatSandboxCount(entity.value) : "View"}
          </div>
        </Link>
      ))}
    </section>
  );
}

function FeaturedOffers({ offers }: { offers: SingleOffer[] }) {
  if (!offers.length) {
    return null;
  }

  return (
    <SandboxDataSurface
      title="Storefront offers"
      description="Representative store entries found in this sandbox."
      badge={`${formatSandboxCount(offers.length)} shown`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} size="sm" />
        ))}
      </div>
    </SandboxDataSurface>
  );
}

function RecentActivity({ hub }: { hub: SandboxHubData }) {
  const recentBuilds = (hub.recentBuilds ?? []).filter((build) => build?._id).slice(0, 3);
  const recentChanges = (hub.recentChanges ?? []).filter((change) => change?._id).slice(0, 3);
  const hasBuilds = recentBuilds.length > 0;
  const hasChanges = recentChanges.length > 0;

  if (!hasBuilds && !hasChanges) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {hasBuilds && (
        <SandboxDataSurface
          title="Recent builds"
          description="Newest binary records."
          badge={`${recentBuilds.length} latest`}
        >
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
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md border border-border/60 bg-card/75 p-4 transition-colors hover:border-primary/40 hover:bg-muted/35"
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
        </SandboxDataSurface>
      )}

      {hasChanges && (
        <SandboxDataSurface
          title="Recent changes"
          description="Latest catalog mutations."
          badge={`${recentChanges.length} latest`}
        >
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
                  className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-md border border-border/60 bg-card/75 p-4 transition-colors hover:border-primary/40 hover:bg-muted/35"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ChangeTypeBadge value={firstChange?.changeType} />
                      <div className="truncate font-medium">
                        {formatContextType(change?.metadata?.contextType)}
                        {firstChange?.field ? ` - ${firstChange.field}` : ""}
                      </div>
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
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
        </SandboxDataSurface>
      )}
    </section>
  );
}

function ChangeTypeBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-none",
        value === "insert" && "bg-emerald-500/15 text-emerald-300",
        value === "delete" && "bg-destructive/15 text-destructive",
        value !== "insert" && value !== "delete" && "bg-primary/15 text-primary",
      )}
    >
      {value ?? "update"}
    </span>
  );
}

function SandboxHubSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-44 animate-pulse rounded-md border border-border/60 bg-card/75" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

function formatContextType(value: string | null | undefined) {
  if (!value) {
    return "Change";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
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
