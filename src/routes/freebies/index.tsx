import { EGSIcon } from "@/components/icons/egs";
import { GiveawaysCarousel } from "@/components/modules/giveaways";
import { MobileFreebiesCarousel } from "@/components/modules/mobile-freebies";
import { SearchContainer } from "@/components/search/SearchContainer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { httpClient } from "@/lib/http-client";
import type { GiveawayOffer } from "@/types/giveaways";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { mobileFreebiesQuery } from "@/queries/mobile-freebies";
import { formSchema } from "@/stores/searchStore";
import { getGiveawaysStats, GiveawaysStats } from "@/components/modules/giveaway-stats";
import { mergeFreebies } from "@/utils/merge-freebies";

export const Route = createFileRoute("/freebies/")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();
    return (
      <HydrationBoundary state={dehydratedState}>
        <FreeGames />
      </HydrationBoundary>
    );
  },

  validateSearch: (search) => formSchema.parse(search),

  beforeLoad: async () => {},

  loader: async ({ context }) => {
    const { country, queryClient } = context;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["giveaways-stats", { country }],
        queryFn: () => getGiveawaysStats({ country }),
      }),
      queryClient.prefetchQuery({
        queryKey: ["giveaways"],
        queryFn: () =>
          httpClient
            .get<GiveawayOffer[]>("/free-games", {
              params: {
                country,
              },
            })
            .then(mergeFreebies),
      }),
      queryClient.prefetchQuery(mobileFreebiesQuery),
    ]);

    const ogId = await httpClient.get<{ id: string }>("/free-games/og");

    return {
      dehydratedState: dehydrate(queryClient),
      og: ogId.id,
    };
  },

  head: (ctx) => {
    const { loaderData } = ctx;

    const ogImage =
      "https://cdn.egdata.app/cdn-cgi/imagedelivery/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>"
        .replace("<ACCOUNT_HASH>", "RlN2EBAhhGSZh5aeUaPz3Q")
        .replace("<IMAGE_ID>", String(loaderData?.og ?? ""))
        .replace("<VARIANT_NAME>", "og");

    return {
      meta: [
        {
          title: "Free Games | egdata.app",
        },
        {
          name: "description",
          content: "Browse free games from the Epic Games Store.",
        },
        {
          name: "og:title",
          content: "Free Games | egdata.app",
        },
        {
          name: "og:description",
          content: "Browse free games from the Epic Games Store.",
        },
        {
          property: "twitter:title",
          content: "Free Games | egdata.app",
        },
        {
          property: "twitter:description",
          content: "Browse free games from the Epic Games Store.",
        },
        {
          property: "og:image",
          content: ogImage,
        },
        {
          property: "og:image:alt",
          content: "Free Games | egdata.app",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "twitter:card",
          content: "summary_large_image",
        },
        {
          property: "twitter:image",
          content: ogImage,
        },
      ],
    };
  },
});

function FreeGames() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="flex flex-col items-start justify-start h-full gap-4 p-4">
      <GiveawaysStats />
      <div className="flex flex-row justify-between items-center gap-4 w-full">
        <h2 className="text-xl font-semibold mb-4">Current Free Games</h2>
        <Button
          className="bg-black text-white hover:bg-card border inline-flex items-center gap-2 w-fit"
          onClick={() => {
            // TODO: Implement redeem functionality for current free games
            console.log("Redeem current free games");
          }}
        >
          <EGSIcon className="w-5 h-5" />
          <span>Redeem Now</span>
        </Button>
      </div>
      <GiveawaysCarousel hideTitle={true} />
      <Separator orientation="horizontal" className="my-4" />
      <MobileFreebiesCarousel />
      <Separator orientation="horizontal" className="my-4" />
      <SearchContainer
        contextId="freebies"
        initialSearch={search}
        fixedParams={{ pastGiveaways: true, sortBy: "giveawayDate" }}
        onSearchChange={(s) => {
          navigate({
            search: s,
            resetScroll: false,
          });
        }}
        title="Past Free Games"
        controls={{
          showPastGiveaways: false,
        }}
      />
    </div>
  );
}
