import { httpClient } from '@/lib/http-client';
import type { SingleBuild } from '@/types/builds';
import {
  dehydrate,
  HydrationBoundary,
  keepPreviousData,
  useQueries,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { DataTable } from '@/components/tables/builds/table';
import { columns } from '@/components/tables/builds/columns';
import type { SingleOffer } from '@/types/single-offer';
import { SandboxHeader } from '@/components/app/sandbox-header';
import type { SingleSandbox } from '@/types/single-sandbox';
import { getFetchedQuery } from '@/lib/get-fetched-query';
import { getQueryClient } from '@/lib/client';
import { generateSandboxMeta } from '@/lib/generate-sandbox-meta';
import { useState } from 'react';
import type { ColumnFiltersState } from '@tanstack/react-table';

interface PaginatedResponse<T> {
  elements: T[];
  page: number;
  limit: number;
  count: number;
}

export const Route = createFileRoute('/sandboxes/$id/builds')({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxBuildsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ['sandbox', 'builds', { id, page: 1, limit: 20, filters: [] }],
      queryFn: () =>
        httpClient.get<PaginatedResponse<SingleBuild>>(
          `/sandboxes/${id}/builds`,
          {
            params: { page: 1, limit: 20 },
          },
        ),
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
            title: 'Sandbox not found',
            description: 'Sandbox not found',
          },
        ],
      };
    }

    const { id } = params;

    const sandbox = getFetchedQuery<SingleSandbox>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      ['sandbox', { id }],
    );
    const offer = getFetchedQuery<SingleOffer>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      ['sandbox', 'base-game', { id }],
    );

    if (!sandbox)
      return {
        meta: [
          {
            title: 'Sandbox not found',
            description: 'Sandbox not found',
          },
        ],
      };

    return {
      meta: generateSandboxMeta(sandbox, offer, 'Builds'),
    };
  },
});

function SandboxBuildsPage() {
  const { id } = Route.useParams();
  const [page, setPage] = useState({ pageIndex: 0, pageSize: 20 });
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [buildsQuery, baseGameQuery, sandboxQuery] = useQueries({
    queries: [
      {
        queryKey: [
          'sandbox',
          'builds',
          { id, page: page.pageIndex + 1, limit: page.pageSize, filters },
        ],
        queryFn: () => {
          const queryParams = new URLSearchParams();
          queryParams.set('page', (page.pageIndex + 1).toString());
          queryParams.set('limit', page.pageSize.toString());
          for (const filter of filters) {
            queryParams.set(filter.id, filter.value as string);
          }

          return httpClient.get<PaginatedResponse<SingleBuild>>(
            `/sandboxes/${id}/builds`,
            { params: Object.fromEntries(queryParams) },
          );
        },

        placeholderData: keepPreviousData,
      },
      {
        queryKey: ['sandbox', 'base-game', { id }],
        queryFn: () =>
          httpClient.get<SingleOffer>(`/sandboxes/${id}/base-game`),
        retry: false,
      },
      {
        queryKey: ['sandbox', { id }],
        queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${id}`),
      },
    ],
  });

  const { data: buildsData } = buildsQuery;
  const { data: baseGame } = baseGameQuery;
  const { data: sandbox } = sandboxQuery;

  return (
    <main className="flex flex-col builds-start justify-start h-full gap-4 px-4 w-full">
      <SandboxHeader
        title={
          baseGame?.title ?? sandbox?.displayName ?? (sandbox?.name as string)
        }
        section="builds"
        id={id}
        sandbox={id}
      />
      <DataTable
        columns={columns}
        data={buildsData?.elements ?? []}
        setPage={setPage}
        page={page}
        total={buildsData?.count ?? 0}
        filters={filters}
        setFilters={setFilters}
      />
    </main>
  );
}
