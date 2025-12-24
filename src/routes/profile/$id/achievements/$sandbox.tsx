import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { FlippableCard } from "@/components/app/achievement-card";

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

export const Route = createFileRoute("/profile/$id/achievements/$sandbox")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <RouteComponent />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { queryClient } = context;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["player-sandbox-achievements", { id: params.id, sandbox: params.sandbox }],
        queryFn: () =>
          httpClient.get<Root>(`/profiles/${params.id}/achievements/${params.sandbox}`),
      }),
      queryClient.prefetchQuery({
        queryKey: ["sandbox:base", { id: params.sandbox, country: "US" }],
        queryFn: () =>
          httpClient.get<SingleOffer>(`/sandboxes/${params.sandbox}/base-game`, {
            params: {
              country: "US",
            },
          }),
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
  const { id, sandbox } = Route.useLoaderData();
  const { data, isLoading } = useQuery({
    queryKey: ["player-sandbox-achievements", { id, sandbox }],
    queryFn: () => httpClient.get<Root>(`/profiles/${id}/achievements/${sandbox}`),
  });
  const { data: offer } = useQuery({
    queryKey: ["sandbox:base", { id: sandbox, country: "US" }],
    queryFn: () =>
      httpClient.get<SingleOffer>(`/sandboxes/${sandbox}/base-game`, {
        params: {
          country: "US",
        },
      }),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Profile not found</div>;
  }

  const sandboxAchievements = data.sandboxAchievements
    .flatMap((achievementSet) => achievementSet.achievements)
    .flat();

  const playerAchievements = data.playerAchievements
    .flatMap((playerAchievement) => playerAchievement.playerAchievements)
    .flat();

  // Merge achievements, we know if its unlocked from the playerAchievements, while the sandboxAchievements has the data
  const achievements: PlayerAchievementStatus[] = sandboxAchievements.map((achievement) => {
    // Find the corresponding player achievement by matching both sandboxId and achievementName
    const playerAchievement = playerAchievements.find(
      ({ playerAchievement }) =>
        playerAchievement.achievementName === achievement.name &&
        playerAchievement.sandboxId === data.playerAchievements[0]?.sandboxId, // Ensure matching sandbox
    );

    return {
      ...achievement,
      unlocked: !!playerAchievement?.playerAchievement.unlocked, // Convert undefined to false
      unlockDate: playerAchievement?.playerAchievement.unlockDate || "", // Convert undefined to an empty string
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-full justify-start items-center gap-4 relative">
        <Link
          to={`/profile/${id}`}
          className="text-2xl font-light flex flex-row gap-2 items-center justify-start group"
        >
          <ArrowRight className="w-4 h-4 rotate-180 transform group-hover:-translate-x-1 transition-transform duration-300" />
          My Achievements
        </Link>
        <span className="text-gray-600 text-xl">|</span>
        {offer?.title && <h4 className="text-2xl font-bold">{offer.title}</h4>}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 mt-4">
        {achievements
          .sort((a, b) => (a.unlocked ? -1 : b.unlocked ? 1 : 0))
          .map((achievement, index) => (
            <FlippableCard
              key={achievement.name}
              achievement={achievement}
              flipAll={false}
              index={index}
              flipped={!achievement.unlocked}
              onCardFlip={() => {}}
              unlockDate={new Date(achievement.unlockDate)}
              blur={true}
            />
          ))}
      </div>
    </div>
  );
}
