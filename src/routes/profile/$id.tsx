import * as React from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  type QueryObserverResult,
  type RefetchOptions,
  useQuery,
} from "@tanstack/react-query";
import {
  getDefaultProfilePageVariables,
  profilePageQueryOptions,
  type ProfilePageProfile,
} from "@/queries/profile-gql";
import {
  getRefreshStatus,
  getUserInformation,
  type Profile as RestProfile,
} from "@/queries/profiles";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getQueryClient } from "@/lib/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarIcon,
  CrownIcon,
  ExternalLinkIcon,
  Gamepad2Icon,
  Loader2,
  MessageSquareQuoteIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAccountIcon } from "@/components/app/platform-icons";
import { Separator } from "@/components/ui/separator";
import { EGSIcon } from "@/components/icons/egs";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { cn } from "@/lib/utils";
import { httpClient } from "@/lib/http-client";
import axios, { type AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DiscordIcon } from "@/components/icons/discord";

type LinkedAccount = {
  identityProviderId: string;
  displayName: string;
};

export const Route = createFileRoute("/profile/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as {
      dehydratedState: DehydratedState;
      id: string;
      userId: string | undefined;
    };

    return (
      <HydrationBoundary state={dehydratedState}>
        <RouteComponent />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { queryClient, session } = context;
    const { id } = params;
    const profileVariables = getDefaultProfilePageVariables(id);

    await Promise.allSettled([
      queryClient.ensureQueryData(profilePageQueryOptions(profileVariables)),
      queryClient.ensureQueryData({
        queryKey: ["profile-information", { id }],
        queryFn: () => getUserInformation(id).catch(() => null),
        staleTime: 60_000,
      }),
    ]);

    return {
      id,
      dehydratedState: dehydrate(queryClient),
      userId: session?.user.email.split("@")[0],
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();
    const profileVariables = getDefaultProfilePageVariables(params.id);
    const profileQueryKey = profilePageQueryOptions(profileVariables).queryKey;

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Profile not found",
            description: "Profile not found",
          },
        ],
      };
    }

    const profile = getFetchedQuery<ProfilePageProfile | null>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      profileQueryKey,
    );

    if (!profile) {
      return {
        meta: [
          {
            title: "Profile not found",
            description: "Profile not found",
          },
        ],
      };
    }

    return {
      meta: [
        {
          title: `${profile.displayName ?? "Profile"} | egdata.app`,
        },
        {
          name: "description",
          content: `Check out ${profile.displayName ?? "this player's"} achievements and games on egdata.app`,
        },
      ],
    };
  },
});

