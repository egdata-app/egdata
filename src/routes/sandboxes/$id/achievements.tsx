import {
  FlippableCard,
  type rarities,
  raritiesTextColors,
} from "@/components/app/achievement-card";
import { SandboxHeader } from "@/components/app/sandbox-header";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/hooks/use-locale";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getRarity } from "@/lib/get-rarity";
import { httpClient } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import type { AchievementSet } from "@/queries/offer-achievements";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleSandbox } from "@/types/single-sandbox";
import { CardStackIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeClosedIcon, FileWarningIcon } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/sandboxes/$id/achievements")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();
    return (
      <HydrationBoundary state={dehydratedState}>
        <SandboxAchievementsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { id } = params;
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["sandbox", "achievements", { id }],
      queryFn: () => httpClient.get<AchievementSet[]>(`/sandboxes/${id}/achievements`),
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
      meta: generateSandboxMeta(sandbox, offer, "Achievements"),
    };
  },
});

function SandboxAchievementsPage() {
  const { id } = Route.useParams();
  const { timezone } = useLocale();
  const [search, setSearch] = useState("");
  const [blur, setBlur] = useState(true);
  const [flipAll, setFlipAll] = useState(false);
  const [flippedStates, setFlippedStates] = useState<{
    [key: string]: boolean;
  }>({});

  const handleFlipAll = () => {
    setFlipAll(!flipAll);
  };

  const handleCardFlip = (achievementName: string) => {
    setFlippedStates((prev) => ({
      ...prev,
      [achievementName]: !prev[achievementName],
    }));
  };
  const { data: achievements } = useQuery({
    queryKey: ["sandbox", "achievements", { id }],
    queryFn: () => httpClient.get<AchievementSet[]>(`/sandboxes/${id}/achievements`),
  });
  const { data: offer } = useQuery({
    queryKey: ["sandbox", "base-game", { id }],
    queryFn: () => httpClient.get<SingleOffer>(`/sandboxes/${id}/base-game`),
    retry: false,
  });
  const { data: sandbox } = useQuery({
    queryKey: ["sandbox", { id }],
    queryFn: () => httpClient.get<SingleSandbox>(`/sandboxes/${id}`),
  });

  if (!achievements) {
    return null;
  }

  const noOfAchievemenentsPerRarity = useMemo(() => {
    return achievements
      .flatMap((set) => set.achievements)
      .reduce(
        (acc, achievement) => {
          const rarity = getRarity(achievement.xp);
          acc[rarity] = (acc[rarity] || 0) + 1;
          return acc;
        },
        {} as { [key in keyof typeof rarities]: number },
      );
  }, [achievements]);

  return (
    <main className="flex flex-col items-start justify-start h-full gap-4 px-4 w-full">
      <SandboxHeader
        title={offer?.title ?? sandbox?.displayName ?? (sandbox?.name as string)}
        section="achievements"
        id={id}
        sandbox={id}
      />
      <div className="flex flex-col gap-4 w-full">
        <div className="inline-flex w-full justify-between items-center">
          <h1 className="text-2xl font-bold">Achievements</h1>
          <div className="flex gap-2">
            <Input
              className="w-full"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              className="hover:bg-transparent border border-gray-800 bg-gray-800 inline-flex px-4 py-2 rounded-md text-center transition-all duration-300 ease-in-out text-white"
              onClick={handleFlipAll}
              disabled={achievements.length === 0}
            >
              <CardStackIcon className="w-6 h-6 mr-2" />
              Flip All
            </Button>
            <Button
              className="hover:bg-transparent border border-gray-800 bg-gray-800 inline-flex px-4 py-2 rounded-md text-center transition-all duration-300 ease-in-out text-white"
              onClick={() => setBlur(!blur)}
              disabled={achievements.length === 0}
            >
              {blur ? <EyeOpenIcon className="w-6 h-6" /> : <EyeClosedIcon className="w-6 h-6" />}
            </Button>
          </div>
        </div>
        <Card className="w-full bg-card text-white p-4">
          <div className="flex flex-row items-center justify-center gap-10">
            {Object.entries(noOfAchievemenentsPerRarity).map(([rarity, count]) => (
              <div
                key={rarity}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-md p-4 text-center",
                )}
              >
                <EpicTrophyIcon className={cn("size-6", raritiesTextColors[rarity])} />
                <span className="text-xl font-bold">{count}</span>
              </div>
            ))}
            <span className="text-2xl font-bold">{"="}</span>
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-md p-4 text-center",
              )}
            >
              <EpicTrophyIcon className={cn("size-8", raritiesTextColors.platinum)} />
              <span className="text-2xl font-bold">
                {achievements.filter((set) => set.isBase).flatMap((set) => set.achievements).length}
              </span>
            </div>
          </div>
        </Card>
        {achievements
          .sort((a, b) => (a.isBase ? -1 : b.isBase ? 1 : 0))
          .map((achievementSet) => (
            <div key={achievementSet.achievementSetId}>
              <TooltipProvider>
                <div className="w-full justify-between items-center flex flex-row">
                  <Tooltip>
                    <TooltipTrigger>
                      <h4 className="text-xl font-thin underline decoration-dotted decoration-gray-300/50 underline-offset-4">
                        {achievementSet.isBase ? "Base Game" : "DLC"} Achievements
                      </h4>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {achievementSet.isBase &&
                          "This list of achievements are for the base game."}
                        {!achievementSet.isBase &&
                          "This list of achievements are for one of the DLCs."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="justify-between items-center">
                    {achievementSet.lastUpdated && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-sm underline decoration-dotted decoration-gray-300/50 underline-offset-4">
                            Last Updated:{" "}
                            {new Date(achievementSet.lastUpdated).toLocaleString("en-GB", {
                              timeZone: timezone,
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            This achievement set was last updated on{" "}
                            {new Date(achievementSet.lastUpdated).toLocaleString("en-GB", {
                              timeZone: timezone,
                              timeStyle: "short",
                              dateStyle: "short",
                            })}
                            .
                            <br />
                            This is either it's date of creation or the date of the last update.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </TooltipProvider>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 mt-4">
                {achievementSet.achievements
                  .filter((achievement) => {
                    if (search && search.length > 0) {
                      return (
                        achievement.unlockedDisplayName
                          .toLowerCase()
                          .includes(search.toLowerCase()) ||
                        achievement.lockedDisplayName.toLowerCase().includes(search.toLowerCase())
                      );
                    }

                    return true;
                  })
                  // Place hidden achievements at the bottom
                  .sort((a, b) => (a.hidden ? 1 : b.hidden ? -1 : 0))
                  .map((achievement, index) => (
                    <FlippableCard
                      key={achievement.name}
                      achievement={achievement}
                      flipAll={flipAll}
                      index={index}
                      flipped={flippedStates[achievement.name] || false}
                      onCardFlip={handleCardFlip}
                      blur={blur}
                    />
                  ))}
              </div>
              {achievementSet.achievements.length === 0 && (
                <div className="w-full flex flex-col items-center justify-center h-52 mt-10 gap-2">
                  <FileWarningIcon className="size-10 opacity-75" />
                  <p className="text-center font-thin">
                    No achievements found for this set.
                    <br />
                    This could mean that the achievements are not currently available but will be
                    added in the future.
                  </p>
                </div>
              )}
              <hr className="w-full my-4 border-gray-300/40" />
            </div>
          ))}
        {achievements.length === 0 && (
          <div className="flex justify-center items-center h-96">
            <p className="text-gray-500">No achievements found</p>
          </div>
        )}
      </div>
    </main>
  );
}
