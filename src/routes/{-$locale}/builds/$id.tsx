import { SectionsNav } from "@/components/app/offer-sections";
import { SandboxPageHeader } from "@/components/app/sandbox-layout";
import { TechnologyLink } from "@/components/technology/TechnologyLink";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import { calculateSize } from "@/lib/calculate-size";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import i18n from "@/lib/i18n";
import { useTranslation } from "@/lib/paraglide-react";
import {
  type BuildItemsResponse,
  buildItemsQueryOptions,
  buildQueryOptions,
} from "@/queries/build-details";
import type { SingleBuild } from "@/types/builds";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { BoxIcon, ChevronDown, FilesIcon, OptionIcon, PackageOpenIcon } from "lucide-react";
import { DateTime } from "luxon";

export const Route = createFileRoute("/{-$locale}/builds/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };
    return (
      <HydrationBoundary state={dehydratedState}>
        <BuildPage />
      </HydrationBoundary>
    );
  },
  loader: async ({ params, context }) => {
    const { id } = params;
    await Promise.allSettled([
      context.queryClient.ensureQueryData(buildQueryOptions(id)),
      context.queryClient.ensureQueryData(buildItemsQueryOptions(id)),
    ]);
    return { id, dehydratedState: dehydrate(context.queryClient) };
  },
  // @ts-expect-error - loader return type
  beforeLoad: async (ctx) => {
    const subPath = ctx.location.pathname.toString().split(`/${ctx.params.id}/`)[1] as
      | string
      | undefined;
    if (!subPath) {
      throw redirect({
        to: "/{-$locale}/builds/$id/files",
        params: { id: ctx.params.id },
        search: { view: "changes", page: 1 },
        replace: true,
        resetScroll: true,
      });
    }
  },
  head: (ctx) => {
    const queryClient = getQueryClient();
    if (!ctx.loaderData) return { meta: [{ title: i18n.t("builds.notFound") }] };
    const build = getFetchedQuery<SingleBuild>(queryClient, ctx.loaderData.dehydratedState, [
      "build",
      { id: ctx.params.id },
    ]);
    const items = getFetchedQuery<BuildItemsResponse>(queryClient, ctx.loaderData.dehydratedState, [
      "build-items",
      { id: ctx.params.id },
    ]);
    if (!build) return { meta: [{ title: i18n.t("builds.notFound") }] };
    const title = items?.data[0]?.title ?? build.appName;
    return {
      meta: [
        { title: i18n.t("builds.meta.title", { title, version: build.buildVersion }) },
        {
          name: "description",
          content: i18n.t("builds.meta.description", { title, version: build.buildVersion }),
        },
      ],
    };
  },
});

function formatDate(
  value: string | null,
  timezone: string | undefined,
  locale: string | undefined,
) {
  if (!value) return "N/A";
  return DateTime.fromISO(value)
    .setZone(timezone || "UTC")
    .setLocale(locale || "en-US")
    .toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}