function RouteComponent() {
  const { id, userId } = Route.useLoaderData() as {
    dehydratedState: DehydratedState;
    id: string;
    userId: string | undefined;
  };
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [avatarErrors, setAvatarErrors] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = React.useState<string | null>(null);

  const profileVariables = getDefaultProfilePageVariables(id);
  const { data: profile, isLoading, isError } = useQuery(profilePageQueryOptions(profileVariables));
  const { data: legacyProfile } = useQuery({
    queryKey: ["profile-information", { id }],
    queryFn: () => getUserInformation(id).catch(() => null),
    staleTime: 60_000,
  });

  React.useEffect(() => {
    if (!selectedImage) {
      setSelectedImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    const image = new Image();
    image.src = objectUrl;
    setSelectedImagePreviewUrl(objectUrl);

    image.onload = () => {
      setAvatarErrors([]);
    };

    image.onerror = () => {
      setAvatarErrors(["Invalid image format"]);
    };

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const handleAvatarUpload = async (formData: FormData) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setAvatarErrors([]);

      const SERVER_API_ENDPOINT = httpClient.axiosInstance.defaults.baseURL;

      const response: AxiosResponse = await axios.post(
        `${SERVER_API_ENDPOINT}/auth/avatar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
          withCredentials: true,
        },
      );

      if (response.status !== 200) {
        throw new Error("Failed to upload");
      }

      window.location.reload();
      return response.data;
    } catch (error) {
      console.error("Upload failed:", error);
      setAvatarErrors([error instanceof Error ? error.message : "Upload failed"]);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <ProfileHeroSkeleton />;
  }

  if (!profile || isError) {
    return (
      <main className="flex min-h-[70vh] w-full items-center justify-center px-4">
        <div className="max-w-md rounded-md border border-border bg-card p-6 text-center">
          <h1 className="text-2xl font-semibold">Profile not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This profile is unavailable or has not been indexed yet.
          </p>
        </div>
      </main>
    );
  }

  const accountId = profile.accountId ?? id;
  const displayName = profile.displayName ?? "Unknown profile";
  const avatarUrl = profile.avatar?.large ?? profile.avatar?.medium ?? profile.avatar?.small ?? "";
  const isOwner = userId === accountId;
  const linkedAccounts = getProfileLinkedAccounts(profile.linkedAccounts);
  const highlights = {
    level: profile.highlights?.level ?? Math.floor((profile.highlights?.totalXP ?? 0) / 250),
    totalXP: profile.highlights?.totalXP ?? 0,
    totalGames: profile.highlights?.totalGames ?? 0,
    totalAchievements: profile.highlights?.totalAchievements ?? 0,
    totalPlatinums: profile.highlights?.totalPlatinums ?? 0,
    reviewsCount: profile.highlights?.reviewsCount ?? profile.reviewsCount ?? 0,
  };

  const xpInCurrentLevel = highlights.totalXP % 250;
  const xpToNextLevel = 250 - xpInCurrentLevel;
  const percentToNextLevel = (xpInCurrentLevel / 250) * 100;

  return (
    <TooltipProvider>
      <main className="flex min-h-screen w-full flex-col pb-12">
        <section className="relative isolate -mx-4 overflow-hidden px-4 pb-10 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <ProfileHeroBackground imageUrl={profile.heroGame?.imageUrl} title={displayName} />
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                {isOwner ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="group relative size-32 shrink-0">
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="size-32 rounded-full border border-white/20 object-cover shadow-2xl"
                        />
                        <DonnorBadge profile={legacyProfile} displayName={displayName} />
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                          <UploadIcon className="size-6 text-foreground" />
                        </span>
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Avatar</DialogTitle>
                        <DialogDescription>Upload a new profile image.</DialogDescription>
                      </DialogHeader>
                      <form
                        className="space-y-6"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const formData = new FormData(event.currentTarget);
                          await handleAvatarUpload(formData);
                        }}
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-24 w-24">
                            <AvatarImage
                              src={selectedImagePreviewUrl ?? avatarUrl}
                              alt="Avatar preview"
                            />
                            <AvatarFallback>Avatar</AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <Label htmlFor="avatar-upload">Change Avatar</Label>
                            <Input
                              id="avatar-upload"
                              name="avatar"
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files?.[0]) setSelectedImage(e.target.files?.[0]);
                              }}
                              className="w-full max-w-xs"
                              aria-describedby="avatar-upload-description"
                              disabled={isUploading}
                            />
                            <p
                              id="avatar-upload-description"
                              className="text-sm text-muted-foreground"
                            >
                              Upload a new avatar image, max 5MB.
                            </p>
                          </div>
                        </div>
                        {isUploading && (
                          <div className="w-full space-y-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full bg-primary transition-all duration-300 ease-in-out"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-center text-sm text-muted-foreground">
                              Uploading... {uploadProgress}%
                            </p>
                          </div>
                        )}
                        <Button
                          type="submit"
                          disabled={!selectedImage || avatarErrors.length > 0 || isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            "Update Avatar"
                          )}
                        </Button>
                        {avatarErrors.length > 0 && (
                          <Alert variant="destructive">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription className="flex flex-col gap-1">
                              {avatarErrors.map((error, index) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: unique key
                                <span key={index}>{error}</span>
                              ))}
                            </AlertDescription>
                          </Alert>
                        )}
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="relative size-32 shrink-0">
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="size-32 rounded-full border border-white/20 object-cover shadow-2xl"
                    />
                    <DonnorBadge profile={legacyProfile} displayName={displayName} />
                  </div>
                )}

                <div className="min-w-0 space-y-4">
                  <PlayerName displayName={displayName} donorProfile={legacyProfile} />
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-foreground">
                    {linkedAccounts.length > 0 && (
                      <div className="inline-flex items-center gap-4">
                        {linkedAccounts
                          .filter((account) => getAccountIcon(account))
                          .map((account) => (
                            <Tooltip key={account.identityProviderId}>
                              <TooltipTrigger className="inline-flex items-center">
                                {getAccountIcon(account)}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm font-medium">{account.displayName}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                      </div>
                    )}
                    {linkedAccounts.length > 0 && profile.creationDate && (
                      <Separator orientation="vertical" className="h-5 bg-white/25" />
                    )}
                    {profile.creationDate && (
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <CalendarIcon className="size-4" />
                        Joined{" "}
                        {new Date(profile.creationDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                        })}
                      </span>
                    )}
                    <Separator orientation="vertical" className="hidden h-5 bg-white/25 sm:block" />
                    <a
                      href={`https://store.epicgames.com/u/${accountId}?utm_source=egdata.app`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 text-foreground hover:text-foreground"
                    >
                      <EGSIcon className="size-4" />
                      <span>Epic Games Store</span>
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {legacyProfile?.discord === false && isOwner && (
                  <Button asChild variant="outline" className="bg-[#5865f2] hover:bg-[#4752c4]">
                    <a href={`${httpClient.axiosInstance.defaults.baseURL}/auth/discord/link`}>
                      <DiscordIcon className="size-4" fill="white" />
                      <span>Link Discord</span>
                    </a>
                  </Button>
                )}
                <RefreshProfile id={accountId} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <HeroStat
                label="Level"
                value={highlights.level}
                detail={`${highlights.totalXP.toLocaleString()} XP`}
                icon={<LevelIcon className="size-5" />}
              />
              <HeroStat
                label="Achievements"
                value={highlights.totalAchievements}
                detail="Unlocked"
                icon={<EpicTrophyIcon className="size-5" />}
              />
              <HeroStat
                label="Platinum"
                value={highlights.totalPlatinums}
                detail="Perfect games"
                icon={
                  <EpicPlatinumIcon
                    className={cn("size-5", highlights.totalPlatinums > 0 && "text-[#8a7cff]")}
                  />
                }
              />
              <HeroStat
                label="Library"
                value={highlights.totalGames}
                detail="Achievement games"
                icon={<Gamepad2Icon className="size-5" />}
              />
              <HeroStat
                label="Reviews"
                value={highlights.reviewsCount}
                detail="Contributed"
                icon={<MessageSquareQuoteIcon className="size-5" />}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-foreground">
                  <span className="inline-flex items-center gap-2">
                    <SparklesIcon className="size-4" />
                    {xpToNextLevel} XP to level {highlights.level + 1}
                  </span>
                  <span>{Math.round(percentToNextLevel)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{ width: `${percentToNextLevel}%` }}
                  />
                </div>
              </div>
              {profile.heroGame &&
                (profile.heroGame.sandboxId ? (
                  <Link
                    to="/profile/$id/achievements/$sandbox"
                    params={{ id: accountId, sandbox: profile.heroGame.sandboxId }}
                    className="group flex items-center justify-between gap-4 rounded-md border border-white/15 bg-black/35 p-4 text-left transition-colors hover:bg-black/50"
                  >
                    <HeroGameSummary game={profile.heroGame} />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-4 rounded-md border border-white/15 bg-black/35 p-4 text-left">
                    <HeroGameSummary game={profile.heroGame} />
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-0 pt-6">
          <Outlet />
        </section>
      </main>
    </TooltipProvider>
  );
}

function HeroGameSummary({ game }: { game: NonNullable<ProfilePageProfile["heroGame"]> }) {
  return (
    <>
      <div className="min-w-0">
        <p className="text-xs uppercase text-muted-foreground">Hero game</p>
        <p className="truncate text-lg font-semibold">{game.title}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-2xl font-light">{Math.round(game.completionPercent ?? 0)}%</p>
        <p className="text-xs text-muted-foreground">complete</p>
      </div>
    </>
  );
}

function ProfileHeroBackground({ imageUrl, title }: { imageUrl?: string | null; title: string }) {
  return (
    <div className="absolute inset-0 -z-10 bg-background">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-30"
          loading="eager"
        />
      )}
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background))_0%,hsl(var(--background)/0.94)_38%,hsl(var(--background)/0.72)_70%,hsl(var(--background)/0.58)_100%)]"
        aria-label={title}
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

function ProfileHeroSkeleton() {
  return (
    <main className="flex min-h-screen w-full flex-col gap-6 px-4 py-10">
      <div className="h-32 w-32 animate-pulse rounded-full bg-primary/10" />
      <div className="h-12 w-80 max-w-full animate-pulse rounded-md bg-primary/10" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <div key={index} className="h-28 animate-pulse rounded-md bg-primary/10" />
        ))}
      </div>
    </main>
  );
}

