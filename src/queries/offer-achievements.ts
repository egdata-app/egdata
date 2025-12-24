import { httpClient } from "@/lib/http-client";

export type AchievementsSets = AchievementSet[];

export interface AchievementSet {
  _id: string;
  productId: string;
  sandboxId: string;
  achievementSetId: string;
  isBase: boolean;
  numProgressed: number;
  numCompleted: number;
  achievements: Achievement[];
  lastUpdated: string | undefined;
  __v: number;
}

export interface Achievement {
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
  unlockDate: string;
}

export async function fetchAchievementsSets({ id }: { id: string }) {
  return httpClient.get<AchievementsSets>(`/offers/${id}/achievements`);
}
