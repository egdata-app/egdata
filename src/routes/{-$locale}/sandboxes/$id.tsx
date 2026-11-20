import { SandboxShell } from "@/components/app/sandbox-shell";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import i18n from "@/lib/i18n";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import {
  sandboxBaseGameQueryOptions,
  sandboxQueryOptions,
  type SandboxBaseGame,
  type SandboxIdentity,
} from "@/queries/sandbox";
import { sandboxHubQueryOptions } from "@/queries/sandbox-hub";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/{-$locale}/sandboxes/$id")({
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
    const { country, queryClient } = context;
    const { id } = params;

    return {
      id,
      country,
      dehydratedState: dehydrate(queryClient),
    };
  },

  // @ts-expect-error - loader return type
  beforeLoad: async ({ context, params }) => {
    const { id } = params;
    const { country, queryClient } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery(sandboxQueryOptions(id)),
      queryClient.prefetchQuery(sandboxBaseGameQueryOptions(id, country)),
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
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
          },
        ],
      };
    }

    const { id } = params;

    const sandbox = getFetchedQuery<SandboxIdentity>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      sandboxQueryOptions(id).queryKey,
    );

    let offer = getFetchedQuery<SandboxBaseGame>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      sandboxBaseGameQueryOptions(id, ctx.loaderData.country).queryKey,
    );

    if (id === "ue") {
      if (offer) {
        offer = {
          ...offer,
          title: i18n.t("sandboxes.unrealEngineTitle"),
        };
      }
    }

    if (!sandbox)
      return {
        meta: [
          {
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
          },
        ],
      };

    return {
      meta: generateSandboxMeta(sandbox, offer),
    };
  },
});
