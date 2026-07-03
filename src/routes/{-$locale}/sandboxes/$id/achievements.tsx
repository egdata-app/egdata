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
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/{-$locale}/sandboxes/$id/achievements")({
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
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
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
            title: i18n.t("sandboxes.notFoundTitle"),
            description: i18n.t("sandboxes.notFoundDescription"),
          },
        ],
      };

    return {
      meta: generateSandboxMeta(sandbox, offer, i18n.t("sandboxes.metaAchievementsTitle")),
    };
  },
});

function SandboxAchievementsPage() {
  const { t } = useTranslation();
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
          eyebrow={t("sandboxes.achievementsEyebrow")}
          title={t("sandboxes.achievementsTitle")}
          description={t("sandboxes.achievementsDescription")}
          stats={[
            { label: t("sandboxes.achievementsSetsLabel"), value: "Loading" },
            { label: t("sandboxes.achievementsLabel"), value: "Loading" },
            { label: t("sandboxes.achievementsXpLabel"), value: "Loading" },
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
        eyebrow={t("sandboxes.achievementsEyebrow")}
        title={t("sandboxes.achievementsTitle")}
        description={t("sandboxes.achievementsDescription")}
        stats={[
          { label: t("sandboxes.achievementsLabel"), value: formatSandboxCount(totalAchievements) },
          {
            label: t("sandboxes.achievementsSetsLabel"),
            value: formatSandboxCount(achievements.length),
          },
          { label: t("sandboxes.achievementsXpLabel"), value: formatSandboxCount(totalXp) },
        ]}
      >
        <Input
          className="h-8 w-full min-w-44 sm:w-64"
          placeholder={t("sandboxes.searchAchievementsPlaceholder")}
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
          <span>{t("sandboxes.flipAllButton")}</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setBlur(!blur)}
          disabled={achievements.length === 0}
          aria-label={
            blur
              ? t("sandboxes.revealHiddenAchievementAria")
              : t("sandboxes.hideHiddenAchievementAria")
          }
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
                        {achievementSet.isBase
                          ? t("sandboxes.achievementsBaseGameLabel")
                          : t("sandboxes.achievementsDlcLabel")}{" "}
                        {t("sandboxes.achievementsLabel")}
                      </h4>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {achievementSet.isBase && t("sandboxes.achievementsBaseGameTooltip")}
                        {!achievementSet.isBase && t("sandboxes.achievementsDlcTooltip")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="justify-between items-center">
                    {achievementSet.lastUpdated && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-sm underline decoration-dotted decoration-border/60 underline-offset-4">
                            {t("sandboxes.lastUpdatedLabel")}{" "}
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
                            {t("sandboxes.achievementsLastUpdatedTooltip")}{" "}
                            {new Date(achievementSet.lastUpdated).toLocaleString("en-GB", {
                              timeZone: timezone,
                              timeStyle: "short",
                              dateStyle: "short",
                            })}
                            .
                            <br />
                            {t("sandboxes.achievementsLastUpdatedTooltipExtra")}
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
                    {t("sandboxes.noAchievementsForSet")}
                    <br />
                    {t("sandboxes.noAchievementsForSetExtra")}
                  </p>
                </div>
              )}
              <hr className="w-full my-4 border-border/40" />
            </div>
          ))}
        {achievements.length === 0 && (
          <div className="flex justify-center items-center h-96">
            <p className="text-muted-foreground">{t("sandboxes.noAchievementsFound")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
