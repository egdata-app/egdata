export const PROFILE_ID_WITH_ACHIEVEMENTS = "e2e-profile-with-achievements";
export const PROFILE_DISPLAY_NAME = "E2E Player";

const imageUrl = "https://cdn.example.test/profile-game.png";
const achievementIconUrl = "https://cdn.example.test/epic-achievements/e2e-achievement.png";

function v1Achievement(index) {
  return {
    name: `e2e-achievement-${index}`,
    unlockedDisplayName: `E2E Achievement ${index}`,
    lockedDisplayName: `E2E Achievement ${index}`,
    unlockedDescription: "A deterministic achievement for the profile E2E test.",
    lockedDescription: "A deterministic achievement for the profile E2E test.",
    unlockedIconLink: achievementIconUrl,
    lockedIconLink: achievementIconUrl,
    completedPercent: 4.2,
    xp: 25,
    sandboxId: "e2e-sandbox",
    unlocked: true,
    unlockDate: "2026-01-01T00:00:00.000Z",
    offer: {
      id: "e2e-offer",
      namespace: "e2e-sandbox",
      title: "E2E Game",
      keyImages: [],
    },
  };
}

function v1Game(index) {
  return {
    sandboxId: `e2e-sandbox-${index}`,
    totalUnlocked: 8,
    totalXP: 200,
    completionPercentage: 0.8,
    playerAwards:
      index === 1
        ? [
            {
              awardType: "PLATINUM",
              unlockedDateTime: "2026-01-01T00:00:00.000Z",
              achievementSetId: "e2e-set-1",
            },
          ]
        : [],
    baseOfferForSandbox: {
      id: `e2e-offer-${index}`,
      namespace: `e2e-sandbox-${index}`,
      keyImages: [
        {
          type: "DieselGameBoxWide",
          url: imageUrl,
          md5: "e2e",
        },
      ],
    },
    product: {
      name: `E2E Game ${index}`,
      slug: `e2e-game-${index}`,
    },
    productAchievements: {
      totalAchievements: 10,
      totalProductXP: 250,
    },
  };
}

export function createProfileApiResponse(url) {
  const pathname = url.pathname.replace(/^\/v1/, "");
  const prefix = `/profiles/${PROFILE_ID_WITH_ACHIEVEMENTS}`;
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const section = pathname.slice(prefix.length);

  if (section === "/information") {
    return {
      status: 200,
      body: {
        data: {
          epicAccountId: PROFILE_ID_WITH_ACHIEVEMENTS,
          displayName: PROFILE_DISPLAY_NAME,
          avatar: {
            small: imageUrl,
            medium: imageUrl,
            large: imageUrl,
          },
          linkedAccounts: [],
          creationDate: "2026-01-01T00:00:00.000Z",
          stats: {
            totalGames: 24,
            totalAchievements: 20,
            totalPlayerAwards: 1,
            totalXP: 300,
            reviewsCount: 0,
          },
          donations: [],
          discord: false,
        },
        meta: {},
      },
    };
  }

  if (section === "/rare-achievements") {
    return {
      status: 200,
      body: {
        data: [v1Achievement(1)],
        meta: {},
      },
    };
  }

  if (section === "/games") {
    const limit = Number(url.searchParams.get("limit") || "12");
    const cursor = url.searchParams.get("cursor");
    const page = cursor ? Number(cursor) || 1 : 1;
    const total = 24;
    const start = (page - 1) * limit;
    const count = Math.max(0, Math.min(limit, total - start));
    const hasMore = start + count < total;

    return {
      status: 200,
      body: {
        data: {
          achievements: Array.from({ length: count }, (_, index) => v1Game(start + index + 1)),
        },
        meta: {
          pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? String(page + 1) : null,
            total,
          },
        },
      },
    };
  }

  if (section === "/achievements") {
    const limit = Number(url.searchParams.get("limit") || "25");
    const cursor = url.searchParams.get("cursor");
    const page = cursor ? Number(cursor) || 1 : 1;
    const total = 25;
    const start = (page - 1) * limit;
    const count = Math.max(0, Math.min(limit, total - start));
    const hasMore = start + count < total;

    return {
      status: 200,
      body: {
        data: {
          achievements: Array.from({ length: count }, (_, index) =>
            v1Achievement(start + index + 1),
          ),
          count: total,
        },
        meta: {
          pagination: {
            limit,
            hasMore,
            nextCursor: hasMore ? String(page + 1) : null,
            total,
          },
        },
      },
    };
  }

  if (section === "/refresh-status") {
    return {
      status: 200,
      body: {
        canRefresh: false,
        remainingTime: 60,
      },
    };
  }

  return null;
}