function HeroStat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-black/35 p-4 backdrop-blur">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs uppercase tracking-normal">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-light text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function getProfileLinkedAccounts(value: unknown): LinkedAccount[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((account) => {
    if (!account || typeof account !== "object") return [];
    const maybeAccount = account as Record<string, unknown>;
    const identityProviderId = maybeAccount.identityProviderId;
    const displayName = maybeAccount.displayName;

    if (typeof identityProviderId !== "string" || typeof displayName !== "string") {
      return [];
    }

    return [{ identityProviderId, displayName }];
  });
}

function LevelIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 25 25"
      className={cn("svg", className)}
      {...props}
    >
      <path
        d="M17.0208 2.24212C16.929 1.91929 16.3877 1.91929 16.2959 2.24212C16.0402 3.14058 15.6679 4.21937 15.2399 4.748C14.7655 5.33397 13.582 5.83545 12.6847 6.14986C12.385 6.25489 12.385 6.74511 12.6847 6.85014C13.582 7.16456 14.7655 7.66603 15.2399 8.252C15.6679 8.78063 16.0402 9.85942 16.2959 10.7579C16.3877 11.0807 16.929 11.0807 17.0208 10.7579C17.2765 9.85942 17.6488 8.78063 18.0768 8.252C18.5512 7.66603 19.7347 7.16456 20.632 6.85014C20.9317 6.74511 20.9317 6.25489 20.632 6.14986C19.7347 5.83544 18.5512 5.33397 18.0768 4.748C17.6488 4.21937 17.2765 3.14058 17.0208 2.24212ZM8.15377 7.54551C8.03104 7.09068 7.28574 7.09068 7.163 7.54551C6.71751 9.19641 6.00657 11.4072 5.17574 12.4335C4.27523 13.5458 1.91486 14.4841 0.317012 15.0195C-0.105671 15.1612 -0.105671 15.8388 0.317012 15.9805C1.91486 16.5159 4.27523 17.4542 5.17574 18.5665C6.00657 19.5928 6.71751 21.8036 7.163 23.4545C7.28574 23.9093 8.03104 23.9093 8.15377 23.4545C8.59926 21.8036 9.31021 19.5928 10.141 18.5665C11.0415 17.4542 13.4019 16.5159 14.9998 15.9805C15.4224 15.8388 15.4224 15.1612 14.9998 15.0195C13.4019 14.4841 11.0415 13.5458 10.141 12.4335C9.31021 11.4072 8.59926 9.19641 8.15377 7.54551Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function EpicPlatinumIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 15"
      className={cn("svg", className)}
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.82469 5.7203C8.10017 4.28067 7.34052 2.77122 7.51834 0C6.90611 0.01125 4.43223 1.59312 3.97056 5.34875C3.48704 4.8144 3.24026 3.04552 3.33333 2.32187C1.13777 4.1775 0 6.56 0 9.21813C0 12.4019 1.90556 15 4.97945 15C8.05804 15 10 12.6544 10 9.8275C10 8.05565 9.42438 6.91189 8.82469 5.7203ZM4.99966 13.9598C5.83378 13.9598 6.50997 13.5934 6.50997 13.1415C6.50997 12.8016 6.12752 12.5101 5.58307 12.3865C5.44824 12.0795 5.37724 11.746 5.37724 11.4062C5.37724 11.3212 5.38389 11.237 5.39689 11.1541C6.45872 10.9664 7.2652 10.0392 7.2652 8.92337V7.57032L7.26527 7.56325C7.26527 7.06278 6.25098 6.65707 4.9998 6.65707C3.74862 6.65707 2.73433 7.06278 2.73433 7.56325L2.73427 8.92337C2.73427 10.0391 3.54067 10.9663 4.60242 11.1541C4.61543 11.237 4.62209 11.3212 4.62209 11.4062C4.62209 11.746 4.55109 12.0795 4.41626 12.3865C3.8718 12.5101 3.48935 12.8016 3.48935 13.1415C3.48935 13.5934 4.16554 13.9598 4.99966 13.9598Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlayerName({
  displayName,
  donorProfile,
}: {
  displayName: string;
  donorProfile?: RestProfile | null;
}) {
  const isDonator = (donorProfile?.donations.length ?? 0) > 0;

  if (isDonator) {
    return <DonatorName>{displayName}</DonatorName>;
  }

  return (
    <h1 className="break-words text-5xl font-thin text-foreground md:text-6xl">{displayName}</h1>
  );
}

