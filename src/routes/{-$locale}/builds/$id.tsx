import { SectionsNav } from "@/components/app/offer-sections";
import { SandboxPageHeader } from "@/components/app/sandbox-layout";
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
import { BoxIcon, FilesIcon, OptionIcon, PackageOpenIcon } from "lucide-react";
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
    <main className="flex h-full w-full flex-col gap-4 p-4">
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
        <Badge variant="outline">{build.platform}</Badge>
        <Badge variant="outline">{build.labelName}</Badge>
        <Badge variant={healthVariant}>{t(`builds.health.${build.manifest.status}`)}</Badge>
      </SandboxPageHeader>

      <details className="rounded-md border border-border/60 bg-card/50 p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          {t("builds.header.technicalDetails")}
        </summary>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          {technicalDetails.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono">{value}</dd>
            </div>
          ))}
          <div className="md:col-span-2">
            <dt className="text-xs text-muted-foreground">{t("builds.table.technologies")}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {build.technologies.length ? (
                build.technologies
                  .filter((technology) => technology.section !== "Evidence")
                  .map((technology) => (
                    <Badge
                      key={`${technology.section}.${technology.technology}`}
                      variant="secondary"
                    >
                      {technology.section} / {technology.technology}
                    </Badge>
                  ))
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )}
            </dd>
          </div>
        </dl>
      </details>

      <div className="flex w-full flex-col items-start gap-4 md:flex-row md:gap-1">
        <SectionsNav
          links={[
            {
              id: "files",
              label: (
                <span className="inline-flex items-center gap-2">
                  <FilesIcon className="size-3" />
                  {t("builds.tabs.files")}
                </span>
              ),
              href: `/builds/${id}/files`,
            },
            {
              id: "items",
              label: (
                <span className="inline-flex items-center gap-2">
                  <BoxIcon className="size-3" />
                  {t("builds.tabs.items")}
                </span>
              ),
              href: `/builds/${id}/items`,
            },
            {
              id: "install-options",
              label: (
                <span className="inline-flex items-center gap-2">
                  <OptionIcon className="size-3" />
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
