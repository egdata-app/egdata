import * as React from "react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";
import {
  dehydrate,
  HydrationBoundary,
  keepPreviousData,
  type QueryObserverResult,
  type RefetchOptions,
  useQuery,
} from "@tanstack/react-query";
import {
  getRefreshStatus,
  getUserGames,
  getUserInformation,
  type Profile,
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
  ExternalLinkIcon,
  LayoutGridIcon,
  MessageSquareQuoteIcon,
  UploadIcon,
  Loader2,
  CrownIcon,
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
import { getImage } from "@/lib/get-image";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import axios, { type AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DiscordIcon } from "@/components/icons/discord";

export const Route = createFileRoute("/profile/$id")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData();

    return (
      <HydrationBoundary state={dehydratedState}>
        <RouteComponent />
      </HydrationBoundary>
    );
  },

  loader: async ({ context, params }) => {
    const { queryClient, session } = context;
    const { id } = params;

    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["profile-information", { id: params.id }],
        queryFn: () => getUserInformation(params.id as string),
      }),
      queryClient.prefetchInfiniteQuery({
        queryKey: ["profile-games", { id: params.id, limit: 20 }],
        queryFn: ({ pageParam }) => getUserGames(params.id as string, pageParam, 20),
        initialPageParam: 1,
        getNextPageParam: (lastPage: { pagination: { totalPages: number; page: number } }) => {
          if (lastPage.pagination.totalPages === lastPage.pagination.page) return undefined;
          return lastPage.pagination.page + 1;
        },
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

    const user = getFetchedQuery<Profile>(queryClient, ctx.loaderData?.dehydratedState, [
      "profile-information",
      { id: params.id },
    ]);

    if (!user) {
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
          title: `${user.displayName} | egdata.app`,
        },
        {
          name: "description",
          content: `Check out ${user.displayName}'s achievements and games on egdata.app`,
        },
      ],
    };
  },
});

