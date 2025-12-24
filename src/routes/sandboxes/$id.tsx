import { httpClient } from "@/lib/http-client";
import type { SingleSandbox } from "@/types/single-sandbox";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { SectionsNav } from "@/components/app/offer-sections";
import {
  Archive,
  BoxIcon,
  CalculatorIcon,
  LibrarySquareIcon,
  PackageIcon,
  StoreIcon,
} from "lucide-react";
import type { SingleOffer } from "@/types/single-offer";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getQueryClient } from "@/lib/client";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import type { SingleItem } from "@/types/single-item";

export const Route = createFileRoute("/sandboxes/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxPage />
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

  beforeLoad: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["sandbox", { id }],
        queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${id}`),
      }),
      queryClient.prefetchQuery({
        queryKey: ["sandbox", "base-game", { id }],
        queryFn: () =>
          httpClient.get<SingleOffer | (SingleItem & { isItem: true })>(
            `/sandboxes/${id}/base-game`,
          ),
      }),
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

function SandboxPage() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  const subPath = useLocation().pathname.split(`/${id}/`)[1];
  const { data: sandbox } = useQuery({
    queryKey: ["sandbox", { id }],
    queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${id}`),
    retry: false,
  });

  if (!sandbox) {
    return null;
  }

  return (
    <div className="flex flex-row items-start justify-start h-full gap-4 px-4 w-full min-h-[75vh]">
      <aside className="mt-12">
        <SectionsNav
          links={[
            {
              id: "",
              label: (
                <span className="inline-flex items-center gap-2">
                  <BoxIcon className="size-4" />
                  <span>Sandbox</span>
                </span>
              ),
              href: `/sandboxes/${id}`,
            },
            {
              id: "items",
              label: (
                <span className="inline-flex items-center gap-2">
                  <LibrarySquareIcon className="size-4" />
                  <span>Items</span>
                </span>
              ),
              href: `/sandboxes/${id}/items`,
            },
            {
              id: "offers",
              label: (
                <span className="inline-flex items-center gap-2">
                  <StoreIcon className="size-4" />
                  <span>Offers</span>
                </span>
              ),
              href: `/sandboxes/${id}/offers`,
            },
            {
              id: "assets",
              label: (
                <span className="inline-flex items-center gap-2">
                  <Archive className="size-4" />
                  <span>Assets</span>
                </span>
              ),
              href: `/sandboxes/${id}/assets`,
            },
            {
              id: "builds",
              label: (
                <span className="inline-flex items-center gap-2">
                  <PackageIcon className="size-4" />
                  <span>Builds</span>
                </span>
              ),
              href: `/sandboxes/${id}/builds`,
            },
            {
              id: "achievements",
              label: (
                <span className="inline-flex items-center gap-2">
                  <EpicTrophyIcon className="size-4" />
                  <span>Achievements</span>
                </span>
              ),
              href: `/sandboxes/${id}/achievements`,
            },
            {
              id: "changelog",
              label: (
                <span className="inline-flex items-center gap-2">
                  <CalculatorIcon className="size-4" />
                  <span>Changelog</span>
                </span>
              ),
              href: `/sandboxes/${id}/changelog`,
            },
          ]}
          activeSection={subPath ?? ""}
          onSectionChange={(location) => {
            navigate({
              to: `/sandboxes/${id}/${location}`,
              replace: false,
              resetScroll: false,
            });
          }}
          orientation="vertical"
        />
      </aside>
      <Outlet />
    </div>
  );
}
