import { ChangeTracker } from "@/components/app/changelog/item";
import type { Change } from "@/components/modules/changelist";
import { Skeleton } from "@/components/ui/skeleton";
import { httpClient } from "@/lib/http-client";
import { dehydrate, type DehydratedState, keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/items/$id/changelog")({
  component: ChangelogPage,

  // @ts-expect-error - loader return type
  loader: async ({ params, context }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["changelog", { id, page: 1 }],
      queryFn: () => httpClient.get<Change[]>(`/items/${id}/changelog`),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
};

function ChangelogPage() {
  const { id } = Route.useLoaderData() as LoaderData;
  const [page] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["changelog", { id, page }],
    queryFn: () =>
      httpClient.get<Change[]>(`/offers/${id}/changelog`, {
        params: {
          page,
        },
      }),
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Changelog</h2>
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
        <p className="text-2xl font-bold text-gray-300">No changelog available</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="inline-flex justify-between items-center">
        <h2 className="text-2xl font-bold">Changelog</h2>
      </div>
      <div className="flex flex-col w-full gap-4">
        {data
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map((changelist) => (
            <ChangeTracker
              key={changelist._id}
              {...({
                _id: changelist._id,
                timestamp: changelist.timestamp,
                document: (changelist as unknown as { document: unknown }).document,
                metadata: changelist.metadata,
              } as Parameters<typeof ChangeTracker>[0])}
            />
          ))}
      </div>
    </section>
  );
}
