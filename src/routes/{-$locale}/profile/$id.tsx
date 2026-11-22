import * as React from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Link } from "@/components/app/localized-link";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";
import {
  dehydrate,
  type DehydratedState,
  HydrationBoundary,
  type QueryObserverResult,
  type RefetchOptions,
  useQuery,
} from "@tanstack/react-query";
import {
  profileFeaturedGamesQueryOptions,
  profileInformationQueryOptions,
  selectHeroGame,
  type ProfileGame,
  type ProfileInformation,
} from "@/queries/profile";
import { getRefreshStatus } from "@/queries/profiles";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { getQueryClient } from "@/lib/client";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button as AriaButton } from "react-aria-components";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon, ReloadIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { getAccountIcon } from "@/components/app/platform-icons";
import { Separator } from "@/components/ui/separator";
import { EGSIcon } from "@/components/icons/egs";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { cn } from "@/lib/utils";
import { httpClient } from "@/lib/http-client";
import { captureError } from "@/lib/pulse-telemetry";
import axios, { type AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DiscordIcon } from "@/components/icons/discord";

type LinkedAccount = {
  identityProviderId: string;
  displayName: string;
};

export const Route = createFileRoute("/{-$locale}/profile/$id")({
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

    await Promise.allSettled([
      queryClient.ensureQueryData(profileInformationQueryOptions(id)),
      queryClient.ensureQueryData(profileFeaturedGamesQueryOptions(id)),
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
    const profileQueryKey = profileInformationQueryOptions(params.id).queryKey;

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: i18n.t("profile.meta.notFoundTitle"),
            description: i18n.t("profile.meta.notFoundDescription"),
          },
        ],
      };
    }

    const profile = getFetchedQuery<ProfileInformation | null>(
      queryClient,
      ctx.loaderData?.dehydratedState,
      profileQueryKey,
    );

    if (!profile) {
      return {
        meta: [
          {
            title: i18n.t("profile.meta.notFoundTitle"),
            description: i18n.t("profile.meta.notFoundDescription"),
          },
        ],
      };
    }

    return {
      meta: [
        {
          title: i18n.t("profile.meta.title", {
            name: profile.displayName ?? i18n.t("profile.meta.defaultName"),
          }),
        },
        {
          name: "description",
          content: i18n.t("profile.meta.description", {
            name: profile.displayName ?? i18n.t("profile.meta.defaultDescriptionName"),
          }),
        },
      ],
    };
  },
});

