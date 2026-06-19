import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  getDefaultProfilePageVariables,
  PROFILE_ACTIVITY_LIMIT,
  PROFILE_LIBRARY_LIMIT,
  profilePageQueryOptions,
  type ProfileAchievement,
  type ProfileActivityItem,
  type ProfileGame,
  type ProfileGameFilter,
  type ProfileGameSort,
  type ProfilePageProfile,
} from "@/queries/profile-gql";
import { Image } from "@/components/app/image";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/aria/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/aria/tabs";
import { EpicTrophyIcon } from "@/components/icons/epic-trophy";
import { cn } from "@/lib/utils";
import { EpicPlatinumIcon } from "@/routes/profile/$id";
import {
  ActivityIcon,
  ArrowRightIcon,
  ClockIcon,
  FilterIcon,
  FlameIcon,
  Gamepad2Icon,
  MedalIcon,
  StarIcon,
  TrophyIcon,
} from "lucide-react";

const profileTabs = ["showcase", "library", "activity"] as const;
type ProfileTab = (typeof profileTabs)[number];

const searchFilters = ["all", "completed", "near-platinum", "in-progress", "platinum"] as const;
type SearchFilter = (typeof searchFilters)[number];

const searchSorts = ["completion", "alphabetical", "xp", "achievements"] as const;
type SearchSort = (typeof searchSorts)[number];

const profileParamsSchema = z.object({
  tab: z.enum(profileTabs).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  activityPage: z.coerce.number().int().min(1).optional().catch(undefined),
  filter: z.enum(searchFilters).optional().catch(undefined),
  sort: z.enum(searchSorts).optional().catch(undefined),
  platinum: z
    .preprocess((value) => {
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }, z.boolean().optional())
    .optional(),
});

type ProfileSearch = {
  tab?: ProfileTab;
  page?: number;
  activityPage?: number;
  filter?: SearchFilter;
  sort?: SearchSort;
};

type EffectiveProfileSearch = {
  tab: ProfileTab;
  page: number;
  activityPage: number;
  filter: SearchFilter;
  sort: SearchSort;
};

const filterToGraphQL: Record<SearchFilter, ProfileGameFilter> = {
  all: "ALL",
  completed: "COMPLETED",
  "near-platinum": "NEAR_PLATINUM",
  "in-progress": "IN_PROGRESS",
  platinum: "PLATINUM",
};

const sortToGraphQL: Record<SearchSort, ProfileGameSort> = {
  completion: "COMPLETION",
  alphabetical: "ALPHABETICAL",
  xp: "XP",
  achievements: "ACHIEVEMENTS",
};

const filterLabels: Record<SearchFilter, string> = {
  all: "All",
  completed: "Completed",
  "near-platinum": "Near Platinum",
  "in-progress": "In Progress",
  platinum: "Platinum",
};

const sortLabels: Record<SearchSort, string> = {
  completion: "Completion",
  alphabetical: "Alphabetical",
  xp: "XP",
  achievements: "Achievements",
};

export const Route = createFileRoute("/profile/$id/")({
  component: ProfileInformation,
  validateSearch: (search): ProfileSearch => {
    const parsed = profileParamsSchema.parse(search);
    const normalized: ProfileSearch = {};

    if (parsed.tab) normalized.tab = parsed.tab;
    if (parsed.page) normalized.page = parsed.page;
    if (parsed.activityPage) normalized.activityPage = parsed.activityPage;
    if (parsed.platinum) {
      normalized.filter = "platinum";
    } else if (parsed.filter) {
      normalized.filter = parsed.filter;
    }
    if (parsed.sort) normalized.sort = parsed.sort;

    return normalized;
  },
});

