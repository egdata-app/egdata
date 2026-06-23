import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate, HydrationBoundary, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
import { DataTable } from "@/components/tables/offers/table";
import { columns } from "@/components/tables/offers/columns";
import type { SingleSandbox } from "@/types/single-sandbox";
import { getQueryClient } from "@/lib/client";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { useState } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import type { DehydratedState } from "@tanstack/react-query";
import { StoreIcon } from "lucide-react";

interface PaginatedResponse<T> {
  elements: T[];
  page: number;
  limit: number;
  count: number;
}

export const Route = createFileRoute("/sandboxes/$id/offers")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxOffersPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["sandbox", "offers", { id, page: 1, limit: 20, filters: [] }],
      queryFn: () =>
        httpClient
          .get<PaginatedResponse<SingleOffer>>(`/sandboxes/${id}/offers`, {
            params: { page: 1, limit: 20 },
          })
          .catch(() => null),
    });

    return {
      id,
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
            title: "Sandbox not found",
            description: "Sandbox not found",
          },
        ],
      };
    }

    const { id } = params;

    const sandbox = getFetchedQuery<SingleSandbox>(queryClient, ctx.loaderData?.dehydratedState, [
      "sandbox",
      { id },
    ]);
    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "sandbox",
      "base-game",
      { id },
    ]);

    if (!sandbox)
      return {
        meta: [
          {
            title: "Sandbox not found",
            description: "Sandbox not found",
          },
        ],
      };

    return {
      meta: generateSandboxMeta(sandbox, offer, "Offers"),
    };
  },
});

function SandboxOffersPage() {
  const { id } = Route.useParams();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const { data: offersData } = useQuery({
    queryKey: [
      "sandbox",
      "offers",
      { id, page: page.pageIndex + 1, limit: page.pageSize, filters },
    ],
    queryFn: () => {
      const queryParams = new URLSearchParams();
      queryParams.set("page", (page.pageIndex + 1).toString());
      queryParams.set("limit", page.pageSize.toString());
      for (const filter of filters) {
        queryParams.set(filter.id, filter.value as string);
      }

      return httpClient.get<PaginatedResponse<SingleOffer>>(`/sandboxes/${id}/offers`, {
        params: Object.fromEntries(queryParams),
      });
    },
    placeholderData: keepPreviousData,
  });
  return (
    <div className="flex flex-col gap-6 w-full">
      <SandboxPageHeader
        icon={StoreIcon}
        eyebrow="E-commerce"
        title="Offers"
        description="Storefront entries in this sandbox, including base games, editions, DLC, add-ons, bundles, and any offer that can grant catalog items."
        stats={[{ label: "Total offers", value: formatSandboxCount(offersData?.count) }]}
      />
      <DataTable
        columns={columns}
        data={offersData?.elements ?? []}
        setPage={setPage}
        page={page}
        total={offersData?.count ?? 0}
        filters={filters}
        setFilters={setFilters}
      />
    </div>
  );
}
