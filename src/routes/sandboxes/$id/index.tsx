import { SandboxHeader } from "@/components/app/sandbox-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { dehydrate, HydrationBoundary, useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

interface SandboxStats {
  offers: number;
  items: number;
  assets: number;
  builds: number;
}

export const Route = createFileRoute("/sandboxes/$id/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["sandbox", "stats", { id }],
      queryFn: () => httpClient.get<SandboxStats>(`/sandboxes/${id}/stats`),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

function SandboxPage() {
  const { id } = Route.useParams();
  const [sandboxQuery, offerQuery, statsQuery] = useQueries({
    queries: [
      {
        queryKey: ["sandbox", { id }],
        queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${id}`),
      },
      {
        queryKey: ["sandbox", "base-game", { id }],
        queryFn: () => httpClient.get<SingleOffer>(`/sandboxes/${id}/base-game`),
        retry: false,
      },
      {
        queryKey: ["sandbox", "stats", { id }],
        queryFn: () => httpClient.get<SandboxStats>(`/sandboxes/${id}/stats`),
      },
    ],
  });

  const { data: sandbox } = sandboxQuery;
  const { data: offer } = offerQuery;
  const { data: stats } = statsQuery;

  if (!sandbox) {
    return null;
  }

  return (
    <main className="flex flex-col items-start justify-start h-full gap-4 px-4 w-full">
      <SandboxHeader
        title={offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)}
        section="stats"
        id={id}
        sandbox={id}
      />
      <section className="flex flex-row items-start justify-start flex-wrap gap-2 w-full mt-4">
        {Object.entries(stats ?? {}).map(([key, value]) => (
          <Card key={key} className="w-[200px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-xl font-thin">{key[0].toUpperCase() + key.slice(1)}</span>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{value}</span>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
