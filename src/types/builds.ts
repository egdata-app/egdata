export type ManifestStatus =
  | "processing"
  | "verified"
  | "invalid"
  | "unavailable"
  | "failed"
  | "legacy_unverified";

export interface ManifestHealth {
  status: ManifestStatus;
  canonicalHash: string | null;
  sourceHash: string;
  parserVersion: string | null;
  processedAt: string | null;
  fileCount: number | null;
  fileBytes: number | null;
  errorCode: string | null;
}

export interface SingleBuild {
  id: string;
  _id: string;
  appName: string;
  labelName: string;
  platform: string;
  buildVersion: string;
  hash: string;
  downloadSizeBytes: number | null;
  installedSizeBytes: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  technologies: Technology[];
  manifest: ManifestHealth;
}

export interface BuildFiles {
  files: File[];
  manifestStatus: ManifestStatus;
  page: number;
  limit: number;
  total: number;
}

export interface File {
  _id: string;
  manifestHash: string;
  manifestId?: string;
  appName: string;
  buildVersion: string;
  appLabel: string;
  fileName: string;
  symlinkTarget: string;
  fileHash: string;
  fileMetaFlags: number;
  installTags: string[];
  fileSize: number;
  mimeType: string;
  depth: number;
}

export interface BuildInstallOptions {
  [key: string]: { files: number; size: number };
}

export interface Build {
  id?: string;
  _id: string;
  appName: string;
  labelName: string;
  platform?: string;
  buildVersion: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
  downloadSizeBytes?: number | null;
  installedSizeBytes?: number | null;
  technologies?: Technology[];
  manifest?: ManifestHealth;
}

export interface Technology {
  section: string;
  technology: string;
}

export interface BuildHistoryEntry extends SingleBuild {
  comparable: boolean;
  sameStream: boolean;
}

export interface BuildHistoryResponse {
  data: BuildHistoryEntry[];
  previousComparableBuildId: string | null;
  page: number;
  limit: number;
  total: number;
}

export interface BuildFileSnapshot {
  fileName: string;
  fileHash: string;
  fileSize: number;
  mimeType?: string;
  installTags?: string[];
  symlinkTarget?: string;
  fileMetaFlags?: number;
}

export type BuildFileChangeStatus = "added" | "removed" | "modified" | "unchanged";

export interface BuildFileChange {
  path: string;
  status: BuildFileChangeStatus;
  before: BuildFileSnapshot | null;
  after: BuildFileSnapshot | null;
  sizeDeltaBytes: number;
}

interface ByteComparison {
  base: number | null;
  target: number | null;
  delta: number | null;
}

export interface BuildComparisonResponse {
  base: SingleBuild;
  target: SingleBuild;
  comparisonScope: "same_stream" | "cross_stream";
  summary: {
    files: Record<BuildFileChangeStatus, number> & { total: number };
    fileBytes: {
      base: number;
      target: number;
      delta: number;
      added: number;
      removed: number;
      modifiedBase: number;
      modifiedTarget: number;
    };
    installedSizeBytes: ByteComparison;
    fullDownloadSizeBytes: ByteComparison;
    technologies: { added: Technology[]; removed: Technology[] };
    installTags: { added: string[]; removed: string[] };
    topFiles: BuildFileChange[];
    topDirectories: Array<{ path: string; sizeDeltaBytes: number }>;
  };
  changes: BuildFileChange[];
  warnings: string[];
  page: number;
  limit: number;
  total: number;
}
