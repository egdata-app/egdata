import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  useQuery,
} from "@tanstack/react-query";
import { ArrowRight, RefreshCwIcon, SparklesIcon, TrophyIcon } from "lucide-react";
import { FlippableCard } from "@/components/app/achievement-card";
import { Image } from "@/components/app/image";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { getImage } from "@/lib/get-image";
import { cn } from "@/lib/utils";
import { EpicPlatinumIcon } from "@/routes/{-$locale}/profile/$id";
import { useTranslation } from "@/lib/paraglide-react";

interface Root {
  playerAchievements: PlayerAchievement[];
  sandboxAchievements: SandboxAchievement[];
}

interface PlayerAchievement {
  _id: string;
  epicAccountId: string;
  sandboxId: string;
  totalXP: number;
  totalUnlocked: number;
  achievementSets: AchievementSet[];
  playerAwards: unknown[];
  playerAchievements: PlayerAchievement2[];
}

interface AchievementSet {
  achievementSetId: string;
  isBase: boolean;
  totalUnlocked: number;
  totalXP: number;
}

interface PlayerAchievement2 {
  playerAchievement: PlayerAchievement3;
}

interface PlayerAchievement3 {
  achievementName: string;
  epicAccountId: string;
  progress: number;
  sandboxId: string;
  unlocked: boolean;
  unlockDate: string;
  XP: number;
  achievementSetId: string;
  isBase: boolean;
}

interface SandboxAchievement {
  _id: string;
  productId: string;
  sandboxId: string;
  achievementSetId: string;
  isBase: boolean;
  numProgressed: number;
  numCompleted: number;
  achievements: Achievement[];
  __v: number;
}

interface Achievement {
  deploymentId: string;
  name: string;
  flavorText: string;
  hidden: boolean;
  unlockedDisplayName: string;
  unlockedDescription: string;
  unlockedIconId: string;
  unlockedIconLink: string;
  lockedDisplayName: string;
  lockedDescription: string;
  lockedIconId: string;
  lockedIconLink: string;
  xp: number;
  completedPercent: number;
}

export const Route = createFileRoute("/{-$locale}/profile/$id/achievements/$sandbox")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      sandbox: string;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <RouteComponent />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { queryClient } = context;

    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ["player-sandbox-achievements", { id: params.id, sandbox: params.sandbox }],
        queryFn: () =>
          httpClient
            .v1Get<Root>(`/profiles/${params.id}/achievements/${params.sandbox}`)
            .catch(() => null),
      }),
      queryClient.prefetchQuery({
        queryKey: ["sandbox:base", { id: params.sandbox, country: "US" }],
        queryFn: () =>
          httpClient
            .v1Get<SingleOffer>(`/sandboxes/${params.sandbox}/base-game`, {
              params: {
                country: "US",
              },
            })
            .catch(() => null),
      }),
    ]);

    return {
      id: params.id,
      sandbox: params.sandbox,
      dehydratedState: dehydrate(queryClient),
    };
  },
});

interface PlayerAchievementStatus extends Achievement {
  unlocked: boolean;
  unlockDate: string;
}

