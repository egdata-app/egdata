import { columns } from "@/components/tables/items/columns";
import { DataTable } from "@/components/tables/items/table";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { httpClient } from "@/lib/http-client";
import { offerOnlyQueryOptions } from "@/queries/offer-gql";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer | null;
};

export const Route = createFileRoute("/{-$locale}/offers/$id/items")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;
    return (
      <HydrationBoundary state={dehydratedState}>
        <ItemsPage />
      </HydrationBoundary>
    );
  },
  loader: async ({ params, context }) => {
    const { queryClient, locale } = context;

    const offer = await queryClient.ensureQueryData(offerOnlyQueryOptions(params.id, locale));

    await queryClient.prefetchQuery({
      queryKey: ["offer-items", { id: params.id }],
      queryFn: () => httpClient.get<SingleItem[]>(`/offers/${params.id}/items`).catch(() => []),
    });

    return {
      id: params.id,
      dehydratedState: dehydrate(queryClient),
      offer,
    };
  },

  head: (ctx) => {
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

    const { offer } = ctx.loaderData;

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
      meta: generateOfferMeta(offer, i18n.t("offerDetail.items.title")),
    };
  },
});

function ItemsPage() {
  const { t } = useTranslation();
  const { id } = Route.useLoaderData() as LoaderData;
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const {
    data: items,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["offer-items", { id }],
    queryFn: () => httpClient.get<SingleItem[]>(`/offers/${id}/items`),
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