function ProfileInformation() {
  const { id } = Route.useParams();
  const rawSearch = Route.useSearch();
  const search = getEffectiveSearch(rawSearch);
  const navigate = Route.useNavigate();
  const variables = React.useMemo(
    () => ({
      ...getDefaultProfilePageVariables(id),
      gamePage: search.page,
      gameFilter: filterToGraphQL[search.filter],
      gameSort: sortToGraphQL[search.sort],
      achievementPage: search.activityPage,
    }),
    [id, search.activityPage, search.filter, search.page, search.sort],
  );
  const { data: profile, isLoading, isError } = useQuery(profilePageQueryOptions(variables));

  const updateSearch = (next: Partial<EffectiveProfileSearch>) => {
    navigate({
      search: (prev) => toSearchParams({ ...getEffectiveSearch(prev), ...next }),
    });
  };

  if (isLoading && !profile) {
    return <ProfileContentSkeleton />;
  }

  if (!profile || isError) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-center">
        <h2 className="text-xl font-semibold">Profile unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This profile could not be loaded right now.
        </p>
      </div>
    );
  }

  return (
    <Tabs
      value={search.tab}
      onValueChange={(tab) => updateSearch({ tab: tab as ProfileTab })}
      className="w-full"
    >
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="w-fit rounded-md bg-card p-1">
          <TabsTrigger value="showcase" className="rounded">
            Showcase
          </TabsTrigger>
          <TabsTrigger value="library" className="rounded">
            Library
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded">
            Activity
          </TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Gamepad2Icon className="size-4" />
            {profile.highlights?.totalGames ?? 0} games
          </span>
          <span className="inline-flex items-center gap-2">
            <EpicTrophyIcon className="size-4" />
            {profile.highlights?.totalAchievements ?? 0} achievements
          </span>
          <span className="inline-flex items-center gap-2">
            <EpicPlatinumIcon className="size-4 text-platinum-start" />
            {profile.highlights?.totalPlatinums ?? 0} platinum
          </span>
        </div>
      </div>

      <TabsContent value="showcase" className="mt-0">
        <ShowcaseView profile={profile} profileId={id} />
      </TabsContent>
      <TabsContent value="library" className="mt-0">
        <LibraryView
          profile={profile}
          profileId={id}
          search={search}
          onFilterChange={(filter) =>
            updateSearch({ tab: "library", page: 1, filter: filter as SearchFilter })
          }
          onSortChange={(sort) =>
            updateSearch({ tab: "library", page: 1, sort: sort as SearchSort })
          }
          onPageChange={(page) => updateSearch({ tab: "library", page })}
        />
      </TabsContent>
      <TabsContent value="activity" className="mt-0">
        <ActivityView
          profile={profile}
          profileId={id}
          onPageChange={(activityPage) => updateSearch({ tab: "activity", activityPage })}
        />
      </TabsContent>
    </Tabs>
  );
}

function ShowcaseView({ profile, profileId }: { profile: ProfilePageProfile; profileId: string }) {
  const featuredAchievements = compact(profile.featuredAchievements).slice(0, 8);
  const featuredGames = compact(profile.featuredGames).slice(0, 6);
  const recentActivity = compact(profile.recentActivity).slice(0, 6);
  const rarestAchievement = featuredAchievements[0];
  const strongestGame = featuredGames[0];
  const recentHighlight = recentActivity[0];

  return (
    <div className="space-y-10">
      <section className="grid gap-4 lg:grid-cols-3" aria-label="Profile showcase highlights">
        {rarestAchievement && (
          <AchievementSpotlight achievement={rarestAchievement} profileId={profileId} />
        )}
        {strongestGame && <GameSpotlight game={strongestGame} profileId={profileId} />}
        {recentHighlight && <ActivitySpotlight item={recentHighlight} profileId={profileId} />}
      </section>

      {featuredGames.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={<StarIcon className="size-5" />}
            title="Featured Games"
            detail={`${featuredGames.length} selected by profile performance`}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredGames.map((game) => (
              <ProfileGameCard
                key={game.sandboxId ?? game.title}
                game={game}
                profileId={profileId}
                featured
              />
            ))}
          </div>
        </section>
      )}

      {featuredAchievements.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={<MedalIcon className="size-5" />}
            title="Rare Achievements"
            detail="Hard-to-find unlocks across the profile"
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {featuredAchievements.map((achievement) => (
              <AchievementTile
                key={`${achievement.sandboxId}-${achievement.name}`}
                achievement={achievement}
                profileId={profileId}
              />
            ))}
          </div>
        </section>
      )}

      {recentActivity.length > 0 && (
        <section className="space-y-4">
          <SectionHeading
            icon={<ClockIcon className="size-5" />}
            title="Recent Unlocks"
            detail="Latest visible activity"
          />
          <ActivityList items={recentActivity} profileId={profileId} />
        </section>
      )}

      {featuredAchievements.length === 0 &&
        featuredGames.length === 0 &&
        recentActivity.length === 0 && (
          <EmptyState
            title="No showcase data yet"
            description="Only launched games with public achievement progress appear on profiles."
          />
        )}
    </div>
  );
}