function RouteComponent() {
  const { t } = useTranslation();
  const { id, sandbox } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    sandbox: string;
  };
  const [flipAll, setFlipAll] = React.useState(false);
  const [flippedOverrides, setFlippedOverrides] = React.useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["player-sandbox-achievements", { id, sandbox }],
    queryFn: () => httpClient.v1Get<Root>(`/profiles/${id}/achievements/${sandbox}`),
  });
  const { data: offer } = useQuery({
    queryKey: ["sandbox:base", { id: sandbox, country: "US" }],
    queryFn: () =>
      httpClient.v1Get<SingleOffer>(`/sandboxes/${sandbox}/base-game`, {
        params: {
          country: "US",
        },
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-xl border border-white/10 bg-card/80 p-6">
          <span className="sr-only">{t("profile.achievements.loading")}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <div key={index} className="h-72 animate-pulse rounded-xl bg-card/80" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-white/10 bg-card/80 p-8 text-center">
        <TrophyIcon className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 font-display text-xl font-semibold">
          {t("profile.achievements.notFound")}
        </p>
        <Link
          to="/{-$locale}/profile/$id"
          params={{ id }}
          search={{}}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary transition-colors duration-150 hover:underline"
        >
          <ArrowRight className="size-4 rotate-180" />
          {t("profile.achievements.myAchievements")}
        </Link>
      </div>
    );
  }

  const sandboxAchievements = (data.sandboxAchievements ?? [])
    .flatMap((achievementSet) => achievementSet.achievements ?? [])
    .flat();

  const playerAchievements = (data.playerAchievements ?? [])
    .flatMap((playerAchievement) => playerAchievement.playerAchievements ?? [])
    .flat();

  const targetSandboxId = data.playerAchievements[0]?.sandboxId;

  // Merge achievements, we know if its unlocked from the playerAchievements, while the sandboxAchievements has the data
  const achievements: PlayerAchievementStatus[] = sandboxAchievements.map((achievement) => {
    // Find the corresponding player achievement by matching both sandboxId and achievementName
    const playerAchievement = playerAchievements.find(
      ({ playerAchievement }) =>
        playerAchievement.achievementName === achievement.name &&
        playerAchievement.sandboxId === targetSandboxId,
    );

    return {
      ...achievement,
      unlocked: !!playerAchievement?.playerAchievement.unlocked,
      unlockDate: playerAchievement?.playerAchievement.unlockDate || "",
    };
  });

  const sortedAchievements = [...achievements].sort((a, b) =>
    a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1,
  );

  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const totalCount = achievements.length;
  const completionPercent = totalCount > 0 ? Math.min(100, (unlockedCount / totalCount) * 100) : 0;
  const earnedXP = data.playerAchievements[0]?.totalXP ?? 0;
  const hasPlatinum = (data.playerAchievements[0]?.playerAwards?.length ?? 0) > 0;
  const coverUrl =
    getImage(offer?.keyImages ?? [], [
      "DieselGameBoxWide",
      "OfferImageWide",
      "DieselStoreFrontWide",
      "TakeoverWide",
      "DieselGameBox",
      "Thumbnail",
    ])?.url ?? null;

  const handleCardFlip = (name: string) => {
    setFlippedOverrides((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleFlipAll = () => {
    setFlipAll((prev) => !prev);
    setFlippedOverrides({});
  };

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-card/80 p-5 sm:p-6">
        {coverUrl && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover opacity-20"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/70" />
          </div>
        )}

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {coverUrl && (
              <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-white/10 bg-background/60 sm:w-44">
                <Image
                  src={coverUrl}
                  alt={offer?.title ?? sandbox}
                  width={352}
                  height={198}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 space-y-2">
              <Link
                to="/{-$locale}/profile/$id"
                params={{ id }}
                search={{}}
                className="group inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-primary"
              >
                <ArrowRight className="size-4 rotate-180 transition-transform duration-150 group-hover:-translate-x-0.5" />
                {t("profile.achievements.myAchievements")}
              </Link>
              <div className="flex flex-wrap items-center gap-2.5">
                {offer?.title && (
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {offer.title}
                  </h2>
                )}
                {hasPlatinum && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-platinum-start/40 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground">
                    <EpicPlatinumIcon className="size-3.5 text-[#8a7cff]" />
                    {t("profile.showcase.platinum")}
                  </span>
                )}
              </div>
              {offer?.seller?.name && (
                <p className="text-sm text-muted-foreground">{offer.seller.name}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-white/10 bg-background/75 p-4 sm:min-w-64">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium text-muted-foreground">
                {t("profile.hero.unlocked")}
              </span>
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                {Math.round(completionPercent)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-out",
                  hasPlatinum ? "bg-[#8a7cff]" : "bg-primary",
                )}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground tabular-nums">
              <span>
                {t("profile.showcase.achievementsCount", {
                  unlocked: unlockedCount,
                  total: totalCount,
                })}
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <SparklesIcon className="size-3 text-primary" />
                {earnedXP.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2.5">
          <h3 className="inline-flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            <EpicTrophyIcon className="size-5 text-primary" />
            {t("profile.hero.achievements")}
          </h3>
          <button
            type="button"
            onClick={handleFlipAll}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-card/80 px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors duration-150 hover:border-primary/60 hover:text-primary"
          >
            <RefreshCwIcon className="size-3.5" />
            {t("offerDetail.achievements.flipAll")}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sortedAchievements.map((achievement, index) => {
            const baseFlipped = !achievement.unlocked;
            const isFlipped = flippedOverrides[achievement.name] ? !baseFlipped : baseFlipped;
            const unlockDate =
              achievement.unlocked && achievement.unlockDate
                ? new Date(achievement.unlockDate)
                : undefined;

            return (
              <FlippableCard
                key={achievement.name}
                achievement={achievement}
                flipAll={flipAll}
                index={index}
                flipped={isFlipped}
                onCardFlip={handleCardFlip}
                unlockDate={
                  unlockDate && !Number.isNaN(unlockDate.getTime()) ? unlockDate : undefined
                }
                blur={true}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
