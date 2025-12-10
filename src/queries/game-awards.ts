import { httpClient } from '@/lib/http-client';
import type { SingleOffer } from '@/types/single-offer';

export interface GameAwardsSection {
  title: string;
  offers: SingleOffer[];
}

// YouTube video ID for the current year's stream
export const YOUTUBE_VIDEO_ID = 'd-BDeU3R5ic'; // Update with 2024 TGA video ID

export async function getGameAwardsData() {
  return httpClient.get<GameAwardsSection[]>('/game-awards');
}
