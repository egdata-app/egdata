import { columns } from "@/components/tables/items/columns";
import { DataTable } from "@/components/tables/items/table";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import { offerOnlyQueryOptions, resolveQueryLocale } from "@/queries/offer";
import type { SingleItem } from "@/types/single-item";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/offers/$id/items")({
  component: ItemsPage,
  loader: async ({ params, context }) => {
    const { queryClient, locale, cookies } = context;
    const { id } = params;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);
    const itemsQuery = {
      queryKey: ["offer-items", { id }],
      queryFn: () => httpClient.v1Get<SingleItem[]>(`/offers/${id}/items`).catch(() => []),
    };

    if (import.meta.env.SSR) {
      const [offer] = await Promise.all([
        queryClient.ensureQueryData(offerQuery).catch(() => null),
        queryClient.prefetchQuery(itemsQuery),
      ]);

      return {
        id,
        offer,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(itemsQuery);

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
      meta: generateOfferMeta(offer, i18n.t("offerDetail.items.title")),
    };
  },
});

function ItemsPage() {
  const { t } = useTranslation();
  const { id } = Route.useParams();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const {
    data: items,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["offer-items", { id }],
    queryFn: () => httpClient.v1Get<SingleItem[]>(`/offers/${id}/items`),
  });

  if (isLoading) {
    return <div>{t("offerDetail.common.loading")}</div>;
  }

  if (isError) {
    return (
      <section id="offer-items" className="w-full h-full">
        <h2 className="text-2xl font-bold">{t("offerDetail.items.title")}</h2>
        <div>{t("offerDetail.common.somethingWentWrong")}</div>
      </section>
    );
  }

  return (
    <section id="offer-items" className="h-full w-full">
      <h2 className="text-xl md:text-2xl font-bold mb-4">{t("offerDetail.items.title")}</h2>
      <DataTable<SingleItem, unknown>
        columns={columns}
        data={items ?? []}
        setPage={setPage}
        page={page}
        total={items?.length ?? 0}
        filters={filters}
        setFilters={setFilters}
      />
    </section>
  );
}
