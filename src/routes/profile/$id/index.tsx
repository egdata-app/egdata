import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { httpClient } from "@/lib/http-client";
import type { Achievement } from "@/queries/offer-achievements";
import { dehydrate, HydrationBoundary, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { SingleOffer } from "@/types/single-offer";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/profiles";
import { Image } from "@/components/app/image";
import { getImage } from "@/lib/get-image";
import { EpicPlatinumIcon } from "../$id";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ArrowUpIcon } from "lucide-react";
import { FlippableCard, raritiesTextColors } from "@/components/app/achievement-card";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { getRarity } from "@/lib/get-rarity";
import { getUserGames } from "@/queries/profiles";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type RareAchievement = Achievement & {
  unlocked: boolean;
  unlockDate: string;
  sandboxId: string;
  offer: SingleOffer;
};

const profileParamsSchema = z.object({
  page: z.number().catch(1),
  platinum: z.boolean().optional(),
  sort: z.enum(["completion", "alphabetical", "xp", "achievements"]).optional(),
});

export const Route = createFileRoute("/profile/$id/")({
  component: ProfileInformation,

  loader: async ({ params, context }) => {
    const { queryClient } = context;

    await queryClient.prefetchQuery({
      queryKey: ["player-rarest-achievements", { id: params.id }],
      queryFn: () => httpClient.get<Achievement[]>(`/profiles/${params.id}/rare-achievements`),
    });

    return {
      id: params.id,
    };
  },

  validateSearch: (search) => profileParamsSchema.parse(search),
});

