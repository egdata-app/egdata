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
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/hooks/use-locale";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { getRarity } from "@/lib/get-rarity";
import { cn } from "@/lib/utils";
import {
  offerAchievementsQueryOptions,
  offerOnlyQueryOptions,
  resolveQueryLocale,
} from "@/queries/offer";
import { CardStackIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/{-$locale}/offers/$id/achievements")({
  component: AchievementsPage,

  loader: async ({ params, context }) => {
    const { queryClient, locale, cookies } = context;
    const { id } = params;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);

    if (import.meta.env.SSR) {
      const [offer] = await Promise.all([
        queryClient.ensureQueryData(offerQuery).catch(() => null),
        queryClient.prefetchQuery(offerAchievementsQueryOptions(id)),
      ]);

      return {
        id,
        locale: resolvedLocale,
        offer,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(offerAchievementsQueryOptions(id));

    return {
      id,
      locale: resolvedLocale,
      offer: cachedOffer ?? null,
      isOfferLoaded: cachedOffer !== undefined,
    };
  },

  head: (ctx) => {
    if (!ctx.loaderData) {
      return {
        meta: [],
      };
    }

    const { offer, isOfferLoaded } = ctx.loaderData;

    if (!offer) {
      if (!isOfferLoaded) {
        return {
          meta: [],
        };
      }

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
  const { id } = Route.useParams();
  const { timezone } = useLocale();
  const [search, setSearch] = useState("");
  const [blur, setBlur] = useState(true);
  const { data: achievements, isLoading } = useQuery(offerAchievementsQueryOptions(id));

  const [flipAll, setFlipAll] = useState(false);
  const [flippedStates, setFlippedStates] = useState<{
    [key: string]: boolean;
  }>({});

  // 1. Add a sortBy state.
  //    "default" means do not reorder, just keep hidden achievements at bottom.
  //    "rarity" sorts by ascending rarity (i.e., common -> rare -> epic -> etc.)
  const [sortBy, setSortBy] = useState<"default" | "rarity" | "unlockedPercentage">("default");

  const noOfAchievemenentsPerRarity = useMemo(() => {
    return (achievements ?? [])
      .flatMap((set) => set.achievements ?? [])
      .reduce(
        (acc, achievement) => {
          const rarity = getRarity(achievement.xp);
          acc[rarity] = (acc[rarity] || 0) + 1;
          return acc;
        },
        {} as { [key in keyof typeof rarities]: number },
      );
  }, [achievements]);

  const totalAchievementsCount = useMemo(() => {
    return (achievements ?? []).reduce((sum, set) => sum + (set.achievements?.length ?? 0), 0);
  }, [achievements]);

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
      <section id="offer-achievements" className="flex w-full flex-col">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {t("offerDetail.achievements.title")}
          </h2>
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl border border-white/10 bg-card/80 mb-5" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: This is a fallback component
            <SkeletonCard key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (!achievements) {
    return (
      <section id="offer-achievements" className="flex w-full flex-col">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {t("offerDetail.achievements.title")}
          </h2>
          <span className="shrink-0 rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            0
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-card/80 px-6 py-16 text-center">
          <EpicTrophyIcon className="size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("offerDetail.achievements.noAchievements")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="offer-achievements" className="flex w-full flex-col gap-5">
      <div className="flex w-full flex-col justify-between gap-4 border-b border-border/60 pb-3 md:flex-row md:items-center">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {t("offerDetail.achievements.title")}
          </h2>
          <span className="shrink-0 rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {totalAchievementsCount}
          </span>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-center">
          <Select
            selectedKey={sortBy}
            onSelectionChange={(value) =>
              setSortBy(String(value) as "default" | "rarity" | "unlockedPercentage")
            }
            placeholder={t("offerDetail.achievements.sortBy")}
          >
            <SelectTrigger className="h-9 w-full rounded-lg border border-white/10 bg-card/80 transition-[border-color,background-color] duration-150 hover:border-primary/60 hover:bg-card md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("offerDetail.achievements.sortBy")}</SelectLabel>
                <SelectItem id="default">{t("offerDetail.achievements.defaultSort")}</SelectItem>
                <SelectItem id="rarity">{t("offerDetail.achievements.sortByRarity")}</SelectItem>
                <SelectItem id="unlockedPercentage">
                  {t("offerDetail.achievements.sortByCompleted")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            className="h-9 w-full rounded-lg border border-white/10 bg-card/80 transition-[border-color,background-color] duration-150 hover:border-primary/60 focus-visible:border-primary md:w-56"
            placeholder={t("offerDetail.achievements.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-card/80 px-4 text-center text-foreground transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:bg-card"
            onPress={handleFlipAll}
            isDisabled={achievements.length === 0}
          >
            <CardStackIcon className="w-5 h-5" />
            {t("offerDetail.achievements.flipAll")}
          </Button>
          <Button
            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 bg-card/80 px-3 text-center text-foreground transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:bg-card"
            onPress={() => setBlur(!blur)}
            isDisabled={achievements.length === 0}
          >
            {blur ? <EyeOpenIcon className="w-5 h-5" /> : <EyeClosedIcon className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <Card className="w-full rounded-xl border border-white/10 bg-card/80 text-foreground p-4 sm:p-5">
        <div className="flex flex-wrap flex-row items-center justify-center gap-4 sm:gap-10">
          {Object.entries(noOfAchievemenentsPerRarity).map(([rarity, count]) => (
            <div
              key={rarity}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg p-3 sm:p-4 text-center",
              )}
            >
              <EpicTrophyIcon
                className={cn(
                  "size-6",
                  raritiesTextColors[rarity as keyof typeof raritiesTextColors],
                )}
              />
              <span className="text-xl font-bold tabular-nums">{count}</span>
            </div>
          ))}
          <span className="text-2xl font-bold text-muted-foreground">{"="}</span>
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg p-3 sm:p-4 text-center",
            )}
          >
            <EpicTrophyIcon className={cn("size-8", raritiesTextColors.platinum)} />
            <span className="text-2xl font-bold tabular-nums">
              {
                (achievements ?? [])
                  .filter((set) => set.isBase)
                  .flatMap((set) => set.achievements ?? []).length
              }
            </span>
          </div>
        </div>
      </Card>

      {achievements.map((achievementSet) => (
        <div key={achievementSet.achievementSetId} className="w-full">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 pb-2.5 mb-4 mt-2">
            <div className="flex items-baseline gap-2.5">
              <TooltipTrigger>
                <h3
                  tabIndex={0}
                  className="font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground underline decoration-dotted decoration-border/60 underline-offset-4 cursor-help"
                >
                  {achievementSet.isBase
                    ? t("offerDetail.achievements.baseGame")
                    : t("offerDetail.achievements.dlc")}{" "}
                  {t("offerDetail.achievements.achievementsLabel")}
                </h3>
                <Tooltip>
                  <p>
                    {achievementSet.isBase && t("offerDetail.achievements.baseGameDescription")}
                    {!achievementSet.isBase && t("offerDetail.achievements.dlcDescription")}
                  </p>
                </Tooltip>
              </TooltipTrigger>
              <span className="shrink-0 rounded-full border border-white/10 bg-card/80 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {achievementSet.achievements.length}
              </span>
            </div>
            <div className="flex items-center">
              {achievementSet.lastUpdated && (
                <TooltipTrigger>
                  <span
                    tabIndex={0}
                    className="text-xs sm:text-sm text-muted-foreground tabular-nums underline decoration-dotted decoration-border/60 underline-offset-4 cursor-help"
                  >
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
                  <Tooltip>
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
                  </Tooltip>
                </TooltipTrigger>
              )}
            </div>
          </div>

          {achievementSet.achievements.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {achievementSet.achievements
                // Filter by search
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
          )}
          {achievementSet.achievements.length === 0 && (
            <div className="mt-4 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-card/80 px-6 py-14 text-center">
              <FileWarningIcon className="size-9 text-muted-foreground/75" />
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {t("offerDetail.achievements.noAchievementsSet")}
                <br />
                {t("offerDetail.achievements.noAchievementsSetDescription")}
              </p>
            </div>
          )}
        </div>
      ))}

      {achievements.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-card/80 px-6 py-16 text-center">
          <EpicTrophyIcon className="size-10 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("offerDetail.achievements.noAchievements")}
          </p>
        </div>
      )}
    </section>
  );
}

function SkeletonCard() {
  return (
    <Card className="justify-between flex flex-col h-72 rounded-xl border border-white/10 bg-card/80">
      <CardHeader className="flex flex-col w-full items-center gap-2">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="h-full">
        <Skeleton className="h-16 w-full rounded-lg" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-5 w-20 rounded-full" />
      </CardFooter>
    </Card>
  );
}