function RouteComponent() {
  const { id, userId } = Route.useLoaderData();
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [avatarErrors, setAvatarErrors] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["profile-information", { id: id }],
    queryFn: () => getUserInformation(id),
  });

  React.useEffect(() => {
    if (selectedImage) {
      const image = new Image();
      image.src = URL.createObjectURL(selectedImage);

      image.onload = () => {
        const errors: string[] = [];

        // Set errors if any, or clear them if there are none
        setAvatarErrors(errors);
      };

      image.onerror = () => {
        setAvatarErrors(["Invalid image format"]);
      };

      // Cleanup URL object to avoid memory leaks
      return () => URL.revokeObjectURL(image.src);
    }
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
    return <div>Loading...</div>;
  }

  if (!data || isError) {
    return <div>Profile not found</div>;
  }

  const userTotalXP = data.stats.totalXP;

  // Each level is 250 XP
  const userLevel = Math.floor(userTotalXP / 250);
  const xpInCurrentLevel = userTotalXP % 250;
  const xpToNextLevel = 250 - xpInCurrentLevel;
  const percentToNextLevel = (xpInCurrentLevel / 250) * 100;

  return (
    <TooltipProvider>
      <main className="flex flex-col items-start justify-start w-full min-h-screen gap-4 mt-10">
        <BackgroundImage id={data.epicAccountId} />
        <section id="profile-header" className="flex flex-row gap-10 w-full relative">
          {userId === data.epicAccountId ? (
            <Dialog>
              <div className="flex flex-col gap-2 relative">
                <DialogTrigger asChild>
                  <div className="relative group">
                    <img
                      src={data.avatar.large}
                      alt={data.displayName}
                      className="rounded-full h-32 w-32 object-cover"
                    />
                    <DonnorBadge profile={data} />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full">
                      <span className="text-white text-lg">
                        <UploadIcon className="w-6 h-6" />
                      </span>
                    </div>
                  </div>
                </DialogTrigger>
              </div>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Avatar</DialogTitle>
                  <DialogDescription asChild>
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
                            src={
                              selectedImage ? URL.createObjectURL(selectedImage) : data.avatar.large
                            }
                            alt="Avatar preview"
                          />
                          <AvatarFallback>Avatar</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <Label
                            htmlFor="avatar-upload"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Change Avatar
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
                          <p id="avatar-upload-description" className="text-sm text-gray-500">
                            Upload a new avatar image (max 5MB)
                          </p>
                        </div>
                      </div>
                      {isUploading && (
                        <div className="w-full space-y-2">
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 ease-in-out"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-gray-500 text-center">
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
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="relative">
              <img
                src={data.avatar.large}
                alt={data.displayName}
                className="rounded-full h-32 w-32 object-cover"
              />
              <DonnorBadge profile={data} />
            </div>
          )}
          <div className="flex flex-col gap-4">
            <PlayerName profile={data} />
            <div className="flex flex-row gap-6 items-center justify-start">
              {data?.linkedAccounts && data.linkedAccounts.length > 0 && (
                <div className="inline-flex gap-6 items-center h-6">
                  <TooltipProvider>
                    {data.linkedAccounts
                      ?.filter((account) => getAccountIcon(account))
                      .map((account) => (
                        <Tooltip key={account.identityProviderId}>
                          <TooltipTrigger>{getAccountIcon(account)}</TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm font-medium">{account.displayName}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                  </TooltipProvider>
                </div>
              )}
              {data.creationDate && data?.linkedAccounts && data.linkedAccounts.length > 0 && (
                <Separator orientation="vertical" />
              )}
              {data.creationDate && (
                <p className="text-sm text-gray-300">
                  <span>Joined </span>
                  {new Date(data.creationDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </p>
              )}
              <Separator orientation="vertical" />
              <a
                href={`https://store.epicgames.com/u/${data.epicAccountId}?utm_source=egdata.app`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-gray-200"
              >
                <EGSIcon className="w-4 h-4" />
                <span>Epic Games Store</span>
                <ExternalLinkIcon className="size-3 display-inline-block" />
              </a>
            </div>
            <section
              id="profile-header-achievements"
              className="flex flex-row w-full items-start justify-start"
            >
              <div id="player-level" className="flex flex-col gap-2 w-fit min:w-[250px] mr-10">
                <SectionTitle title="Level" />
                <div className="flex flex-row gap-4 items-center mb-3 h-10">
                  <p className="text-4xl font-light inline-flex items-center gap-1">
                    <LevelIcon className="size-7 inline-block" />
                    {userLevel}
                  </p>
                  <Separator orientation="vertical" className="bg-white/25" />
                  <p className="text-4xl font-thin">{userTotalXP} XP</p>
                </div>
                <div className="flex flex-col gap-2 items-start">
                  <div className="w-full h-[6px] bg-gray-300/10 rounded-full">
                    <div
                      className="h-[6px] bg-white rounded-full"
                      style={{ width: `${percentToNextLevel}%` }}
                    />
                  </div>
                  <p className="text-sm font-light opacity-50">{xpToNextLevel} XP to next level</p>
                </div>
              </div>
              <div id="player-achievements-count" className="flex flex-col gap-2 w-[175px]">
                <SectionTitle title="Achievements" />
                <p className="text-3xl font-light inline-flex items-center gap-2">
                  <EpicTrophyIcon className="size-7 inline-block" />
                  {data.stats.totalAchievements}
                </p>
              </div>
              <div id="player-platinum-count" className="flex flex-col gap-2 w-[175px]">
                <SectionTitle title="Platinum" />
                <p className="text-3xl font-light inline-flex items-center gap-2">
                  <EpicPlatinumIcon
                    className={cn(
                      "size-7 inline-block",
                      data.stats.totalPlayerAwards > 0 ? "text-[#6e59e6]" : "",
                    )}
                  />
                  {data.stats.totalPlayerAwards}
                </p>
              </div>
              <div id="player-library" className="flex flex-col gap-2 w-[175px]">
                <Tooltip delayDuration={250}>
                  <TooltipTrigger className="w-fit">
                    <SectionTitle
                      title="Library"
                      classname="underline decoration-dotted underline-offset-4 cursor-help"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm font-light max-w-[250px]">
                      The library count only includes games that have achievements and that you've
                      launched at least once.
                    </p>
                  </TooltipContent>
                </Tooltip>

                <p className="text-3xl font-light inline-flex items-center gap-2">
                  <LayoutGridIcon className="size-7 inline-block" fill="currentColor" />
                  {data.stats.totalGames}
                </p>
              </div>
              <div id="player-reviews" className="flex flex-col gap-2 w-[175px]">
                <SectionTitle title="Reviews" />
                <p className="text-3xl font-light inline-flex items-center gap-2">
                  <MessageSquareQuoteIcon
                    className="size-7 inline-block"
                    stroke="transparent"
                    fill="currentColor"
                  />
                  {data.stats.reviewsCount}
                </p>
              </div>
            </section>
          </div>
          <div className="absolute top-0 right-0 inline-flex items-center justify-center gap-2 z-10">
            {!data.discord && userId === data.epicAccountId && (
              <a href={`${httpClient.axiosInstance.defaults.baseURL}/auth/discord/link`}>
                <Button variant="outline" className="bg-[#5865f2] hover:bg-[#4752c4]">
                  <DiscordIcon className="size-4" fill="white" />
                  <span>Link Discord</span>
                </Button>
              </a>
            )}
            <RefreshProfile id={data.epicAccountId} />
          </div>
        </section>
        <section className="mt-20 w-full">
          <Outlet />
        </section>
      </main>
    </TooltipProvider>
  );
}

function SectionTitle({ title, classname }: { title: string; classname?: string }) {
  return (
    <h2 className="text-xs uppercase font-light">
      <span className={cn("text-gray-300", classname)}>{title}</span>
    </h2>
  );
}

function BackgroundImage({ id }: { id: string }) {
  // @ts-ignore - sandbox exists in a lower level
  const { sandbox } = Route.useParams();
  const { data: offer, isLoading } = useQuery({
    queryKey: ["profile-background", { id, sandbox }],
    queryFn: () =>
      httpClient.get<SingleOffer>(`/profiles/${id}/random-game`, {
        params: { sandbox },
      }),
    placeholderData: keepPreviousData,
  });

  if (isLoading || !offer) return null;

  return (
    <div
      className="absolute inset-0 w-full"
      style={{
        zIndex: -10,
      }}
    >
      <span
        className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background rounded-md h-[50vh] w-full"
        style={{
          zIndex: -1,
        }}
      />
      <img
        src={getImage(offer.keyImages ?? [], ["DieselStoreFrontWide", "OfferImageWide"])?.url}
        alt={offer.id ?? ""}
        className="absolute inset-0 opacity-[0.25] z-0 w-full h-[50vh] transition-opacity duration-500 ease-in-out"
        loading="lazy"
        style={{
          zIndex: -2,
          objectFit: "cover",
          objectPosition: "top",
        }}
      />
    </div>
  );
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

export function PlayerName({ profile }: { profile: Profile }) {
  const isDonator = profile.donations.length > 0;

  if (isDonator) {
    return <DonatorName>{profile.displayName}</DonatorName>;
  }

  return <h1 className="text-6xl font-thin">{profile.displayName}</h1>;
}

function DonatorName({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative">
      <div
        className={cn(
          "absolute text-6xl font-thin",
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
          "absolute text-6xl font-thin",
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

      <h1 className={cn("relative z-[1] text-6xl font-thin text-white", className)}>{children}</h1>
    </div>
  );
}

function DonnorBadge({ profile }: { profile: Profile }) {
  const isDonator = profile.donations.length > 0;

  if (!isDonator) return null;

  return (
    <Tooltip>
      <TooltipTrigger className="absolute -top-0 -right-0 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 rounded-full p-1.5 shadow-lg">
        <CrownIcon className="w-5 h-5 text-white" />
      </TooltipTrigger>
      <TooltipContent
        className="flex flex-col gap-2 rounded-lg p-4 text-sm font-normal"
        side="right"
        sideOffset={10}
      >
        <p>
          {profile.displayName} has donated {profile.donations.length}{" "}
          {profile.donations.length === 1 ? "key" : "keys"} to egdata.app
        </p>
        <p className="gap-1 inline-flex items-center">
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
      <TooltipTrigger>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing || !refreshStatus?.canRefresh}
          className="inline-flex items-center justify-center gap-2"
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

      // Only refetch if we haven't already and the countdown is <= 0
      if (!hasRefetched && newCountdown <= 0) {
        setHasRefetched(true);
        refetch();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [target, refetch, hasRefetched, timezone]);

  // Reset hasRefetched when date changes
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
