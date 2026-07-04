import { ChangelogDailyChart } from "@/components/app/changelog-daily-chart";
import { ChangelogFieldsChart } from "@/components/app/changelog-fields.chart";
import { ChangelogTypesChart } from "@/components/app/changelog-types-chart";
import { ChangelogWeekdaysChart } from "@/components/app/changelog-weekdays-chart";
import { ChangeTracker } from "@/components/app/changelog/item";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import type { Change } from "@/components/modules/changelist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getQueryClient } from "@/lib/client";
import { ClientOnly } from "@/lib/cllient-only";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { httpClient } from "@/lib/http-client";
import { offerChangeFields } from "@/lib/offer-change-fields";
import { offerOnlyQueryOptions } from "@/queries/offer-gql";
import type { ChangelogStats } from "@/types/changelog";
import type { SingleOffer } from "@/types/single-offer";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { useDebounce } from "@uidotdev/usehooks";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

type ChangelogWithPagination = {
  elements: Change[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const getChangelog = (id: string, page: number, query?: string, field?: string, type?: string) => ({
  queryKey: ["changelog", { id, page, query, field, type }],
  queryFn: () =>
    httpClient
      .get<ChangelogWithPagination>(`/offers/${id}/changelog`, {
        params: {
          page,
          query,
          field,
          type,
        },
      })
      .catch(() => null),
  placeholderData: keepPreviousData,
});

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer | null;
  locale: string | undefined;
};

export const Route = createFileRoute("/{-$locale}/offers/$id/changelog")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;

    return (
      <HydrationBoundary state={dehydratedState}>
        <ChangelogPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { queryClient, locale } = context;
    const { id } = params;

    const offer = await queryClient.ensureQueryData(offerOnlyQueryOptions(params.id, locale));

    await queryClient.prefetchQuery(getChangelog(id, 1));

    return {
      id,
      locale,
      offer,
      dehydratedState: dehydrate(queryClient),
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      ...offerOnlyQueryOptions(params.id, ctx.loaderData?.locale).queryKey,
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, "Changelog"),
    };
  },
});

const changelogTypes = {
  update: {
    label: "Update",
    color: "hsl(var(--chart-1))",
  },
  delete: {
    label: "Delete",
    color: "hsl(var(--chart-2))",
  },
  insert: {
    label: "Insert",
    color: "var(--chart-3)",
  },
};

function ChangelogPage() {
  const { t } = useTranslation();
  const { id, locale } = Route.useLoaderData() as LoaderData;
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState<string | undefined>(undefined);
  const debouncedQuery = useDebounce(query, 500);
  const [field, setField] = useState<string | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching } = useQuery(
    getChangelog(id, page, debouncedQuery, field, type),
  );
  const { data: stats } = useQuery({
    queryKey: ["changelog-stats", { id }],
    queryFn: () =>
      httpClient.get<ChangelogStats>(`/offers/${id}/changelog/stats`, {
        params: {
          // One year ago
          from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
      }),
  });

  const { data: offer } = useQuery(offerOnlyQueryOptions(id, locale));

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 mt-6">
        <h2 className="text-2xl font-bold">{t("offerDetail.changelog.title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: This is a fallback component
            <Skeleton key={index} className="w-full h-72" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-2xl font-bold text-muted-foreground">
          {t("offerDetail.changelog.noChangelog")}
        </p>
      </div>
    );
  }
  const changelogItems = Array.isArray(data.elements) ? data.elements : [];

  return (
    <TooltipProvider>
      <section className="flex flex-col gap-4 mt-6">
        <div className="inline-flex justify-between items-center gap-4">
          <div className="inline-flex items-end gap-2">
            <Tooltip>
              <TooltipTrigger className="inline-flex gap-2 items-center">
                <h2
                  className="text-2xl font-bold underline decoration-dotted underline-offset-4 decoration-border/60"
                  id="changelog-title"
                >
                  {t("offerDetail.changelog.title")}
                </h2>
                {isFetching && <Loader2 className="size-6 animate-spin" />}
              </TooltipTrigger>
              <TooltipContent align="start" className="bg-background">
                <p className="text-sm text-muted-foreground">
                  {t("offerDetail.changelog.tooltip")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("offerDetail.changelog.sandboxChangelogPrefix")}{" "}
                  <Link
                    to="/{-$locale}/sandboxes/$id/changelog"
                    params={{ id: offer?.namespace ?? "epic" }}
                    className="underline decoration-dotted underline-offset-4 decoration-border/60"
                  >
                    {t("offerDetail.changelog.sandboxChangelog")}
                  </Link>
                  .
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-row gap-2 items-center">
              <Select
                value={type}
                onValueChange={(value) => (value === "all" ? setType(undefined) : setType(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("offerDetail.changelog.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("offerDetail.changelog.allTypes")}</SelectItem>
                  <Separator className="my-2" />
                  <SelectItem value="insert">
                    <ChangeTypeBubble type="insert" />
                  </SelectItem>
                  <SelectItem value="update">
                    <ChangeTypeBubble type="update" />
                  </SelectItem>
                  <SelectItem value="delete">
                    <ChangeTypeBubble type="delete" />
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={field}
                onValueChange={(value) => (value === "all" ? setField(undefined) : setField(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("offerDetail.changelog.selectField")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("offerDetail.changelog.allFields")}</SelectItem>
                  <Separator className="my-2" />
                  {offerChangeFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={t("offerDetail.changelog.search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(page - 1);
              }}
              disabled={page === 1}
            >
              {t("offerDetail.changelog.previous")}
            </Button>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {t("offerDetail.changelog.pageOf", { page, totalPages: data.totalPages })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(page + 1);
              }}
              disabled={page === data.totalPages}
            >
              {t("offerDetail.changelog.next")}
            </Button>
          </div>
        </div>
        <div className="flex flex-col w-full gap-4">
          {changelogItems
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((changelist) => (
              <ChangeTracker
                _id={changelist._id}
                key={changelist._id}
                timestamp={changelist.timestamp}
                // @ts-expect-error
                document={changelist.document}
                // @ts-expect-error
                metadata={changelist.metadata}
              />
            ))}
          {changelogItems.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("offerDetail.common.noChangesFound")}
            </p>
          )}
        </div>
        <DynamicPagination
          currentPage={page}
          totalPages={data.totalPages}
          setPage={(page) => {
            setPage(page);
            window.scrollTo({
              top: document.getElementById("changelog-title")?.offsetTop,
              behavior: "smooth",
            });
          }}
        />
        <ClientOnly>
          <ChangelogDailyChart chartData={stats?.dailyChanges as ChangelogStats["dailyChanges"]} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChangelogWeekdaysChart chartData={stats?.weekdayChanges || {}} />
            <ChangelogFieldsChart chartData={stats?.changeFields || {}} />
            <ChangelogTypesChart
              chartData={stats?.changeTypes || ({} as ChangelogStats["changeTypes"])}
            />
          </div>
        </ClientOnly>
      </section>
    </TooltipProvider>
  );
}

function ChangeTypeBubble({ type }: { type: string }) {
  const { t } = useTranslation();
  const entry = changelogTypes[type as keyof typeof changelogTypes];
  const labelMap: Record<string, string> = {
    update: t("offerDetail.changelog.typeUpdate"),
    delete: t("offerDetail.changelog.typeDelete"),
    insert: t("offerDetail.changelog.typeInsert"),
  };
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry?.color }} />
      {labelMap[type] ?? entry?.label}
    </span>
  );
}