function RouteComponent() {
  const { t } = useTranslation();
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

  const { data: profile, isLoading, isError } = useQuery(profileInformationQueryOptions(id));
  const { data: featuredGames } = useQuery(profileFeaturedGamesQueryOptions(id));
  const heroGame = selectHeroGame(featuredGames ?? []);

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
      setAvatarErrors([t("profile.errors.invalidImageFormat")]);
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
        throw new Error(t("profile.errors.failedToUpload"));
      }

      window.location.reload();
      return response.data;
    } catch (error) {
      console.error("Upload failed:", error);
      captureError(error, {
        attributes: {
          "egdata.profile_id": id,
        },
        source: "profile.avatar-upload",
      });
      setAvatarErrors([error instanceof Error ? error.message : t("profile.errors.uploadFailed")]);
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
        <div className="max-w-md rounded-xl border border-white/10 bg-card/80 p-6 text-center">
          <h1 className="font-display text-2xl font-semibold">
            {t("profile.errors.notFoundTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("profile.errors.notFoundDescription")}
          </p>
        </div>
      </main>
    );
  }

  const accountId = profile.epicAccountId ?? id;
  const displayName = profile.displayName ?? t("profile.fallbackName");
  const avatarUrl = profile.avatar?.large ?? profile.avatar?.medium ?? profile.avatar?.small ?? "";
  const isOwner = userId === accountId;
  const linkedAccounts = getProfileLinkedAccounts(profile.linkedAccounts);
  const totalXP = profile.stats?.totalXP ?? 0;
  const highlights = {
    level: Math.floor(totalXP / 250),
    totalXP,
    totalGames: profile.stats?.totalGames ?? 0,
    totalAchievements: profile.stats?.totalAchievements ?? 0,
    totalPlatinums: profile.stats?.totalPlayerAwards ?? 0,
    reviewsCount: profile.stats?.reviewsCount ?? 0,
  };

  const xpInCurrentLevel = highlights.totalXP % 250;
  const xpToNextLevel = 250 - xpInCurrentLevel;
  const percentToNextLevel = (xpInCurrentLevel / 250) * 100;

  return (
    <main className="flex min-h-screen w-full flex-col pb-12">
      <section className="relative isolate -mx-4 overflow-hidden border-b border-border/60 px-4 pb-10 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ProfileHeroBackground imageUrl={heroGame?.imageUrl} />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="relative size-28 shrink-0 sm:size-32">
                {isOwner ? (
                  <DialogTrigger>
                    <AriaButton className="group relative block size-full cursor-pointer overflow-hidden rounded-full border border-white/15 shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="size-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
                      />
                      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <UploadIcon className="size-6 text-foreground" />
                      </span>
                    </AriaButton>
                    <Dialog>
                      <DialogHeader>
                        <DialogTitle>{t("profile.avatar.changeAvatar")}</DialogTitle>
                        <DialogDescription>
                          {t("profile.avatar.dialogDescription")}
                        </DialogDescription>
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
                              alt={t("profile.avatar.previewAlt")}
                            />
                            <AvatarFallback>{t("profile.avatar.fallback")}</AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <Label htmlFor="avatar-upload">
                              {t("profile.avatar.changeAvatar")}
                            </Label>
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
                              {t("profile.avatar.description")}
                            </p>
                          </div>
                        </div>
                        {isUploading && (
                          <div className="w-full space-y-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full bg-primary transition-[width] duration-300 ease-in-out"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-center text-sm text-muted-foreground tabular-nums">
                              {t("profile.avatar.uploadingWithProgress", {
                                progress: uploadProgress,
                              })}
                            </p>
                          </div>
                        )}
                        <Button
                          type="submit"
                          isDisabled={!selectedImage || avatarErrors.length > 0 || isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t("profile.avatar.uploading")}
                            </>
                          ) : (
                            t("profile.avatar.updateAvatar")
                          )}
                        </Button>
                        {avatarErrors.length > 0 && (
                          <Alert variant="destructive">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <AlertTitle>{t("profile.avatar.errorTitle")}</AlertTitle>
                            <AlertDescription className="flex flex-col gap-1">
                              {avatarErrors.map((error, index) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: unique key
                                <span key={index}>{error}</span>
                              ))}
                            </AlertDescription>
                          </Alert>
                        )}
                      </form>
                    </Dialog>
                  </DialogTrigger>
                ) : (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="size-full rounded-full border border-white/15 object-cover shadow-2xl"
                  />
                )}
                <DonnorBadge profile={profile} displayName={displayName} />
              </div>

              <div className="min-w-0 space-y-3">
                <PlayerName displayName={displayName} donorProfile={profile} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {linkedAccounts.length > 0 && (
                    <div className="inline-flex items-center gap-3.5 text-foreground/90">
                      {linkedAccounts
                        .filter((account) => getAccountIcon(account))
                        .map((account) => (
                          <TooltipTrigger key={account.identityProviderId}>
                            <span
                              tabIndex={0}
                              className="inline-flex cursor-pointer items-center transition-colors duration-150 hover:text-primary"
                            >
                              {getAccountIcon(account)}
                            </span>
                            <Tooltip>
                              <p className="text-sm font-medium">{account.displayName}</p>
                            </Tooltip>
                          </TooltipTrigger>
                        ))}
                    </div>
                  )}
                  {linkedAccounts.length > 0 && profile.creationDate && (
                    <Separator orientation="vertical" className="h-4 bg-white/15" />
                  )}
                  {profile.creationDate && (
                    <span className="inline-flex items-center gap-2 tabular-nums">
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      {t("profile.hero.joined")}{" "}
                      {new Date(profile.creationDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </span>
                  )}
                  <Separator orientation="vertical" className="hidden h-4 bg-white/15 sm:block" />
                  <a
                    href={`https://store.epicgames.com/u/${accountId}?utm_source=egdata.app`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex cursor-pointer items-center gap-2 text-foreground/90 transition-colors duration-150 hover:text-primary"
                  >
                    <EGSIcon className="size-4" />
                    <span>{t("profile.hero.epicGamesStore")}</span>
                    <ExternalLinkIcon className="size-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
              {profile.discord === false && isOwner && (
                <a
                  href={`${httpClient.axiosInstance.defaults.baseURL}/auth/discord/link`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "cursor-pointer border-white/15 bg-[#5865f2] text-white transition-colors duration-150 hover:bg-[#4752c4]",
                  )}
                >
                  <DiscordIcon className="size-4" fill="white" />
                  <span>{t("profile.hero.linkDiscord")}</span>
                </a>
              )}
              <RefreshProfile id={accountId} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <HeroStat
              label={t("profile.hero.level")}
              value={highlights.level}
              detail={`${highlights.totalXP.toLocaleString()} XP`}
              icon={<LevelIcon className="size-4" />}
            />
            <HeroStat
              label={t("profile.hero.achievements")}
              value={highlights.totalAchievements}
              detail={t("profile.hero.unlocked")}
              icon={<EpicTrophyIcon className="size-4" />}
            />
            <HeroStat
              label={t("profile.hero.platinum")}
              value={highlights.totalPlatinums}
              detail={t("profile.hero.perfectGames")}
              icon={
                <EpicPlatinumIcon
                  className={cn("size-4", highlights.totalPlatinums > 0 && "text-[#8a7cff]")}
                />
              }
            />
            <HeroStat
              label={t("profile.hero.library")}
              value={highlights.totalGames}
              detail={t("profile.hero.achievementGames")}
              icon={<Gamepad2Icon className="size-4" />}
            />
            <HeroStat
              label={t("profile.hero.reviews")}
              value={highlights.reviewsCount}
              detail={t("profile.hero.contributed")}
              icon={<MessageSquareQuoteIcon className="size-4" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
            <div className="flex flex-col justify-center gap-2.5 rounded-xl border border-white/10 bg-card/80 p-4">
              <div className="flex items-center justify-between gap-3 text-sm text-foreground">
                <span className="inline-flex items-center gap-2 font-medium tabular-nums">
                  <SparklesIcon className="size-4 text-primary" />
                  {t("profile.hero.xpToNextLevel", {
                    xp: xpToNextLevel,
                    level: highlights.level + 1,
                  })}
                </span>
                <span className="font-display text-sm font-semibold tabular-nums text-foreground">
                  {Math.round(percentToNextLevel)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                  style={{ width: `${percentToNextLevel}%` }}
                />
              </div>
            </div>
            {heroGame &&
              (heroGame.sandboxId ? (
                <Link
                  to="/{-$locale}/profile/$id/achievements/$sandbox"
                  params={{ id: accountId, sandbox: heroGame.sandboxId }}
                  className="group flex items-center justify-between gap-3.5 rounded-xl border border-white/10 bg-card/80 p-3.5 text-left transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:shadow-lg hover:shadow-black/35"
                >
                  <HeroGameSummary game={heroGame} />
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3.5 rounded-xl border border-white/10 bg-card/80 p-3.5 text-left">
                  <HeroGameSummary game={heroGame} />
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-0 pt-6">
        <Outlet />
      </section>
    </main>
  );
}

function HeroGameSummary({ game }: { game: ProfileGame }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex min-w-0 items-center gap-3.5">
        {game.imageUrl && (
          <div className="aspect-video w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-background/60">
            <img
              src={game.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{t("profile.hero.heroGame")}</p>
          <p className="truncate font-display text-base font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
            {game.title}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-2xl font-semibold tabular-nums text-foreground">
          {Math.round(game.completionPercent ?? 0)}%
        </p>
        <p className="text-xs text-muted-foreground">{t("profile.hero.complete")}</p>
      </div>
    </>
  );
}

function ProfileHeroBackground({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 bg-background" aria-hidden="true">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25"
          loading="eager"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent" />
    </div>
  );
}

function ProfileHeroSkeleton() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="size-28 animate-pulse rounded-full bg-card/80 sm:size-32" />
        <div className="space-y-3">
          <div className="h-12 w-72 max-w-full animate-pulse rounded-xl bg-card/80" />
          <div className="h-5 w-56 max-w-full animate-pulse rounded-lg bg-card/80" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <div key={index} className="h-24 animate-pulse rounded-xl bg-card/80" />
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
    <div className="rounded-xl border border-white/10 bg-card/80 p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs font-medium">{label}</p>
        <span className="text-muted-foreground/80">{icon}</span>
      </div>
      <p className="mt-2.5 font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{detail}</p>
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
  donorProfile?: ProfileInformation | null;
}) {
  const isDonator = (donorProfile?.donations.length ?? 0) > 0;

  if (isDonator) {
    return <DonatorName>{displayName}</DonatorName>;
  }

  return (
    <h1 className="break-words font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
      {displayName}
    </h1>
  );
}

function DonatorName({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={cn(
        "break-words font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl",
        "bg-gradient-to-r from-foreground via-sky-200 to-[#b4a7ff] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </h1>
  );
}

function DonnorBadge({
  profile,
  displayName,
}: {
  profile?: ProfileInformation | null;
  displayName: string;
}) {
  const { t } = useTranslation();
  const donations = profile?.donations.length ?? 0;

  if (donations === 0) return null;

  return (
    <TooltipTrigger>
      <span
        className="absolute right-0 top-0 inline-flex cursor-pointer rounded-full border border-white/20 bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 p-1.5 shadow-lg transition-colors duration-150"
        tabIndex={0}
      >
        <CrownIcon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
      </span>
      <Tooltip
        className="flex flex-col gap-2 rounded-xl border border-white/10 p-4 text-sm font-normal"
        placement="right"
        offset={10}
      >
        <p>{t("profile.donor.donated", { count: donations, name: displayName })}</p>
        <p className="inline-flex items-center gap-1">
          {t("profile.donor.goTo")}{" "}
          <Link to="/{-$locale}/donate-key" className="text-primary hover:underline">
            {t("profile.donor.thisLink")}
          </Link>
          {t("profile.donor.toDonateKey")}
        </p>
      </Tooltip>
    </TooltipTrigger>
  );
}

function RefreshProfile({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: refreshStatus, refetch } = useQuery(getRefreshStatus(id));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await httpClient.put(`/profiles/${id}/refresh`).catch(() => {
      toast.error(t("profile.errors.failedToRefresh"));
    });
    setIsRefreshing(false);
    toast.success(t("profile.errors.refreshQueued"));
    await refetch();
  };

  return (
    <TooltipTrigger delay={0} isDisabled={Boolean(refreshStatus?.canRefresh)}>
      <Button
        onPress={handleRefresh}
        isDisabled={isRefreshing || !refreshStatus?.canRefresh}
        className="cursor-pointer border border-primary/40 bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-colors duration-150 hover:bg-primary/90 hover:shadow-primary/30 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-card/80 disabled:text-muted-foreground disabled:shadow-none disabled:opacity-100"
      >
        <ReloadIcon className={cn("size-4", isRefreshing && "animate-spin")} />
        <span className="text-sm font-medium">{t("profile.hero.refreshProfile")}</span>
      </Button>
      <Tooltip offset={5}>
        <p className="tabular-nums">
          {t("profile.hero.refreshAvailableIn")}{" "}
          <Countdown date={refreshStatus?.refreshAvailableAt ?? new Date()} refetch={refetch} />
        </p>
      </Tooltip>
    </TooltipTrigger>
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
  const { t } = useTranslation();
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
        {t("profile.countdown.minutesSeconds", {
          count: minutes,
          minutes,
          seconds,
        })}
      </span>
    );
  }
  return <span>{t("profile.countdown.seconds", { count: seconds, seconds })}</span>;
}