function DonatorName({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative">
      <div
        className={cn(
          "absolute text-5xl font-thin md:text-6xl",
          "text-transparent bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 bg-clip-text",
          "blur-md opacity-80 animate-[shadow-pulse_3s_ease-in-out_infinite]",
          "select-none pointer-events-none",
          className,
        )}
        style={{
          transform: "translate(-4px, -4px)",
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      <div
        className={cn(
          "absolute text-5xl font-thin md:text-6xl",
          "text-transparent bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 bg-clip-text",
          "blur-lg opacity-90 animate-[shadow-pulse-2_4s_ease-in-out_infinite]",
          "select-none pointer-events-none",
          className,
        )}
        style={{
          transform: "translate(10px, 10px)",
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      <h1
        className={cn(
          "relative z-[1] break-words text-5xl font-thin text-foreground md:text-6xl",
          className,
        )}
      >
        {children}
      </h1>
    </div>
  );
}

function DonnorBadge({
  profile,
  displayName,
}: {
  profile?: RestProfile | null;
  displayName: string;
}) {
  const donations = profile?.donations.length ?? 0;

  if (donations === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="absolute right-0 top-0 inline-flex rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 p-1.5 shadow-lg"
          tabIndex={0}
        >
          <CrownIcon className="h-5 w-5 text-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        className="flex flex-col gap-2 rounded-md p-4 text-sm font-normal"
        side="right"
        sideOffset={10}
      >
        <p>
          {displayName} has donated {donations} {donations === 1 ? "key" : "keys"} to egdata.app
        </p>
        <p className="inline-flex items-center gap-1">
          Go to{" "}
          <Link to="/donate-key" className="text-blue-500 hover:text-blue-600">
            this link
          </Link>
          to donate a key.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function RefreshProfile({ id }: { id: string }) {
  const { data: refreshStatus, refetch } = useQuery(getRefreshStatus(id));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await httpClient.put(`/profiles/${id}/refresh`).catch(() => {
      toast.error("Failed to refresh profile");
    });
    setIsRefreshing(false);
    toast.success("Profile added to queue for refresh, it will be updated soon.");
    await refetch();
  };

  return (
    <Tooltip delayDuration={0} open={refreshStatus?.canRefresh ? false : undefined}>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || !refreshStatus?.canRefresh}
          className="inline-flex items-center justify-center gap-2 bg-black/25"
        >
          <ReloadIcon className={cn("size-4", isRefreshing && "animate-spin")} />
          <span className="text-sm font-medium">Refresh profile</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={5}>
        <p>
          Refresh available in{" "}
          <Countdown date={refreshStatus?.refreshAvailableAt ?? new Date()} refetch={refetch} />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function Countdown({
  date,
  refetch,
}: {
  date: Date;
  refetch: (options?: RefetchOptions) => Promise<
    QueryObserverResult<
      {
        refreshAvailableAt: Date;
        canRefresh: boolean;
        remainingTime: number;
      },
      Error
    >
  >;
}) {
  const { timezone } = useLocale();
  const target = DateTime.fromJSDate(date).setZone(timezone || "UTC");
  const [countdown, setCountdown] = useState(
    target.diff(DateTime.now().setZone(timezone || "UTC"), "milliseconds").milliseconds,
  );
  const [hasRefetched, setHasRefetched] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = DateTime.now().setZone(timezone || "UTC");
      const newCountdown = target.diff(now, "milliseconds").milliseconds;
      setCountdown(newCountdown);

      if (!hasRefetched && newCountdown <= 0) {
        setHasRefetched(true);
        refetch();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [target, refetch, hasRefetched, timezone]);

  useEffect(() => {
    setHasRefetched(false);
  }, []);

  const minutes = Math.floor(countdown / (1000 * 60));
  const seconds = Math.floor((countdown % (1000 * 60)) / 1000);

  if (minutes > 0) {
    return (
      <span>
        {minutes} minute{minutes !== 1 ? "s" : ""} {seconds} second
        {seconds !== 1 ? "s" : ""}
      </span>
    );
  }
  return (
    <span>
      {seconds} second{seconds !== 1 ? "s" : ""}
    </span>
  );
}
