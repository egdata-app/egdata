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
import { offerOnlyQueryOptions } from "@/queries/offer-gql";
import type { SingleOffer } from "@/types/single-offer";
import { CardStackIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeClosedIcon, FileWarningIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

const rarityOrder: (keyof typeof rarities)[] = ["gold", "silver", "bronze"];

function rarityPriority(rarity: keyof typeof rarities) {
  const idx = rarityOrder.indexOf(rarity);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer | null;
  locale: string | undefined;
};

export const Route = createFileRoute("/{-$locale}/offers/$id/achievements")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;
    return (
      <HydrationBoundary state={dehydratedState}>
        <AchievementsPage />
      </HydrationBoundary>
    );
  },

  loader: async ({ params, context }) => {
    const { queryClient, locale } = context;
    const { id } = params;

    await queryClient.prefetchQuery({
      queryKey: ["offer-achievements", { id }],
      queryFn: () => httpClient.get<AchievementsSets>(`/offers/${id}/achievements`).catch(() => []),
    });

    const offer = await queryClient.ensureQueryData(offerOnlyQueryOptions(params.id, locale));

    return {
      id,
      locale,
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
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      ...offerOnlyQueryOptions(params.id, ctx.loaderData?.locale).queryKey,
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
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
  const { t } = useTranslation();
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
          <h1 className="text-2xl font-bold">{t("offerDetail.achievements.title")}</h1>
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
        <p className="text-muted-foreground">{t("offerDetail.achievements.noAchievements")}</p>
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
        <h1 className="text-2xl font-bold">{t("offerDetail.achievements.title")}</h1>
        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as "default" | "rarity")}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("offerDetail.achievements.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("offerDetail.achievements.sortBy")}</SelectLabel>
                <SelectItem value="default">{t("offerDetail.achievements.defaultSort")}</SelectItem>
                <SelectItem value="rarity">{t("offerDetail.achievements.sortByRarity")}</SelectItem>
                <SelectItem value="unlockedPercentage">
                  {t("offerDetail.achievements.sortByCompleted")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            className="w-full"
            placeholder={t("offerDetail.achievements.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            className="hover:bg-transparent border border-border/60 bg-muted inline-flex px-4 py-2 rounded-md text-center transition-all duration-300 ease-in-out text-foreground"
            onClick={handleFlipAll}
            disabled={achievements.length === 0}
          >
            <CardStackIcon className="w-6 h-6 mr-2" />
            {t("offerDetail.achievements.flipAll")}
          </Button>
          <Button
            className="hover:bg-transparent border border-border/60 bg-muted inline-flex px-4 py-2 rounded-md text-center transition-all duration-300 ease-in-out text-foreground"
            onClick={() => setBlur(!blur)}
            disabled={achievements.length === 0}
          >
            {blur ? <EyeOpenIcon className="w-6 h-6" /> : <EyeClosedIcon className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      <Card className="w-full bg-card text-foreground p-4">
        <div className="flex flex-row items-center justify-center gap-10">
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
                  <h4 className="text-xl font-thin underline decoration-dotted decoration-border/60 underline-offset-4">
                    {achievementSet.isBase
                      ? t("offerDetail.achievements.baseGame")
                      : t("offerDetail.achievements.dlc")}{" "}
                    {t("offerDetail.achievements.achievementsLabel")}
                  </h4>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {achievementSet.isBase && t("offerDetail.achievements.baseGameDescription")}
                    {!achievementSet.isBase && t("offerDetail.achievements.dlcDescription")}
                  </p>
                </TooltipContent>
              </Tooltip>
              <div className="justify-between items-center">
                {achievementSet.lastUpdated && (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-sm underline decoration-dotted decoration-border/60 underline-offset-4">
                        {t("offerDetail.achievements.lastUpdated")}{" "}
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
                        {t("offerDetail.achievements.lastUpdatedTooltip", {
                          date: DateTime.fromISO(achievementSet.lastUpdated, {
                            zone: timezone,
                          })
                            .setLocale("en-GB")
                            .toLocaleString({
                              timeStyle: "short",
                              dateStyle: "short",
                            }),
                        })}
                        <br />
                        {t("offerDetail.achievements.lastUpdatedTooltipDescription")}
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
                {t("offerDetail.achievements.noAchievementsSet")}
                <br />
                {t("offerDetail.achievements.noAchievementsSetDescription")}
              </p>
            </div>
          )}
        </div>
      ))}

      {achievements.length === 0 && (
        <div className="flex justify-center items-center h-96">
          <p className="text-muted-foreground">{t("offerDetail.achievements.noAchievements")}</p>
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
