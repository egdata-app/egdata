import { SandboxCatalogPreviews, SandboxQueryState } from "@/components/app/sandbox-catalog";
import { sandboxCatalogGroups } from "@/lib/sandbox-catalog";
import { sandboxViewTransition } from "@/lib/sandbox-transition";
import { sandboxCatalogQueryOptions } from "@/queries/sandbox-catalog";
import { formatSandboxCount, SandboxDataSurface } from "@/components/app/sandbox-layout";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { useCountry } from "@/hooks/use-country";
import { calculateSize } from "@/lib/calculate-size";
import i18n from "@/lib/i18n";
import { timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";
import { sandboxHubQueryOptions, type SandboxHubData } from "@/queries/sandbox-hub";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { DateTime } from "luxon";
import {
  Archive,
  ArrowRight,
  Box,
  FileClock,
  LibrarySquareIcon,
  Package,
  PackageIcon,
  Radio,
  Sparkles,
  StoreIcon,
  Tag,
  Trophy,
  Zap,
} from "lucide-react";
import { useTranslation } from "@/lib/paraglide-react";

export const Route = createFileRoute("/{-$locale}/sandboxes/$id/")({
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

    await Promise.all(
      sandboxCatalogGroups.map((group) =>
        queryClient.prefetchQuery(
          sandboxCatalogQueryOptions(
            id,
            { q: "", group: group.id, types: "", page: 1, pageSize: 4 },
            country || "US",
          ),
        ),
      ),
    );

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
    refetch,
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

  return (
    <div className="flex flex-col gap-12">
      {hub && <EntityStatsStrip hub={hub} />}
      {isError && <SandboxQueryState error retry={() => void refetch()} />}
      <SandboxCatalogPreviews id={id} total={hub?.stats?.offers} />
      {hub && <RecentActivity hub={hub} />}
    </div>
  );
}

function EntityStatsStrip({ hub }: { hub: SandboxHubData }) {
  const { t } = useTranslation();
  const entities = [
    {
      label: t("sandboxes.entityOffersLabel"),
      value: hub.stats?.offers,
      description: t("sandboxes.entityOffersDescription"),
      icon: StoreIcon,
      to: "/{-$locale}/sandboxes/$id/offers" as const,
    },
    {
      label: t("sandboxes.entityItemsLabel"),
      value: hub.stats?.items,
      description: t("sandboxes.entityItemsDescription"),
      icon: LibrarySquareIcon,
      to: "/{-$locale}/sandboxes/$id/items" as const,
    },
    {
      label: t("sandboxes.entityAssetsLabel"),
      value: hub.stats?.assets,
      description: t("sandboxes.entityAssetsDescription"),
      icon: Archive,
      to: "/{-$locale}/sandboxes/$id/assets" as const,
    },
    {
      label: t("sandboxes.entityBuildsLabel"),
      value: hub.stats?.builds,
      description: t("sandboxes.entityBuildsDescription"),
      icon: PackageIcon,
      to: "/{-$locale}/sandboxes/$id/builds" as const,
    },
    {
      label: t("sandboxes.entityAchievementsLabel"),
      value: hub.stats?.achievements,
      description: t("sandboxes.entityAchievementsDescription"),
      icon: EpicTrophyIcon,
      to: "/{-$locale}/sandboxes/$id/achievements" as const,
    },
    {
      label: t("sandboxes.entityChangelogLabel"),
      value: null,
      description: t("sandboxes.entityChangelogDescription"),
      icon: FileClock,
      to: "/{-$locale}/sandboxes/$id/changelog" as const,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border/50 pb-8 sm:grid-cols-3 lg:grid-cols-6">
      {entities.map((entity) => (
        <Link
          key={entity.label}
          to={entity.to}
          viewTransition={sandboxViewTransition}
          params={{ id: hub.id ?? "" }}
          className="group -mx-2 flex min-w-0 flex-col items-start rounded-lg px-2 py-1.5 text-start transition-colors duration-150 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex w-full items-baseline justify-between gap-2">
            <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-foreground transition-colors duration-150 group-hover:text-primary sm:text-3xl">
              {typeof entity.value === "number"
                ? formatSandboxCount(entity.value)
                : t("sandboxes.viewButton")}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground/50 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </div>
          <span className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/90">
            <entity.icon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-primary"
            />
            <span className="truncate">{entity.label}</span>
          </span>
          <span className="mt-0.5 truncate text-xs text-muted-foreground">
            {entity.description}
          </span>
        </Link>
      ))}
    </section>
  );
}

function RecentActivity({ hub }: { hub: SandboxHubData }) {
  const { t } = useTranslation();
  const recentBuilds = (hub.recentBuilds ?? []).filter((build) => build?._id).slice(0, 6);
  const recentChanges = (hub.recentChanges ?? []).filter((change) => change?._id).slice(0, 6);
  const hasBuilds = recentBuilds.length > 0;
  const hasChanges = recentChanges.length > 0;

  if (!hasBuilds && !hasChanges) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 items-start gap-x-8 gap-y-10 lg:grid-cols-2">
      {hasBuilds && (
        <SandboxDataSurface
          title={t("sandboxes.recentBuildsTitle")}
          description={t("sandboxes.recentBuildsDescription")}
          badge={`${recentBuilds.length} ${t("sandboxes.latestBadge")}`}
          action={
            <Link
              to="/{-$locale}/sandboxes/$id/builds"
              params={{ id: hub.id ?? "" }}
              viewTransition={sandboxViewTransition}
              className="group/link inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <span>{t("sandboxCatalog.viewAll")}</span>
              <ArrowRight className="size-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          }
        >
          <div className="divide-y divide-border/35">
            {recentBuilds.map((build) => {
              if (!build?._id) {
                return null;
              }

              return (
                <Link
                  key={build._id}
                  to="/{-$locale}/builds/$id"
                  params={{ id: build._id }}
                  className="group -mx-2 flex min-w-0 items-center gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-card/80"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground ring-1 ring-white/10 transition-colors group-hover:text-primary">
                    <Package className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                      {build?.labelName || build?.appName || t("sandboxes.unknownBuildLabel")}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {build?.buildVersion || build?.appName}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular-nums">
                    <div className="text-xs font-medium text-foreground/90">
                      {calculateSize(Number(build?.downloadSizeBytes ?? 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(build?.updatedAt)}
                    </div>
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
          action={
            <Link
              to="/{-$locale}/sandboxes/$id/changelog"
              params={{ id: hub.id ?? "" }}
              viewTransition={sandboxViewTransition}
              className="group/link inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <span>{t("sandboxCatalog.viewAll")}</span>
              <ArrowRight className="size-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          }
        >
          <div className="divide-y divide-border/35">
            {recentChanges.map((change) => {
              if (!change?._id) {
                return null;
              }

              const firstChange = change?.metadata?.changes?.[0];
              const Icon = getChangeIcon(change?.metadata?.contextType, firstChange?.changeType);

              return (
                <Link
                  key={change._id}
                  to="/{-$locale}/sandboxes/$id/changelog"
                  params={{ id: hub.id ?? "" }}
                  viewTransition={sandboxViewTransition}
                  className="group -mx-2 flex min-w-0 items-center gap-3 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-card/80"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground ring-1 ring-white/10 transition-colors group-hover:text-primary">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <ChangeTypeBadge value={firstChange?.changeType} />
                      <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {formatContextType(change?.metadata?.contextType)}
                        {firstChange?.field ? ` · ${firstChange.field}` : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground/80">
                      {change?.metadata?.contextId}
                    </div>
                  </div>
                  <span
                    suppressHydrationWarning
                    className="shrink-0 text-xs tabular-nums text-muted-foreground"
                  >
                    {change?.timestamp ? timeAgo(new Date(change.timestamp)) : formatDate(null)}
                  </span>
                </Link>
              );
            })}
          </div>
        </SandboxDataSurface>
      )}
    </section>
  );
}

function getChangeIcon(contextType: string | null | undefined, action: string | null | undefined) {
  if (action === "insert") return Sparkles;
  if (action === "delete") return Zap;

  switch (contextType) {
    case "build":
      return Package;
    case "offer":
      return Tag;
    case "achievements":
      return Trophy;
    case "item":
      return Box;
    default:
      return Radio;
  }
}

function ChangeTypeBadge({ value }: { value: string | null | undefined }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide",
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
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-border/50 pb-8 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
          <div key={index} className="space-y-2 py-1.5">
            <div className="h-8 w-16 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/30" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted/20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders
          <div key={index} className="space-y-2.5">
            <div className="aspect-[16/9] animate-pulse rounded-lg bg-muted/40" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted/25" />
          </div>
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

  return date.setLocale(i18n.language).toLocaleString({
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