function ProfileInformation() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [activeTab, setActiveTab] = React.useState("overview");
  const [underlineStyle, setUnderlineStyle] = React.useState({});
  const tabRefs = React.useRef({});

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "achievements", label: "Achievements" },
  ];

  React.useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      setUnderlineStyle({
        left: `${activeTabElement.offsetLeft}px`,
        width: `${activeTabElement.offsetWidth}px`,
      });
    }
  }, [activeTab]);

  const handleSortChange = (sort: "completion" | "alphabetical" | "xp" | "achievements") => {
    navigate({
      search: {
        ...search,
        sort,
      },
    });
  };

  return (
    <div className=" p-4 rounded-lg">
      <div className="flex border-b border-gray-700 relative">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            className={cn(
              "px-4 py-2 font-medium text-sm focus:outline-none",
              activeTab === tab.id ? "text-white" : "text-gray-400 hover:text-gray-200",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <div
          className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out"
          style={underlineStyle}
        />
        <div className="absolute right-0 -top-1 inline-flex gap-2">
          <div className="flex items-center justify-center gap-3">
            <Checkbox
              id="only-platinum"
              defaultChecked={search.platinum}
              onCheckedChange={(checked) => {
                navigate({
                  search: {
                    ...search,
                    platinum: checked === "indeterminate" ? undefined : checked,
                  },
                });
              }}
            />
            <div className="grid gap-2">
              <Label htmlFor="only-platinum">Only show platinum achievements</Label>
            </div>
          </div>
          <Select value={search.sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completion">Completion</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="xp">XP</SelectItem>
              <SelectItem value="achievements">Achievements</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4">
        {activeTab === "overview" && <AchievementsOverview />}

        {activeTab === "achievements" && <AchievementsTimeline />}
      </div>
    </div>
  );
}

function GameAchievementsSummary({ game }: { game: Profile["achievements"]["data"][0] }) {
  const { id } = Route.useLoaderData();
  return (
    <Link
      className="flex hover:bg-card/25 bg-card text-white p-2 rounded-lg overflow-hidden transition-all duration-300 ease-in-out w-full gap-4"
      to="/profile/$id/achievements/$sandbox"
      params={{
        id,
        sandbox: game.sandboxId,
      }}
    >
      <div className="w-1/4">
        <Image
          src={
            getImage(game.baseOfferForSandbox?.keyImages ?? [], [
              "DieselStoreFrontWide",
              "OfferImageWide",
              "DieselGameBoxWide",
              "TakeoverWide",
            ])?.url ?? "/placeholder.webp"
          }
          alt={game.product.name ?? game.sandboxId}
          width={650}
          height={400}
          className="rounded-md"
        />
      </div>
      <div className="w-2/4">
        <h2 className="text-2xl font-bold mb-2">{game.product.name}</h2>
        <div className="flex flex-row gap-4">
          <div className="flex items-start flex-col gap-2">
            <p className="text-sm text-gray-400">Achievements Progress</p>
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 font-normal text-lg">
                <span className="text-white flex flex-row items-center gap-1">
                  {game.playerAwards?.length > 0 && (
                    <EpicPlatinumIcon className="w-4 h-4 text-[#6e59e6]" />
                  )}
                  {(
                    (game.totalUnlocked /
                      (game.productAchievements?.totalAchievements ?? game.totalUnlocked)) *
                    100
                  ).toFixed(0)}
                  %
                </span>
                <span className="text-gray-500">|</span>
                <span className="text-white">
                  {game.totalUnlocked} /{" "}
                  {game.productAchievements?.totalAchievements ?? game.totalUnlocked} achievements
                </span>
              </span>
              <div className="w-full h-[6px] bg-gray-300/10 rounded-full">
                <div
                  className="h-[6px] bg-white rounded-full"
                  style={{
                    width: `${(game.totalUnlocked / (game.productAchievements?.totalAchievements ?? game.totalUnlocked)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-start flex-col gap-2">
            <p className="text-sm text-gray-400">Total XP Earned</p>
            <div className="flex flex-col gap-2">
              <span className="text-sm inline-flex items-center gap-2">
                <span className="text-white font-semibold text-lg">
                  {game.totalXP} / {game.productAchievements?.totalProductXP} XP
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="w-1/4">
        <SandboxRareAchievements id={id} sandbox={game.sandboxId} />
      </div>
    </Link>
  );
}

function GameAchievementsSummarySkeleton() {
  return (
    <div className="flex flex-row gap-4 items-center bg-card px-4 py-6 rounded-lg w-full select-none h-60">
      <Skeleton className="w-1/4" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  );
}

function SandboxRareAchievements({ id, sandbox }: { id: string; sandbox: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["sandbox:rarest-achievements", { id, sandbox }],
    queryFn: () =>
      httpClient.get<RareAchievement[]>(`/profiles/${id}/rare-achievements/${sandbox}`),
  });

  if (isLoading) return null;

  if (!data) return null;

  if (data.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 h-full">
        <h6 className="text-sm font-thin text-gray-300">Rarest Achievements</h6>
        <div className="flex gap-2 flex-col h-full justify-between">
          {data.slice(0, 3).map((achievement) => (
            <div key={achievement.name} className="flex flex-row gap-2">
              <div className="size-12 rounded-md flex-shrink-0">
                <Image
                  src={achievement.unlockedIconLink}
                  alt={achievement.name}
                  width={124}
                  height={124}
                  className="rounded-md size-16"
                  quality="original"
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-base font-light truncate">{achievement.unlockedDisplayName}</p>
                <p className="text-sm font-thin text-gray-300">
                  {achievement.completedPercent}% of players unlocked
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RarestAchievements() {
  const { id } = Route.useLoaderData();
  const [api, setApi] = React.useState<CarouselApi>();
  const { data } = useQuery({
    queryKey: ["player-rarest-achievements", { id }],
    queryFn: () => httpClient.get<RareAchievement[]>(`/profiles/${id}/rare-achievements`),
  });

  if (!data) {
    return null;
  }

  const handlePreviousSlide = () => {
    api?.scrollPrev();
  };

  const handleNextSlide = () => {
    api?.scrollNext();
  };

  return (
    <section className="flex flex-col gap-4 mt-4 mb-10">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-xl font-medium">Rarest Achievements</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousSlide}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card text-muted-foreground hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-300/50 disabled:opacity-50"
            type="button"
          >
            <ArrowUpIcon className="w-5 h-5 transform -rotate-90" />
          </button>
          <button
            onClick={handleNextSlide}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card text-muted-foreground hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-300/50 disabled:opacity-50"
            type="button"
          >
            <ArrowUpIcon className="w-5 h-5 transform rotate-90" />
          </button>
        </div>
      </div>
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {data.map((achievement) => (
            <CarouselItem key={achievement.name} className="md:basis-1/2 lg:basis-1/3">
              <RareAchievement achievement={achievement} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

function RareAchievement({ achievement }: { achievement: RareAchievement }) {
  return (
    <div className="flex flex-row gap-4 items-center bg-card px-4 py-6 rounded-lg w-full select-none">
      <img
        src={achievement.unlockedIconLink}
        alt={achievement.name}
        className="size-24 rounded-md"
      />
      <div className="flex flex-col gap-2">
        <h6 className="text-sm font-normal text-gray-400">
          {achievement.offer?.title ?? "Unknown"}
        </h6>
        <h3 className="text-lg font-semibold">{achievement.unlockedDisplayName}</h3>
        <div className="flex flex-row gap-2 h-5">
          <p className="text-sm font-thin">{achievement.completedPercent}% of players unlocked</p>
          <Separator orientation="vertical" className="bg-white/25" />
          <p className="text-sm text-gray-400 inline-flex items-center gap-2">
            {achievement.xp} XP
            <EpicTrophyIcon
              className={cn("w-4 h-4 inline-block", raritiesTextColors[getRarity(achievement.xp)])}
            />
          </p>
        </div>
      </div>
    </div>
  );
}

type PlayerLatestAchievements = {
  achievements: (Achievement & {
    offer: SingleOffer;
  })[];
  count: number;
  limit: number;
  page: number;
};

function AchievementsTimeline() {
  const { id } = Route.useLoaderData();

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["profile:latest-achievements", { id }],
    queryFn: ({ pageParam = 1 }) =>
      httpClient.get<PlayerLatestAchievements>(`/profiles/${id}/achievements`, {
        params: {
          limit: 25,
          page: pageParam,
        },
      }),
    getNextPageParam: (lastPage: PlayerLatestAchievements) => {
      const totalPages = lastPage.count / lastPage.limit;
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const achievements = data.pages.flatMap((page) => page.achievements);

  return (
    <div className="flex flex-col items-start justify-start h-full space-y-4 p-4">
      <h1 className="text-2xl font-bold mb-4">Achievements Timeline</h1>
      <section className="flex flex-col gap-4 w-full">
        {achievements.map((achievement) => (
          <SingleAchievement
            key={`${achievement.name}-${achievement.offer.namespace}`}
            achievement={achievement}
          />
        ))}
        {hasNextPage && (
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-4 w-fit mx-auto"
            variant="outline"
          >
            {isFetchingNextPage ? "Loading more..." : "Load More"}
          </Button>
        )}
      </section>
    </div>
  );
}

function SingleAchievement({ achievement }: { achievement: Achievement & { offer: SingleOffer } }) {
  const { id } = Route.useLoaderData();
  return (
    <div className="flex flex-row gap-4 w-full h-full">
      <Link
        className="max-w-72 w-full h-full cursor-pointer"
        to="/profile/$id/achievements/$sandbox"
        params={{
          id,
          sandbox: achievement.offer.namespace,
        }}
      >
        <FlippableCard
          achievement={achievement}
          flipAll={false}
          flipped={false}
          onCardFlip={() => {}}
          index={0}
          blur={false}
        />
      </Link>
      <div
        className="flex flex-col gap-4 w-full h-72 bg-opacity-20 rounded-md p-4 relative"
        style={{
          backgroundImage: `url(${getImage(achievement.offer.keyImages, ["DieselGameBoxWide", "DieselStoreFrontWide", "OfferImageWide"])?.url ?? "/placeholder.webp"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-card/95 to-card z-0 rounded-md" />
        <div className="flex flex-col gap-2 h-full z-10">
          <h6 className="text-4xl">{achievement.offer.title}</h6>
          <p className="text-lg text-gray-200 font-thin">
            {new Date(achievement.unlockDate).toLocaleDateString("en-UK", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

function AchievementsOverview() {
  const { id } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { page } = search;
  const {
    data: games,
    isError,
    isLoading,
  } = useQuery({
    queryKey: [
      "profile-games",
      { id, limit: 20, page, platinum: search.platinum, sort: search.sort },
    ],
    queryFn: () => getUserGames(id as string, page, 20, search.platinum, search.sort),
  });

  if (isError && !games) {
    return <div>Error</div>;
  }

  const handlePageChange = (newPage: number) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate({
      search: (prevState) => {
        return {
          ...prevState,
          page: newPage,
        };
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <RarestAchievements />
      <div className="flex items-center flex-col gap-4">
        {games?.achievements.map((achievement) => (
          <GameAchievementsSummary
            key={achievement.sandboxId}
            // @ts-expect-error
            game={achievement}
          />
        ))}
        {isLoading &&
          Array.from({ length: 10 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: loader
            <GameAchievementsSummarySkeleton key={i} />
          ))}
      </div>
      <DynamicPagination
        currentPage={games?.pagination.page ?? 1}
        setPage={handlePageChange}
        totalPages={games?.pagination.totalPages ?? 1}
      />
    </div>
  );
}
