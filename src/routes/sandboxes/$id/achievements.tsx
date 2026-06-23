import {
  FlippableCard,
  type rarities,
  raritiesTextColors,
} from "@/components/app/achievement-card";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
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
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeClosedIcon, FileWarningIcon } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/sandboxes/$id/achievements")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
    };
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
      queryFn: () =>
        httpClient.get<AchievementSet[]>(`/sandboxes/${id}/achievements`).catch(() => []),
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

  const noOfAchievemenentsPerRarity = useMemo(() => {
    return (achievements ?? [])
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

  const totalAchievements = useMemo(() => {
    return (achievements ?? []).flatMap((set) => set.achievements).length;
  }, [achievements]);

  const baseAchievements = useMemo(() => {
    return (achievements ?? []).filter((set) => set.isBase).flatMap((set) => set.achievements)
      .length;
  }, [achievements]);

  const totalXp = useMemo(() => {
    return (achievements ?? [])
      .flatMap((set) => set.achievements)
      .reduce((acc, achievement) => acc + achievement.xp, 0);
  }, [achievements]);

  if (!achievements) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <SandboxPageHeader
          icon={EpicTrophyIcon}
          eyebrow="Progression"
          title="Achievements"
          description="Achievement sets, hidden states, rarity distribution, and XP totals attached to this sandbox."
          stats={[
            { label: "Sets", value: "Loading" },
            { label: "Achievements", value: "Loading" },
            { label: "XP", value: "Loading" },
          ]}
        />
        <div className="h-64 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <SandboxPageHeader
        icon={EpicTrophyIcon}
        eyebrow="Progression"
        title="Achievements"
        description="Achievement sets, hidden states, rarity distribution, and XP totals attached to this sandbox."
        stats={[
          { label: "Achievements", value: formatSandboxCount(totalAchievements) },
          { label: "Sets", value: formatSandboxCount(achievements.length) },
          { label: "XP", value: formatSandboxCount(totalXp) },
        ]}
      >
        <Input
          className="h-8 w-full min-w-44 sm:w-64"
          placeholder="Search achievements"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleFlipAll}
          disabled={achievements.length === 0}
        >
          <CardStackIcon className="size-4" />
          <span>Flip all</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setBlur(!blur)}
          disabled={achievements.length === 0}
          aria-label={blur ? "Reveal hidden achievement text" : "Hide hidden achievement text"}
        >
          {blur ? <EyeOpenIcon className="size-4" /> : <EyeClosedIcon className="size-4" />}
        </Button>
      </SandboxPageHeader>
      <div className="flex flex-col gap-4 w-full">
        <Card className="w-full bg-card text-foreground p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {Object.entries(noOfAchievemenentsPerRarity).map(([rarity, count]) => (
              <div
                key={rarity}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-md p-4 text-center",
                )}
              >
                <EpicTrophyIcon
                  className={cn(
                    "size-6",
                    raritiesTextColors[rarity as keyof typeof raritiesTextColors],
                  )}
                />
                <span className="text-xl font-bold">{count}</span>
              </div>
            ))}
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-md p-4 text-center",
              )}
            >
              <EpicTrophyIcon className={cn("size-8", raritiesTextColors.platinum)} />
              <span className="text-2xl font-bold">{baseAchievements}</span>
            </div>
          </div>
        </Card>
        {[...achievements]
          .sort((a, b) => (a.isBase ? -1 : b.isBase ? 1 : 0))
          .map((achievementSet) => (
            <div key={achievementSet.achievementSetId}>
              <TooltipProvider>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Tooltip>
                    <TooltipTrigger>
                      <h4 className="text-xl font-thin underline decoration-dotted decoration-border/60 underline-offset-4">
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
                          <span className="text-sm underline decoration-dotted decoration-border/60 underline-offset-4">
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
              <hr className="w-full my-4 border-border/40" />
            </div>
          ))}
        {achievements.length === 0 && (
          <div className="flex justify-center items-center h-96">
            <p className="text-muted-foreground">No achievements found</p>
          </div>
        )}
      </div>
    </div>
  );
}
