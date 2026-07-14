export const currentBuildId = "690761c7427fd5a4d36bd1e9";
export const previousBuildId = "68897f000000000000000001";
export const oldestBuildId = "68810d000000000000000001";

const manifest = (status = "verified") => ({
  status,
  canonicalHash: status === "verified" ? `canonical-${status}` : null,
  sourceHash: `source-${status}`,
  parserVersion: status === "verified" ? "1.0.10" : null,
  processedAt: status === "verified" ? "2026-07-01T10:00:00.000Z" : null,
  fileCount: status === "verified" ? 124 : null,
  fileBytes: status === "verified" ? 886_924_534 : null,
  errorCode: null,
});

const build = (id, version, firstSeenAt) => ({
  id,
  _id: id,
  appName: "LutoArtifact",
  buildVersion: version,
  labelName: "Live-Windows",
  platform: "Windows",
  hash: `hash-${id}`,
  firstSeenAt,
  lastSeenAt: firstSeenAt,
  createdAt: firstSeenAt,
  updatedAt: firstSeenAt,
  downloadSizeBytes: 9_100_000_000,
  installedSizeBytes: 19_572_719_616,
  technologies: [{ section: "Engine", technology: "Unreal Engine" }],
  manifest: manifest(),
});

export const currentBuild = build(
  currentBuildId,
  "BuildVersion-1.0.131025",
  "2026-07-01T10:00:00.000Z",
);
export const previousBuild = build(
  previousBuildId,
  "BuildVersion-1.0.290725",
  "2026-06-01T10:00:00.000Z",
);
export const oldestBuild = build(
  oldestBuildId,
  "BuildVersion-1.0.210725.2",
  "2026-05-01T10:00:00.000Z",
);
export const denseBuilds = Array.from({ length: 8 }, (_, index) =>
  build(
    `68820d0000000000000000${String(index + 10).padStart(2, "0")}`,
    `BuildVersion-1.0.220725.${index + 1}`,
    `2026-05-02T10:0${index}:00.000Z`,
  ),
);
export const unverifiedBuild = {
  ...build(
    "68830d000000000000000001",
    "BuildVersion-1.0.230725-unverified",
    "2026-05-03T10:00:00.000Z",
  ),
  manifest: manifest("unavailable"),
};
export const undatedBuild = {
  ...build("68840d000000000000000001", "BuildVersion-date-unknown", null),
  firstSeenAt: null,
  lastSeenAt: null,
};

const historyBuilds = [
  currentBuild,
  previousBuild,
  unverifiedBuild,
  ...denseBuilds,
  oldestBuild,
  undatedBuild,
];

export function createBuildPageResponse(url) {
  const path = url.pathname;
  const buildMatch = path.match(/^\/builds\/([^/]+)$/);
  if (buildMatch) return historyBuilds.find((entry) => entry.id === buildMatch[1]) ?? null;
  if (/^\/builds\/[^/]+\/items$/.test(path)) {
    return {
      data: [{ id: "luto", title: "Luto", keyImages: [], releaseInfo: [] }],
      page: 1,
      limit: 25,
      total: 1,
    };
  }
  const historyMatch = path.match(/^\/builds\/([^/]+)\/history$/);
  if (historyMatch) {
    const previousComparableBuildId =
      historyMatch[1] === currentBuildId
        ? previousBuildId
        : historyMatch[1] === previousBuildId
          ? oldestBuildId
          : null;
    return {
      data: historyBuilds.map((entry) => ({
        ...entry,
        comparable: entry.id !== unverifiedBuild.id,
        sameStream: true,
      })),
      previousComparableBuildId,
      page: 1,
      limit: 100,
      total: historyBuilds.length,
    };
  }
  if (/^\/builds\/[^/]+\/files$/.test(path)) {
    return {
      files: [],
      manifestStatus: "verified",
      page: 1,
      limit: 25,
      total: 0,
    };
  }
  const comparisonMatch = path.match(/^\/builds\/([^/]+)\/compare\/([^/]+)$/);
  if (comparisonMatch) {
    const target = historyBuilds.find((entry) => entry.id === comparisonMatch[1]) ?? currentBuild;
    const base = historyBuilds.find((entry) => entry.id === comparisonMatch[2]) ?? previousBuild;
    return {
      base,
      target,
      comparisonScope: "same_stream",
      summary: {
        files: { added: 1, modified: 1, removed: 1, unchanged: 121, total: 124 },
        fileBytes: {
          base: 100,
          target: 125,
          delta: 25,
          added: 40,
          removed: 20,
          modifiedBase: 10,
          modifiedTarget: 15,
        },
        installedSizeBytes: { base: 19_500_000_000, target: 19_572_719_616, delta: 72_719_616 },
        fullDownloadSizeBytes: { base: 9_000_000_000, target: 9_100_000_000, delta: 100_000_000 },
        technologies: { added: [], removed: [] },
        installTags: { added: [], removed: [] },
        topFiles: [],
        topDirectories: [],
      },
      changes: [
        {
          path: "Binaries/Game.exe",
          status: "modified",
          before: { fileName: "Binaries/Game.exe", fileHash: "old", fileSize: 10 },
          after: { fileName: "Binaries/Game.exe", fileHash: "new", fileSize: 15 },
          sizeDeltaBytes: 5,
        },
        {
          path: "Content/Added.pak",
          status: "added",
          before: null,
          after: { fileName: "Content/Added.pak", fileHash: "added", fileSize: 40 },
          sizeDeltaBytes: 40,
        },
        {
          path: "Content/Removed.pak",
          status: "removed",
          before: { fileName: "Content/Removed.pak", fileHash: "removed", fileSize: 20 },
          after: null,
          sizeDeltaBytes: -20,
        },
      ],
      warnings: [],
      page: 1,
      limit: 50,
      total: 3,
    };
  }
  return null;
}
