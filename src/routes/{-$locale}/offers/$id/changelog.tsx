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
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ClientOnly } from "@/lib/cllient-only";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import {
  fetchV1CursorPageAt,
  getV1TotalPages,
  type V1CursorPaginationMeta,
} from "@/lib/v1-adapters";
import { offerChangeFields } from "@/lib/offer-change-fields";
import { offerOnlyQueryOptions, resolveQueryLocale } from "@/queries/offer";
import type { ChangelogStats } from "@/types/changelog";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { useDebounce } from "@uidotdev/usehooks";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/hooks/use-locale";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

type ChangelogWithPagination = {
  elements: Change[];
  page: number;
  limit: number;
  totalCount: number | null;
  totalPages: number | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const getChangelog = (id: string, page: number, query?: string, field?: string, type?: string) => {
  const trimmedQuery = query?.trim() || undefined;
  const limit = 20;
  return {
    queryKey: ["changelog", { id, page, query: trimmedQuery, field, type }],
    queryFn: async () => {
      try {
        const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
          Change[],
          V1CursorPaginationMeta
        >(
          (cursor) =>
            httpClient.v1GetEnvelope<Change[], V1CursorPaginationMeta>(`/offers/${id}/changelog`, {
              params: {
                cursor,
                limit,
                query: trimmedQuery,
                field,
                type,
              },
            }),
          page,
          `offer-changelog:${id}:${trimmedQuery ?? ""}:${field ?? ""}:${type ?? ""}`,
        );
        const elements = Array.isArray(envelope?.data) ? envelope.data : [];
        const totalPages = getV1TotalPages(envelope?.meta?.pagination, limit);
        return {
          elements,
          page: resolvedPage,
          limit: envelope?.meta?.pagination?.limit ?? limit,
          totalCount: total,
          totalPages,
          hasNextPage: hasMore,
          hasPreviousPage: resolvedPage > 1,
        } satisfies ChangelogWithPagination;
      } catch {
        return null;
      }
    },
    placeholderData: keepPreviousData,
  };
};

export const Route = createFileRoute("/{-$locale}/offers/$id/changelog")({
  component: ChangelogPage,

  loader: async ({ params, context }) => {
    const { queryClient, locale, cookies } = context;
    const { id } = params;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);

    if (import.meta.env.SSR) {
      const [offer] = await Promise.all([
        queryClient.ensureQueryData(offerQuery).catch(() => null),
        queryClient.prefetchQuery(getChangelog(id, 1)),
      ]);

      return {
        id,
        locale: resolvedLocale,
        offer,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(getChangelog(id, 1));

    return {
      id,
      locale: resolvedLocale,
      offer: cachedOffer ?? null,
      isOfferLoaded: cachedOffer !== undefined,
    };
  },

  head: (ctx) => {
    if (!ctx.loaderData) {
      return {
        meta: [],
      };
    }

    const { offer, isOfferLoaded } = ctx.loaderData;

    if (!offer) {
      if (!isOfferLoaded) {
        return {
          meta: [],
        };
      }

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
  const { id } = Route.useParams();
  const { locale } = useLocale();
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
      httpClient.v1Get<ChangelogStats>(`/offers/${id}/changelog/stats`, {
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
      <section className="flex flex-col gap-4 mt-6">
        <div className="border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("offerDetail.changelog.title")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: This is a fallback component
              key={index}
              className="rounded-xl border border-white/10 bg-card/80 p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="flex flex-col gap-4 mt-6">
        <div className="border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("offerDetail.changelog.title")}
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/80 px-6 py-16 text-center">
          <p className="font-display text-lg sm:text-xl font-semibold text-muted-foreground">
            {t("offerDetail.changelog.noChangelog")}
          </p>
        </div>
      </section>
    );
  }
  const changelogItems = Array.isArray(data.elements) ? data.elements : [];

  return (
    <section className="flex flex-col gap-4 mt-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border/60 pb-3 mb-5">
        <div className="inline-flex flex-wrap items-center gap-2.5">
          <TooltipTrigger>
            <span tabIndex={0} className="inline-flex gap-2 items-center">
              <h2
                className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground underline decoration-dotted underline-offset-4 decoration-border/60"
                id="changelog-title"
              >
                {t("offerDetail.changelog.title")}
              </h2>
            </span>
            <Tooltip
              placement="top start"
              className="bg-background border border-white/10 flex-col items-start gap-1 p-3 shadow-lg"
            >
              <p className="text-sm text-muted-foreground">{t("offerDetail.changelog.tooltip")}</p>
              <p className="text-sm text-muted-foreground">
                {t("offerDetail.changelog.sandboxChangelogPrefix")}{" "}
                <Link
                  to="/{-$locale}/sandboxes/$id/changelog"
                  params={{ id: offer?.namespace ?? "epic" }}
                  className="underline decoration-dotted underline-offset-4 decoration-border/60 hover:text-foreground transition-colors duration-150"
                >
                  {t("offerDetail.changelog.sandboxChangelog")}
                </Link>
                .
              </p>
            </Tooltip>
          </TooltipTrigger>
          {data.totalCount !== null && (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {data.totalCount.toLocaleString(locale)}
            </span>
          )}
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Select
              selectedKey={type ?? "all"}
              onSelectionChange={(value) => {
                const str = String(value);
                setType(str === "all" ? undefined : str);
                setPage(1);
              }}
              placeholder={t("offerDetail.changelog.allTypes")}
            >
              <SelectTrigger className="w-[140px] border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">{t("offerDetail.changelog.allTypes")}</SelectItem>
                <Separator className="my-2" />
                <SelectItem id="insert" textValue={t("offerDetail.changelog.typeInsert")}>
                  <ChangeTypeBubble type="insert" />
                </SelectItem>
                <SelectItem id="update" textValue={t("offerDetail.changelog.typeUpdate")}>
                  <ChangeTypeBubble type="update" />
                </SelectItem>
                <SelectItem id="delete" textValue={t("offerDetail.changelog.typeDelete")}>
                  <ChangeTypeBubble type="delete" />
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              selectedKey={field ?? "all"}
              onSelectionChange={(value) => {
                const str = String(value);
                setField(str === "all" ? undefined : str);
                setPage(1);
              }}
              placeholder={t("offerDetail.changelog.selectField")}
            >
              <SelectTrigger className="w-[160px] border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="all">{t("offerDetail.changelog.allFields")}</SelectItem>
                <Separator className="my-2" />
                {offerChangeFields.map((field) => (
                  <SelectItem key={field} id={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder={t("offerDetail.changelog.search")}
              className="w-full sm:w-48 border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60"
              onPress={() => {
                setPage(page - 1);
              }}
              isDisabled={page === 1}
            >
              {t("offerDetail.changelog.previous")}
            </Button>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                {data.totalPages !== null
                  ? t("offerDetail.changelog.pageOf", { page, totalPages: data.totalPages })
                  : `Page ${page}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60"
              onPress={() => {
                setPage(page + 1);
              }}
              isDisabled={!data.hasNextPage}
            >
              {t("offerDetail.changelog.next")}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-full gap-4 [&>[data-slot=card]]:rounded-xl [&>[data-slot=card]]:border [&>[data-slot=card]]:border-white/10 [&>[data-slot=card]]:bg-card/80 [&>[data-slot=card]]:transition-[box-shadow,border-color,background-color] [&>[data-slot=card]]:duration-200 [&>[data-slot=card]]:ease-out [&>[data-slot=card]:hover]:bg-card [&>[data-slot=card]:hover]:border-primary/60 [&>[data-slot=card]:hover]:shadow-lg [&>[data-slot=card]:hover]:shadow-black/35">
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
          <div className="rounded-xl border border-white/10 bg-card/80 px-6 py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t("offerDetail.common.noChangesFound")}
            </p>
          </div>
        )}
      </div>
      <div className="[&_button]:transition-colors [&_button]:duration-150">
        <DynamicPagination
          cursorMode
          currentPage={page}
          totalPages={data.totalPages}
          hasMore={data.hasNextPage}
          setPage={(page) => {
            setPage(page);
            window.scrollTo({
              top: document.getElementById("changelog-title")?.offsetTop,
              behavior: "smooth",
            });
          }}
        />
      </div>
      <ClientOnly>
        <div className="flex flex-col gap-4 mt-2 [&_[data-slot=card]]:rounded-xl [&_[data-slot=card]]:border [&_[data-slot=card]]:border-white/10 [&_[data-slot=card]]:bg-card/80">
          <ChangelogDailyChart chartData={stats?.dailyChanges as ChangelogStats["dailyChanges"]} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChangelogWeekdaysChart chartData={stats?.weekdayChanges || {}} />
            <ChangelogFieldsChart chartData={stats?.changeFields || {}} />
            <ChangelogTypesChart
              chartData={stats?.changeTypes || ({} as ChangelogStats["changeTypes"])}
            />
          </div>
        </div>
      </ClientOnly>
    </section>
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
