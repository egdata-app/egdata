import { SandboxQueryState } from "@/components/app/sandbox-catalog";
import {
  FlippableCard,
  type rarities,
  raritiesTextColors,
} from "@/components/app/achievement-card";
import { formatSandboxCount, SandboxPageHeader } from "@/components/app/sandbox-layout";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocale } from "@/hooks/use-locale";
import { getQueryClient } from "@/lib/client";
import { generateSandboxMeta } from "@/lib/generate-sandbox-meta";
import {
  sandboxBaseGameQueryOptions,
  sandboxQueryOptions,
  type SandboxBaseGame,
  type SandboxIdentity,
} from "@/queries/sandbox";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getRarity } from "@/lib/get-rarity";
import { httpClient } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import type { AchievementSet } from "@/queries/offer-achievements";
import { CardStackIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeClosedIcon, FileWarningIcon, RefreshCw } from "lucide-react";
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
    const { country, queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["sandbox", "achievements", { id }],
      queryFn: () => httpClient.v1Get<AchievementSet[]>(`/sandboxes/${id}/achievements`),
    });

    return {
      id,
      country,
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
    const offer = getFetchedQuery<SandboxBaseGame>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      sandboxBaseGameQueryOptions(id, ctx.loaderData?.country).queryKey,
    );

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

  const {
    data: achievements,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["sandbox", "achievements", { id }],
    queryFn: () => httpClient.v1Get<AchievementSet[]>(`/sandboxes/${id}/achievements`),
  });

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

  const totalAchievements = useMemo(() => {
    return (achievements ?? []).flatMap((set) => set.achievements ?? []).length;
  }, [achievements]);

  const baseAchievements = useMemo(() => {
    return (achievements ?? []).filter((set) => set.isBase).flatMap((set) => set.achievements ?? [])
      .length;
  }, [achievements]);

  const totalXp = useMemo(() => {
    return (achievements ?? [])
      .flatMap((set) => set.achievements ?? [])
      .reduce((acc, achievement) => acc + achievement.xp, 0);
  }, [achievements]);

  if (isError) return <SandboxQueryState error retry={() => void refetch()} />;

  if (isPending || !achievements) {
    return (
      <div className="flex w-full flex-col gap-6">
        <SandboxPageHeader
          icon={EpicTrophyIcon}
          eyebrow={t("sandboxes.achievementsEyebrow")}
          title={t("sandboxes.achievementsTitle")}
          description={t("sandboxes.achievementsDescription")}
          stats={[
            { label: t("sandboxes.achievementsLabel"), value: "—" },
            { label: t("sandboxes.achievementsSetsLabel"), value: "—" },
            { label: t("sandboxes.achievementsXpLabel"), value: "—" },
          ]}
        />
        <Skeleton className="h-24 w-full rounded-xl border border-white/10 bg-card/80" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton fallback cards
            <AchievementSkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
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
          className="h-9 w-full min-w-44 rounded-lg border border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60 focus-visible:border-primary sm:w-56"
          aria-label={t("sandboxes.searchAchievementsPlaceholder")}
          placeholder={t("sandboxes.searchAchievementsPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-lg border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60 hover:bg-card"
          onPress={handleFlipAll}
          isDisabled={achievements.length === 0}
        >
          <CardStackIcon className="size-4" />
          <span>{t("sandboxes.flipAllButton")}</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-9 rounded-lg border-white/10 bg-card/80 transition-colors duration-150 hover:border-primary/60 hover:bg-card"
          onPress={() => setBlur(!blur)}
          isDisabled={achievements.length === 0}
          aria-label={
            blur
              ? t("sandboxes.revealHiddenAchievementAria")
              : t("sandboxes.hideHiddenAchievementAria")
          }
        >
          {blur ? <EyeOpenIcon className="size-4" /> : <EyeClosedIcon className="size-4" />}
        </Button>
      </SandboxPageHeader>

      {isFetching && (
        <p role="status" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3 animate-spin" />
          {t("sandboxCatalog.refreshing")}
        </p>
      )}

      {!totalAchievements && <SandboxQueryState empty />}

      {search &&
        !achievements.some((set) =>
          set.achievements.some(
            (achievement) =>
              (achievement.unlockedDisplayName || "")
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              (achievement.lockedDisplayName || "").toLowerCase().includes(search.toLowerCase()),
          ),
        ) && <SandboxQueryState reset={() => setSearch("")} />}

      <div className="flex w-full flex-col gap-8">
        {totalAchievements > 0 && (
          <Card className="w-full rounded-xl border border-white/10 bg-card/80 p-4 text-foreground sm:p-5">
            <div className="flex flex-wrap flex-row items-center justify-center gap-4 sm:gap-10">
              {Object.entries(noOfAchievemenentsPerRarity).map(([rarity, count]) => (
                <div
                  key={rarity}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-center sm:p-4"
                >
                  <EpicTrophyIcon
                    className={cn(
                      "size-6",
                      raritiesTextColors[rarity as keyof typeof raritiesTextColors],
                    )}
                  />
                  <span className="font-display text-xl font-bold tabular-nums">{count}</span>
                </div>
              ))}
              <span className="text-2xl font-bold text-muted-foreground">{"="}</span>
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg p-3 text-center sm:p-4">
                <EpicTrophyIcon className={cn("size-8", raritiesTextColors.platinum)} />
                <span className="font-display text-2xl font-bold tabular-nums">
                  {baseAchievements}
                </span>
              </div>
            </div>
          </Card>
        )}

        {[...achievements]
          .sort((a, b) => (a.isBase ? -1 : b.isBase ? 1 : 0))
          .map((achievementSet) => (
            <section key={achievementSet.achievementSetId} className="w-full">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 pb-2.5">
                <div className="flex items-baseline gap-2.5">
                  <TooltipTrigger>
                    <h3
                      tabIndex={0}
                      className="cursor-help font-display text-lg font-semibold tracking-tight text-foreground underline decoration-dotted decoration-border/60 underline-offset-4 sm:text-xl"
                    >
                      {achievementSet.isBase
                        ? t("sandboxes.achievementsBaseGameLabel")
                        : t("sandboxes.achievementsDlcLabel")}{" "}
                      {t("sandboxes.achievementsLabel")}
                    </h3>
                    <Tooltip>
                      <p>
                        {achievementSet.isBase && t("sandboxes.achievementsBaseGameTooltip")}
                        {!achievementSet.isBase && t("sandboxes.achievementsDlcTooltip")}
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
                        className="cursor-help text-xs tabular-nums text-muted-foreground underline decoration-dotted decoration-border/60 underline-offset-4 sm:text-sm"
                      >
                        {t("sandboxes.lastUpdatedLabel")}{" "}
                        {new Date(achievementSet.lastUpdated).toLocaleString("en-GB", {
                          timeZone: timezone,
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      <Tooltip>
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
                      </Tooltip>
                    </TooltipTrigger>
                  )}
                </div>
              </div>

              {achievementSet.achievements.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
              ) : (
                <div className="mt-4 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-card/60 px-6 py-14 text-center">
                  <FileWarningIcon className="size-9 text-muted-foreground/75" />
                  <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                    {t("sandboxes.noAchievementsForSet")}
                    <br />
                    {t("sandboxes.noAchievementsForSetExtra")}
                  </p>
                </div>
              )}
            </section>
          ))}
      </div>
    </div>
  );
}

function AchievementSkeletonCard() {
  return (
    <Card className="flex h-72 flex-col justify-between rounded-xl border border-white/10 bg-card/80">
      <CardHeader className="flex w-full flex-col items-center gap-2">
        <Skeleton className="size-16 rounded-lg" />
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
