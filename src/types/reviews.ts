import type { JSONContent } from "@tiptap/react";

export interface SingleReview {
  id: string;
  userId: string;
  user: User;
  rating: number;
  recommended: boolean;
  content: string | JSONContent;
  title: string;
  tags: string[];
  createdAt: string;
  verified: boolean;
  updatedAt: string;
  editions?: {
    title: string;
    content: string | JSONContent;
    createdAt: string;
    rating: number;
    tags: string[];
  }[];
}

export type ReviewInput = Omit<
  SingleReview,
  "id" | "createdAt" | "updatedAt" | "verified" | "userId" | "editions" | "user"
>;

interface User {
  _id: string;
  accountId: string;
  displayName: string;
  preferredLanguage: string;
  linkedAccounts: LinkedAccount[];
  avatarUrl: AvatarUrl;
  creationDate: string;
  role: string;
}

interface LinkedAccount {
  identityProviderId: string;
  displayName: string;
}

interface AvatarUrl {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
}
