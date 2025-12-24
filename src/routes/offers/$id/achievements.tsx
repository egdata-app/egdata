import {
  FlippableCard,
  type rarities,
  raritiesTextColors,
} from "@/components/app/achievement-card";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/hooks/use-locale";
import { getQueryClient } from "@/lib/client";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getRarity } from "@/lib/get-rarity";
import { httpClient } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import type { AchievementsSets } from "@/queries/offer-achievements";
import type { SingleOffer } from "@/types/single-offer";
import { CardStackIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { dehydrate, type DehydratedState, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeClosedIcon, FileWarningIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";

const rarityOrder: (keyof typeof rarities)[] = ["gold", "silver", "bronze"];

function rarityPriority(rarity: keyof typeof rarities) {
  const idx = rarityOrder.indexOf(rarity);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer;
};

export const Route = createFileRoute("/offers/$id/achievements")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;
    return (
      <HydrationBoundary state={dehydratedState}>
        <AchievementsPage />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ params, context }) => {
    const { queryClient } = context;
    const { id } = params;

    await queryClient.prefetchQuery({
      queryKey: ["offer-achievements", { id }],
      queryFn: () => httpClient.get<AchievementsSets>(`/offers/${id}/achievements`),
    });

    const offer = await queryClient.ensureQueryData({
      queryKey: ["offer", { id: params.id }],
      queryFn: () => httpClient.get<SingleOffer>(`/offers/${params.id}`),
    });

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      offer,
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "offer",
      { id: params.id },
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, "Achievements"),
    };
  },
});

function AchievementsPage() {
  const { id } = Route.useLoaderData() as LoaderData;
  const { timezone } = useLocale();
  const [search, setSearch] = useState("");
  const [blur, setBlur] = useState(true);
  const { data: achievements, isLoading } = useQuery({
    queryKey: ["offer-achievements", { id }],
    queryFn: () => httpClient.get<AchievementsSets>(`/offers/${id}/achievements`),
  });

  const [flipAll, setFlipAll] = useState(false);
  const [flippedStates, setFlippedStates] = useState<{
    [key: string]: boolean;
  }>({});

  // 1. Add a sortBy state.
  //    "default" means do not reorder, just keep hidden achievements at bottom.
  //    "rarity" sorts by ascending rarity (i.e., common -> rare -> epic -> etc.)
  const [sortBy, setSortBy] = useState<"default" | "rarity" | "unlockedPercentage">("default");

  const handleFlipAll = () => {
    setFlipAll(!flipAll);
  };

  const handleCardFlip = (achievementName: string) => {
    setFlippedStates((prev) => ({
      ...prev,
      [achievementName]: !prev[achievementName],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Achievements</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mt-4">
          {Array.from({ length: 10 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: This is a fallback component
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!achievements) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-gray-500">No achievements found</p>
      </div>
    );
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col w-full justify-between items-start gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold">Achievements</h1>
        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as "default" | "rarity")}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort by</SelectLabel>
                <SelectItem value="default">Default Sort</SelectItem>
                <SelectItem value="rarity">Sort by Rarity</SelectItem>
                <SelectItem value="unlockedPercentage">Sort by Completed %</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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

      {achievements.map((achievementSet) => (
        <div key={achievementSet.achievementSetId} className="w-full">
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
                    {achievementSet.isBase && "This list of achievements are for the base game."}
                    {!achievementSet.isBase && "This list of achievements are for one of the DLCs."}
                  </p>
                </TooltipContent>
              </Tooltip>
              <div className="justify-between items-center">
                {achievementSet.lastUpdated && (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-sm underline decoration-dotted decoration-gray-300/50 underline-offset-4">
                        Last Updated:{" "}
                        {DateTime.fromISO(achievementSet.lastUpdated, {
                          zone: timezone,
                        })
                          .setLocale("en-GB")
                          .toLocaleString({
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        This achievement set was last updated on{" "}
                        {DateTime.fromISO(achievementSet.lastUpdated, {
                          zone: timezone,
                        })
                          .setLocale("en-GB")
                          .toLocaleString({
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

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mt-4">
            {achievementSet.achievements
              // Filter by search
              .filter((achievement) => {
                if (search && search.length > 0) {
                  return (
                    achievement.unlockedDisplayName.toLowerCase().includes(search.toLowerCase()) ||
                    achievement.lockedDisplayName.toLowerCase().includes(search.toLowerCase())
                  );
                }
                return true;
              })
              // Sort by either default or by rarity
              .sort((a, b) => {
                if (sortBy === "default") {
                  // 3. Always put hidden achievements at the bottom
                  if (a.hidden && !b.hidden) return 1;
                  if (!a.hidden && b.hidden) return -1;
                }

                // If we're sorting by rarity, compare rarity priorities
                if (sortBy === "rarity") {
                  const rarityA = rarityPriority(getRarity(a.xp));
                  const rarityB = rarityPriority(getRarity(b.xp));
                  return rarityA - rarityB;
                }

                // If we're sorting by unlocked percentage, compare unlocked percentages
                if (sortBy === "unlockedPercentage") {
                  const unlockedPercentageA = (a.completedPercent || 0) / 100;
                  const unlockedPercentageB = (b.completedPercent || 0) / 100;
                  return unlockedPercentageA - unlockedPercentageB;
                }

                // Default sort → do nothing special beyond hidden logic
                return 0;
              })
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
            <div className="w-full flex flex-col items-center justify-center h-96 mt-10 gap-2">
              <FileWarningIcon className="size-10 opacity-75" />
              <p className="text-center font-thin">
                No achievements found for this set.
                <br />
                This could mean that the achievements are not currently available but will be added
                in the future.
              </p>
            </div>
          )}
        </div>
      ))}

      {achievements.length === 0 && (
        <div className="flex justify-center items-center h-96">
          <p className="text-gray-500">No achievements found</p>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="justify-between flex flex-col h-full">
      <CardHeader className="flex flex-col w-full items-center gap-2">
        <Skeleton className="h-16 w-16" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="h-full">
        <Skeleton className="h-16" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-4 w-16" />
      </CardFooter>
    </Card>
  );
}
