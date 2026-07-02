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
import i18n from "@/lib/i18n";
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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
          <h2 className="text-2xl font-semibold">{t("sandboxes.unavailableTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("sandboxes.unavailableDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{t("sandboxes.notFoundTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("sandboxes.noProductDataDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SandboxPageHeader
        icon={Workflow}
        eyebrow={t("sandboxes.hubEyebrow")}
        title={t("sandboxes.hubOverviewTitle")}
        description={t("sandboxes.hubOverviewDescription")}
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/sandboxes/$id/changelog" params={{ id: hub.id ?? "" }}>
            <FileClock className="size-4" />
            {t("sandboxes.latestChangesButton")}
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
  const { t } = useTranslation();
  const entities = [
    {
      label: t("sandboxes.entityOffersLabel"),
      value: hub.stats?.offers,
      description: t("sandboxes.entityOffersDescription"),
      icon: StoreIcon,
      to: "/sandboxes/$id/offers",
    },
    {
      label: t("sandboxes.entityItemsLabel"),
      value: hub.stats?.items,
      description: t("sandboxes.entityItemsDescription"),
      icon: LibrarySquareIcon,
      to: "/sandboxes/$id/items",
    },
    {
      label: t("sandboxes.entityAssetsLabel"),
      value: hub.stats?.assets,
      description: t("sandboxes.entityAssetsDescription"),
      icon: Archive,
      to: "/sandboxes/$id/assets",
    },
    {
      label: t("sandboxes.entityBuildsLabel"),
      value: hub.stats?.builds,
      description: t("sandboxes.entityBuildsDescription"),
      icon: PackageIcon,
      to: "/sandboxes/$id/builds",
    },
    {
      label: t("sandboxes.entityAchievementsLabel"),
      value: hub.stats?.achievements,
      description: t("sandboxes.entityAchievementsDescription"),
      icon: EpicTrophyIcon,
      to: "/sandboxes/$id/achievements",
    },
    {
      label: t("sandboxes.entityChangelogLabel"),
      value: null,
      description: t("sandboxes.entityChangelogDescription"),
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
            {typeof entity.value === "number"
              ? formatSandboxCount(entity.value)
              : t("sandboxes.viewButton")}
          </div>
        </Link>
      ))}
    </section>
  );
}

function FeaturedOffers({ offers }: { offers: SingleOffer[] }) {
  const { t } = useTranslation();
  if (!offers.length) {
    return null;
  }

  return (
    <SandboxDataSurface
      title={t("sandboxes.storefrontOffersTitle")}
      description={t("sandboxes.storefrontOffersDescription")}
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
  const { t } = useTranslation();
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
          title={t("sandboxes.recentBuildsTitle")}
          description={t("sandboxes.recentBuildsDescription")}
          badge={`${recentBuilds.length} ${t("sandboxes.latestBadge")}`}
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
                      {build?.labelName || build?.appName || t("sandboxes.unknownBuildLabel")}
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
          title={t("sandboxes.recentChangesTitle")}
          description={t("sandboxes.recentChangesDescription")}
          badge={`${recentChanges.length} ${t("sandboxes.latestBadge")}`}
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
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-none",
        value === "insert" && "bg-emerald-500/15 text-emerald-300",
        value === "delete" && "bg-destructive/15 text-destructive",
        value !== "insert" && value !== "delete" && "bg-primary/15 text-primary",
      )}
    >
      {value ?? t("sandboxes.updateBadge")}
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
    return i18n.t("sandboxes.changeDefaultLabel");
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return i18n.t("common.notAvailable");
  }

  const date = DateTime.fromISO(value);
  if (!date.isValid) {
    return i18n.t("common.notAvailable");
  }

  return date.setLocale("en-GB").toLocaleString({
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