function BuildPage() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as { dehydratedState: DehydratedState; id: string };
  const { locale } = Route.useParams();
  const navigate = Route.useNavigate();
  const { timezone } = useLocale();
  const subPath = useLocation().pathname.split(`/${id}/`)[1];
  const { data: items } = useQuery(buildItemsQueryOptions(id));
  const { data: build } = useQuery(buildQueryOptions(id));

  if (!build) return <div className="p-4">{t("builds.notFound")}</div>;

  const title = items?.data[0]?.title ?? build.appName;
  const healthVariant = build.manifest.status === "verified" ? "default" : "destructive";
  const technicalDetails = [
    [t("builds.table.buildId"), id.toUpperCase()],
    [t("builds.table.appName"), build.appName],
    [t("builds.table.hash"), build.hash],
    [t("builds.header.firstSeen"), formatDate(build.firstSeenAt, timezone, locale)],
    [t("builds.header.lastSeen"), formatDate(build.lastSeenAt, timezone, locale)],
    [t("builds.header.parser"), build.manifest.parserVersion ?? "N/A"],
  ];

  return (
    <main className="mx-auto flex h-full w-full max-w-[1500px] flex-col gap-6 p-4 md:px-8">
      <SandboxPageHeader
        icon={PackageOpenIcon}
        eyebrow={t("builds.build")}
        title={`${title} · ${build.buildVersion}`}
        description={t("builds.header.description")}
        stats={[
          {
            label: t("builds.table.installedSize"),
            value: calculateSize(build.installedSizeBytes),
          },
          { label: t("builds.header.fullDownload"), value: calculateSize(build.downloadSizeBytes) },
          {
            label: t("builds.header.files"),
            value: build.manifest.fileCount?.toLocaleString(locale) ?? "N/A",
          },
          {
            label: t("builds.header.firstSeen"),
            value: formatDate(build.firstSeenAt, timezone, locale),
          },
        ]}
      >
        <Badge
          variant="outline"
          className="border-border/60 tabular-nums transition-colors duration-150 hover:border-primary/50"
        >
          {build.platform}
        </Badge>
        <Badge
          variant="outline"
          className="border-border/60 tabular-nums transition-colors duration-150 hover:border-primary/50"
        >
          {build.labelName}
        </Badge>
        <Badge variant={healthVariant} className="transition-colors duration-150">
          {t(`builds.health.${build.manifest.status}`)}
        </Badge>
      </SandboxPageHeader>

      <details
        open
        className="group rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-border"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-display text-sm font-semibold tracking-tight text-foreground transition-colors duration-150 hover:text-primary group-open:border-b group-open:border-border/60 group-open:pb-3">
          <span>{t("builds.header.technicalDetails")}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          {technicalDetails.map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 rounded-lg border border-border/40 bg-background/40 px-3.5 py-2.5 transition-colors duration-150 hover:border-primary/40"
            >
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono tabular-nums text-foreground/95">{value}</dd>
            </div>
          ))}
          <div className="md:col-span-2 pt-1">
            <dt className="text-xs font-medium text-muted-foreground">
              {t("builds.table.technologies")}
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {build.technologies.length ? (
                build.technologies
                  .filter((technology) => technology.section !== "Evidence")
                  .map((technology) => (
                    <TechnologyLink
                      key={`${technology.section}.${technology.technology}`}
                      id={technology.technology}
                      className="group/tech rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Badge
                        variant="secondary"
                        className="border border-border/50 transition-[box-shadow,border-color,background-color,color] duration-200 ease-out group-hover/tech:border-primary/50 group-hover/tech:bg-primary/10 group-hover/tech:text-primary"
                      >
                        {technology.section} / {technology.technology}
                      </Badge>
                    </TechnologyLink>
                  ))
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )}
            </dd>
          </div>
        </dl>
      </details>

      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:gap-6">
        <SectionsNav
          links={[
            {
              id: "files",
              label: (
                <span className="inline-flex items-center gap-2">
                  <FilesIcon className="size-3.5" />
                  {t("builds.tabs.files")}
                </span>
              ),
              href: `/builds/${id}/files`,
            },
            {
              id: "items",
              label: (
                <span className="inline-flex items-center gap-2">
                  <BoxIcon className="size-3.5" />
                  {t("builds.tabs.items")}
                </span>
              ),
              href: `/builds/${id}/items`,
            },
            {
              id: "install-options",
              label: (
                <span className="inline-flex items-center gap-2">
                  <OptionIcon className="size-3.5" />
                  {t("builds.tabs.installOptions")}
                </span>
              ),
              href: `/builds/${id}/install-options`,
            },
          ]}
          activeSection={subPath ?? "files"}
          onSectionChange={(location) => {
            const routes = {
              files: "/{-$locale}/builds/$id/files",
              items: "/{-$locale}/builds/$id/items",
              "install-options": "/{-$locale}/builds/$id/install-options",
            } as const;
            navigate({
              to: routes[location as keyof typeof routes] ?? routes.files,
              params: { id, locale },
              resetScroll: false,
            });
          }}
          orientation="vertical"
        />
        <div className="h-full w-full min-w-0">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
