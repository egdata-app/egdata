export const PROFILE_ID_WITH_ACHIEVEMENTS = "e2e-profile-with-achievements";
export const PROFILE_DISPLAY_NAME = "E2E Player";

const imageUrl = "https://cdn.example.test/profile-game.png";
const achievementIconUrl = "https://cdn.example.test/epic-achievements/e2e-achievement.png";

function achievement(index) {
  return {
    name: `e2e-achievement-${index}`,
    displayName: `E2E Achievement ${index}`,
    description: "A deterministic achievement for the profile E2E test.",
    iconUrl: achievementIconUrl,
    rarityPercent: 4.2,
    xp: 25,
    sandboxId: "e2e-sandbox",
    gameTitle: "E2E Game",
    unlockedAt: "2026-01-01T00:00:00.000Z",
  };
}

function game(index) {
  return {
    sandboxId: `e2e-sandbox-${index}`,
    title: `E2E Game ${index}`,
    imageUrl,
    completionPercent: 80,
    unlocked: 8,
    total: 10,
    earnedXP: 200,
    totalXP: 250,
    hasPlatinum: index === 1,
    rarestAchievements: [achievement(index)],
  };
}

export function isProfilePageRequest(payload) {
  return (
    typeof payload?.query === "string" &&
    payload.query.includes("query ProfilePage") &&
    payload.variables?.id === PROFILE_ID_WITH_ACHIEVEMENTS
  );
}

export function createProfilePageResponse(variables) {
  const gameLimit = variables?.gameLimit ?? 12;
  const achievementLimit = variables?.achievementLimit ?? 25;

  return {
    data: {
      profile: {
        accountId: PROFILE_ID_WITH_ACHIEVEMENTS,
        displayName: PROFILE_DISPLAY_NAME,
        avatar: {
          small: imageUrl,
          medium: imageUrl,
          large: imageUrl,
        },
        linkedAccounts: [],
        creationDate: "2026-01-01T00:00:00.000Z",
        reviewsCount: 0,
        highlights: {
          level: 2,
          totalXP: 300,
          totalGames: 24,
          totalAchievements: 20,
          totalPlatinums: 1,
          reviewsCount: 0,
        },
        heroGame: {
          sandboxId: "e2e-sandbox-1",
          title: "E2E Game 1",
          imageUrl,
          completionPercent: 80,
        },
        featuredAchievements: [achievement(1)],
        featuredGames: [game(1)],
        recentActivity: [
          {
            type: "ACHIEVEMENT_UNLOCKED",
            sandboxId: "e2e-sandbox-1",
            gameTitle: "E2E Game 1",
            achievementName: "E2E Achievement 1",
            achievementIconUrl,
            occurredAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        games: {
          elements: Array.from({ length: gameLimit }, (_, index) => game(index + 1)),
          total: gameLimit * 2,
          page: variables?.gamePage ?? 1,
          limit: gameLimit,
        },
        achievements: {
          elements: Array.from({ length: achievementLimit }, (_, index) => achievement(index + 1)),
          total: achievementLimit,
          page: variables?.achievementPage ?? 1,
          limit: achievementLimit,
        },
      },
    },
  };
}
