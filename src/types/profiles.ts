import type { KeyImage } from "./single-offer";

export interface Profile {
  epicAccountId: string;
  displayName: string;
  avatar: Avatar;
  achievements: Achievements;
  linkedAccounts?: LinkedAccount[];
  creationDate: string | null;
  reviews: number;
}

export interface LinkedAccount {
  identityProviderId: string;
  displayName: string;
}

export interface Avatar {
  small: string;
  medium: string;
  large: string;
}

export interface Achievements {
  __typename: string;
  status: number;
  data: Daum[];
}

export interface Daum {
  totalUnlocked: number;
  totalXP: number;
  sandboxId: string;
  baseOfferForSandbox: BaseOfferForSandbox;
  product: Product;
  productAchievements: ProductAchievements | null;
  playerAwards: PlayerAward[];
}

export interface BaseOfferForSandbox {
  keyImages: KeyImage[];
  id: string | null;
  namespace: string | null;
}

export interface Product {
  name: string;
  slug: string;
}

export interface ProductAchievements {
  totalAchievements: number;
  totalProductXP: number;
}

export interface PlayerAward {
  awardType: string;
}
