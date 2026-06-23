import { SandboxShell } from "@/components/app/sandbox-shell";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { sandboxBaseGameQueryOptions, sandboxQueryOptions } from "@/queries/sandbox";
import { sandboxHubQueryOptions } from "@/queries/sandbox-hub";
import type { SingleItem } from "@/types/single-item";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sandboxes/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxShell id={Route.useParams().id} />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const { id } = params;

    return {
      id,
      dehydratedState: dehydrate(queryClient),
    };
  },

  // @ts-expect-error - loader return type
  beforeLoad: async ({ context, params }) => {
    const { id } = params;
    const { country, queryClient } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery(sandboxQueryOptions(id)),
      queryClient.prefetchQuery(sandboxBaseGameQueryOptions(id)),
      queryClient.prefetchQuery(
        sandboxHubQueryOptions({
          id,
          country: country || "US",
          offerLimit: 8,
          updateLimit: 8,
        }),
      ),
    ]);

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

    let offer = getFetchedQuery<SingleOffer | (SingleItem & { isItem: true })>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      ["sandbox", "base-game", { id }],
    );

    if (id === "ue") {
      if (offer) {
        offer = {
          ...offer,
          title: "Unreal Engine",
        };
      }
    }

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
      meta: generateSandboxMeta(sandbox, offer),
    };
  },
});