function ProfileSandboxLink({
  profileId,
  sandboxId,
  className,
  children,
}: {
  profileId: string;
  sandboxId?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!sandboxId) {
    return (
      <div aria-disabled="true" className={cn(className, "cursor-default")}>
        {children}
      </div>
    );
  }

  return (
    <Link
      to="/profile/$id/achievements/$sandbox"
      params={{ id: profileId, sandbox: sandboxId }}
      className={className}
    >
      {children}
    </Link>
  );
}

function AchievementSpotlight({
  achievement,
  profileId,
}: {
  achievement: ProfileAchievement;
  profileId: string;
}) {
  return (
    <ProfileSandboxLink
      profileId={profileId}
      sandboxId={achievement.sandboxId}
      className="group flex min-h-56 flex-col justify-between overflow-hidden rounded-md border border-border bg-card p-5 transition-colors hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <FlameIcon className="size-4" />
            Rarest unlock
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight">
            {achievement.displayName ?? achievement.name}
          </h2>
        </div>
        <AchievementIcon achievement={achievement} className="size-20" />
      </div>
      <div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{achievement.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="truncate text-muted-foreground">{achievement.gameTitle}</span>
          <span className="shrink-0 font-medium text-text-primary">
            {formatRarity(achievement.rarityPercent)}
          </span>
        </div>
      </div>
    </ProfileSandboxLink>
  );
}

function GameSpotlight({ game, profileId }: { game: ProfileGame; profileId: string }) {
  return (
    <ProfileSandboxLink
      profileId={profileId}
      sandboxId={game.sandboxId}
      className="group relative min-h-56 overflow-hidden rounded-md border border-border bg-card p-5 transition-colors hover:bg-card/80"
    >
      {game.imageUrl && (
        <img
          src={game.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 egd-fade-to-canvas" />
      <div className="relative flex h-full min-h-48 flex-col justify-between">
        <p className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground">
          <Gamepad2Icon className="size-4" />
          Defining game
        </p>
        <div>
          <h2 className="text-2xl font-semibold leading-tight">{game.title}</h2>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-light">{Math.round(game.completionPercent ?? 0)}%</p>
              <p className="text-sm text-muted-foreground">
                {game.unlocked ?? 0} / {game.total ?? 0} achievements
              </p>
            </div>
            {game.hasPlatinum && (
              <span className="inline-flex items-center gap-2 rounded-md bg-platinum-start/25 px-3 py-2 text-sm text-text-primary">
                <EpicPlatinumIcon className="size-4" />
                Platinum
              </span>
            )}
          </div>
        </div>
      </div>
    </ProfileSandboxLink>
  );
}

function ActivitySpotlight({ item, profileId }: { item: ProfileActivityItem; profileId: string }) {
  return (
    <ProfileSandboxLink
      profileId={profileId}
      sandboxId={item.sandboxId}
      className="group flex min-h-56 flex-col justify-between rounded-md border border-border bg-card p-5 transition-colors hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <ActivityIcon className="size-4" />
            Latest activity
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight">
            {item.achievementName ?? activityTypeLabel(item.type)}
          </h2>
        </div>
        {item.achievementIconUrl ? (
          <div className="size-20 shrink-0 overflow-hidden rounded-md bg-primary/10">
            <Image
              src={item.achievementIconUrl}
              alt={item.achievementName ?? item.gameTitle ?? "Achievement"}
              width={80}
              height={80}
              quality="original"
              className="rounded-md"
            />
          </div>
        ) : (
          <div className="flex size-20 items-center justify-center rounded-md bg-primary/10">
            <TrophyIcon className="size-8" />
          </div>
        )}
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>{item.gameTitle}</p>
        <p>{formatDate(item.occurredAt)}</p>
      </div>
    </ProfileSandboxLink>
  );
}

function LibraryView({
  profile,
  profileId,
  search,
  onFilterChange,
  onSortChange,
  onPageChange,
}: {
  profile: ProfilePageProfile;
  profileId: string;
  search: EffectiveProfileSearch;
  onFilterChange: (filter: SearchFilter) => void;
  onSortChange: (sort: SearchSort) => void;
  onPageChange: (page: number) => void;
}) {
  const games = compact(profile.games?.elements);
  const totalPages = getTotalPages(
    profile.games?.total,
    profile.games?.limit ?? PROFILE_LIBRARY_LIMIT,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-md border border-border bg-card/50 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Library filter">
          {searchFilters.map((filter) => (
            <button
              type="button"
              key={filter}
              onClick={() => onFilterChange(filter)}
              className={cn(
                "rounded-md border px-3 py-2 text-sm transition-colors",
                search.filter === filter
                  ? "border-white bg-white text-black"
                  : "border-border bg-background text-muted-foreground hover:text-text-primary",
              )}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="size-4 text-muted-foreground" />
          <Select value={search.sort} onValueChange={(value) => onSortChange(value as SearchSort)}>
            <SelectTrigger className="w-[180px] rounded-md">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {searchSorts.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {sortLabels[sort]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {games.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <ProfileGameCard
                key={game.sandboxId ?? game.title}
                game={game}
                profileId={profileId}
              />
            ))}
          </div>
          <DynamicPagination
            currentPage={profile.games?.page ?? search.page}
            totalPages={totalPages}
            setPage={onPageChange}
          />
        </>
      ) : (
        <EmptyState
          title="No games found"
          description="Only launched games with achievements appear in this library."
        />
      )}
    </div>
  );
}

function ProfileGameCard({
  game,
  profileId,
  featured = false,
}: {
  game: ProfileGame;
  profileId: string;
  featured?: boolean;
}) {
  const rarestAchievements = compact(game.rarestAchievements).slice(0, 3);
  const completion = Math.round(game.completionPercent ?? 0);

  return (
    <ProfileSandboxLink
      profileId={profileId}
      sandboxId={game.sandboxId}
      className="group overflow-hidden rounded-md border border-border bg-card transition-colors hover:bg-card/80"
    >
      <div className="relative">
        <Image
          src={game.imageUrl ?? "/placeholder.webp"}
          alt={game.title ?? game.sandboxId ?? "Game"}
          width={640}
          height={360}
          className="transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
        />
        {game.hasPlatinum && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-md bg-platinum-start/90 px-2.5 py-1.5 text-xs font-medium text-text-primary">
            <EpicPlatinumIcon className="size-3.5" />
            Platinum
          </span>
        )}
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold">{game.title}</h3>
            <p className="text-sm text-muted-foreground">
              {game.earnedXP ?? 0} / {game.totalXP ?? 0} XP
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-light">{completion}%</p>
            <p className="text-xs text-muted-foreground">complete</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full rounded-full bg-white" style={{ width: `${completion}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {game.unlocked ?? 0} / {game.total ?? 0} achievements
            </span>
            {featured && <span>Featured</span>}
          </div>
        </div>
        {rarestAchievements.length > 0 && (
          <div className="flex items-center gap-2">
            {rarestAchievements.map((achievement) => (
              <AchievementIcon
                key={`${achievement.sandboxId}-${achievement.name}`}
                achievement={achievement}
                className="size-10"
              />
            ))}
            <span className="text-xs text-muted-foreground">Rare unlocks</span>
          </div>
        )}
      </div>
    </ProfileSandboxLink>
  );
}

function AchievementTile({
  achievement,
  profileId,
}: {
  achievement: ProfileAchievement;
  profileId: string;
}) {
  return (
    <ProfileSandboxLink
      profileId={profileId}
      sandboxId={achievement.sandboxId}
      className="flex gap-3 rounded-md border border-border bg-card p-3 transition-colors hover:bg-card/80"
    >
      <AchievementIcon achievement={achievement} className="size-14" />
      <div className="min-w-0">
        <h3 className="truncate font-medium">{achievement.displayName ?? achievement.name}</h3>
        <p className="truncate text-sm text-muted-foreground">{achievement.gameTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRarity(achievement.rarityPercent)} - {achievement.xp ?? 0} XP
        </p>
      </div>
    </ProfileSandboxLink>
  );
}

function ActivityView({
  profile,
  profileId,
  onPageChange,
}: {
  profile: ProfilePageProfile;
  profileId: string;
  onPageChange: (page: number) => void;
}) {
  const achievements = compact(profile.achievements?.elements);
  const totalPages = getTotalPages(
    profile.achievements?.total,
    profile.achievements?.limit ?? PROFILE_ACTIVITY_LIMIT,
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        icon={<ActivityIcon className="size-5" />}
        title="Activity"
        detail={`${profile.achievements?.total ?? achievements.length} achievement unlocks`}
      />
      {achievements.length > 0 ? (
        <>
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <AchievementActivity
                key={`${achievement.sandboxId}-${achievement.name}-${achievement.unlockedAt}`}
                achievement={achievement}
                profileId={profileId}
              />
            ))}
          </div>
          <DynamicPagination
            currentPage={profile.achievements?.page ?? 1}
            totalPages={totalPages}
            setPage={onPageChange}
          />
        </>
      ) : (
        <EmptyState
          title="No activity yet"
          description="Achievement unlocks will appear here when this profile has public progress."
        />
      )}
    </div>
  );
}

function AchievementActivity({
  achievement,
  profileId,
}: {
  achievement: ProfileAchievement;
  profileId: string;
}) {
  return (
    <ProfileSandboxLink
      profileId={profileId}
      sandboxId={achievement.sandboxId}
      className="flex items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:bg-card/80"
    >
      <AchievementIcon achievement={achievement} className="size-16" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="truncate text-lg font-semibold">
            {achievement.displayName ?? achievement.name}
          </h3>
          <span className="text-sm text-muted-foreground">
            {formatDate(achievement.unlockedAt)}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{achievement.gameTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRarity(achievement.rarityPercent)} - {achievement.xp ?? 0} XP
        </p>
      </div>
      <ArrowRightIcon className="hidden size-5 text-muted-foreground sm:block" />
    </ProfileSandboxLink>
  );
}

function ActivityList({ items, profileId }: { items: ProfileActivityItem[]; profileId: string }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <ProfileSandboxLink
          key={`${item.sandboxId}-${item.occurredAt}-${item.achievementName}`}
          profileId={profileId}
          sandboxId={item.sandboxId}
          className="flex items-center gap-4 rounded-md border border-border bg-card p-4 transition-colors hover:bg-card/80"
        >
          {item.achievementIconUrl ? (
            <div className="size-[72px] shrink-0 overflow-hidden rounded-md bg-primary/10">
              <Image
                src={item.achievementIconUrl}
                alt={item.achievementName ?? item.gameTitle ?? "Achievement"}
                width={72}
                height={72}
                quality="original"
                className="rounded-md"
              />
            </div>
          ) : (
            <div className="flex size-[72px] shrink-0 items-center justify-center rounded-md bg-primary/10">
              <TrophyIcon className="size-7" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground">
              {activityTypeLabel(item.type)}
            </p>
            <h3 className="truncate font-medium">{item.achievementName ?? item.gameTitle}</h3>
            <p className="truncate text-sm text-muted-foreground">{item.gameTitle}</p>
            <p className="text-xs text-muted-foreground">{formatDate(item.occurredAt)}</p>
          </div>
        </ProfileSandboxLink>
      ))}
    </div>
  );
}

