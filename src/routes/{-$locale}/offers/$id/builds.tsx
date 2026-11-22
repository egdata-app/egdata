import { columns } from "@/components/tables/builds/columns";
import { DataTable } from "@/components/tables/builds/table";
import { Skeleton } from "@/components/ui/skeleton";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import { offerOnlyQueryOptions, resolveQueryLocale } from "@/queries/offer";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { Build } from "@/types/builds";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

const getOfferBuilds = (id: string) =>
  queryOptions({
    queryKey: ["offer-builds", { id }],
    queryFn: () => httpClient.v1Get<Build[]>(`/offers/${id}/builds`).catch(() => []),
  });

export const Route = createFileRoute("/{-$locale}/offers/$id/builds")({
  component: BuildsPage,
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
        queryClient.prefetchQuery(getOfferBuilds(id)),
      ]);

      return {
        id,
        offer,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(getOfferBuilds(id));

    return {
      id,
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
      meta: generateOfferMeta(offer, i18n.t("offerDetail.builds.title")),
    };
  },
});

function BuildsPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const { data: builds, isLoading, isError } = useQuery(getOfferBuilds(id));

  if (isLoading) {
    return (
      <section id="offer-builds" className="h-full w-full">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("offerDetail.builds.title")}
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-9 w-56 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="space-y-2 pt-2">
            {["b1", "b2", "b3", "b4", "b5", "b6"].map((key) => (
              <Skeleton key={key} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section id="offer-builds" className="h-full w-full">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t("offerDetail.builds.title")}
          </h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/60 p-6 text-sm text-muted-foreground">
          {t("offerDetail.common.somethingWentWrong")}
        </div>
      </section>
    );
  }

  // Filter builds based on the current filters
  const filteredBuilds =
    builds?.filter((build) => {
      return filters.every((filter) => {
        if (filter.id === "labelName" && Array.isArray(filter.value)) {
          const platform = build.labelName.split("-")[1];
          return filter.value.includes(platform);
        }
        const value = build[filter.id as keyof Build];
        if (Array.isArray(filter.value)) {
          return filter.value.includes(value);
        }
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      });
    }) ?? [];

  return (
    <section id="offer-builds" className="h-full w-full">
      <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {t("offerDetail.builds.title")}
        </h2>
        <span className="rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {filteredBuilds.length}
        </span>
      </div>
      <DataTable<Build, unknown>
        columns={columns}
        data={filteredBuilds}
        setPage={setPage}
        page={page}
        total={filteredBuilds.length}
        filters={filters}
        setFilters={setFilters}
      />
    </section>
  );
}