function AchievementIcon({
  achievement,
  className,
}: {
  achievement: ProfileAchievement;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-md bg-primary/10", className)}>
      <Image
        src={achievement.iconUrl ?? "/placeholder.webp"}
        alt={achievement.displayName ?? achievement.name ?? "Achievement"}
        width={128}
        height={128}
        quality="original"
        className="rounded-md"
      />
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="inline-flex items-center gap-2 text-2xl font-semibold">
        {icon}
        {title}
      </h2>
      {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card/50 p-8 text-center">
      <TrophyIcon className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-3 text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ProfileContentSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-80 max-w-full animate-pulse rounded-md bg-primary/10" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <div key={index} className="h-72 animate-pulse rounded-md bg-primary/10" />
        ))}
      </div>
    </div>
  );
}

function compact<T>(items: readonly (T | null | undefined)[] | null | undefined): T[] {
  return (items ?? []).filter((item): item is T => item != null);
}

function getEffectiveSearch(search: ProfileSearch): EffectiveProfileSearch {
  return {
    tab: search.tab ?? "showcase",
    page: search.page ?? 1,
    activityPage: search.activityPage ?? 1,
    filter: search.filter ?? "all",
    sort: search.sort ?? "completion",
  };
}

function toSearchParams(search: EffectiveProfileSearch): ProfileSearch {
  return {
    tab: search.tab === "showcase" ? undefined : search.tab,
    page: search.page === 1 ? undefined : search.page,
    activityPage: search.activityPage === 1 ? undefined : search.activityPage,
    filter: search.filter === "all" ? undefined : search.filter,
    sort: search.sort === "completion" ? undefined : search.sort,
  };
}

function getTotalPages(total: number | null | undefined, limit: number | null | undefined) {
  return Math.max(1, Math.ceil((total ?? 0) / Math.max(1, limit ?? 1)));
}

function formatRarity(value: number | null | undefined) {
  if (value == null) return "Unknown rarity";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}% rarity`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function activityTypeLabel(type: ProfileActivityItem["type"] | null | undefined) {
  if (type === "PLATINUM_EARNED") return "Platinum earned";
  return "Achievement unlocked";
}
