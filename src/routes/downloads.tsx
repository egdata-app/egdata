import { GithubIcon } from "@/components/icons/github";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/aria/card";
import { type DetectedOS, useOSDetection } from "@/hooks/use-os-detection";
import { cn } from "@/lib/utils";
import { getGithubReleases } from "@/queries/github-releases";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, AppleIcon, CheckCircleIcon, DownloadIcon, File } from "lucide-react";
import { FaLinux, FaWindows } from "react-icons/fa6";
import { DataPanel, EmptyState, PageShell } from "@/components/app/design-system";

type ReleaseAsset = {
  id: number;
  name: string;
  download_url: string;
  size: number;
};

type AssetInfo = {
  platform: "Windows" | "macOS" | "Linux" | "Other";
  variant: string;
  icon: React.ReactNode;
  description: string;
};

type VariantGroup = {
  variant: string;
  description: string;
  assets: ReleaseAsset[];
};

type PlatformGroup = {
  platform: "Windows" | "macOS" | "Linux" | "Other";
  icon: React.ReactNode;
  variants: Record<string, VariantGroup>;
};

const getAssetInfo = (assetName: string): AssetInfo => {
  const lowerCaseName = assetName.toLowerCase();

  // macOS
  if (
    lowerCaseName.includes("mac") ||
    lowerCaseName.includes("darwin") ||
    lowerCaseName.includes(".dmg")
  ) {
    if (lowerCaseName.includes("arm64") || lowerCaseName.includes("aarch64")) {
      return {
        platform: "macOS",
        variant: "Apple Silicon",
        icon: <AppleIcon className="h-6 w-6 text-text-muted" />,
        description: "For newer Mac computers with Apple chips (M1, M2, M3, etc.).",
      };
    }
    if (
      lowerCaseName.includes("intel") ||
      lowerCaseName.includes("x64") ||
      lowerCaseName.includes("x86_64")
    ) {
      return {
        platform: "macOS",
        variant: "Intel",
        icon: <AppleIcon className="h-6 w-6 text-text-muted" />,
        description: "For older Mac computers with Intel processors.",
      };
    }
    return {
      platform: "macOS",
      variant: "Universal",
      icon: <AppleIcon className="h-6 w-6 text-text-muted" />,
      description: "Compatible with both Apple Silicon and Intel Macs.",
    };
  }

  // Windows
  if (lowerCaseName.endsWith(".msi")) {
    return {
      platform: "Windows",
      variant: ".msi Installer",
      icon: <FaWindows className="h-6 w-6 text-text-muted" />,
      description: "A standard installer wizard. Recommended for most users.",
    };
  }
  if (lowerCaseName.endsWith(".exe")) {
    return {
      platform: "Windows",
      variant: ".exe Installer",
      icon: <FaWindows className="h-6 w-6 text-text-muted" />,
      description: "A standalone application file. May not require installation.",
    };
  }

  // Linux
  if (
    lowerCaseName.includes("linux") ||
    lowerCaseName.includes(".deb") ||
    lowerCaseName.includes(".rpm") ||
    lowerCaseName.includes(".appimage")
  ) {
    return {
      platform: "Linux",
      variant: "Generic",
      icon: <FaLinux className="h-6 w-6 text-text-muted" />,
      description: "For Linux-based operating systems.",
    };
  }

  return {
    platform: "Other",
    variant: "File",
    icon: <File className="h-6 w-6 text-text-muted" />,
    description: "A generic file or source code.",
  };
};

function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(2)].map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
        <Card key={i} className="bg-surface-panel border-stroke-subtle">
          <CardHeader>
            <div className="h-6 w-3/5 bg-surface-hover rounded-md" />
            <div className="h-4 w-2/5 bg-surface-hover rounded-md mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Skeleton for one platform */}
            <div className="p-4 rounded-lg bg-surface-panel">
              <div className="h-5 w-1/3 bg-surface-hover rounded-md mb-4" />
              <ul className="space-y-2">
                <li className="flex items-center justify-between p-3 bg-card rounded-md">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-5 w-5 bg-surface-hover rounded-md" />
                    <div className="h-5 w-4/5 bg-surface-hover rounded-md" />
                  </div>
                </li>
                <li className="flex items-center justify-between p-3 bg-card rounded-md">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-5 w-5 bg-surface-hover rounded-md" />
                    <div className="h-5 w-3/5 bg-surface-hover rounded-md" />
                  </div>
                </li>
              </ul>
            </div>
            {/* Skeleton for another platform */}
            <div className="p-4 rounded-lg bg-surface-panel">
              <div className="h-5 w-1/4 bg-surface-hover rounded-md mb-4" />
              <ul className="space-y-2">
                <li className="flex items-center justify-between p-3 bg-card rounded-md">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-5 w-5 bg-surface-hover rounded-md" />
                    <div className="h-5 w-1/2 bg-surface-hover rounded-md" />
                  </div>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/downloads")({
  component: RouteComponent,
});

function RouteComponent() {
  const detectedOS = useOSDetection();
  const {
    data,
    error,
    isLoading: loading,
  } = useQuery({
    queryKey: ["githubReleases"],
    queryFn: getGithubReleases,
  });

  if (error) {
    return (
      <PageShell>
        <EmptyState title="Unable to load releases">{error.message}</EmptyState>
      </PageShell>
    );
  }

  if (data && "error" in data) {
    return (
      <PageShell>
        <EmptyState title="Unable to load releases">{data.error}</EmptyState>
      </PageShell>
    );
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
  };

  const isVariantRecommended = (platform: string, variant: string, detected: DetectedOS) => {
    if (platform !== detected.os) return false;
    if (platform === "macOS") {
      if (variant === "Universal") return true;
      const hasConfidentArchDetection = !!(window.navigator as any).userAgentData?.architecture;
      if (!hasConfidentArchDetection) return false;
      return variant.includes(detected.arch);
    }
    if (platform === "Windows") {
      return variant.includes(".msi");
    }
    return true;
  };

  return (
    <PageShell className="max-w-3xl">
      <DataPanel
        title={
          <div className="flex items-center gap-3 mb-2">
            <GithubIcon className="w-8 h-8 text-text-secondary" />
            <span className="text-2xl text-text-primary">egdata.app Client Releases</span>
          </div>
        }
        description={
          <span>
            Download the latest version. We've highlighted the recommended section for your
            operating system.
          </span>
        }
      >
          {loading && <SkeletonLoader />}
          {error && (
            <div className="flex items-center gap-3 rounded-md border border-danger/50 bg-danger-muted p-4 text-danger">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {data && !loading && !error && data.length > 0 && (
            <div className="space-y-8">
              {data.map((release) => {
                const groupedByPlatform = release.assets.reduce(
                  (acc, asset) => {
                    const info = getAssetInfo(asset.name);
                    if (!acc[info.platform]) {
                      acc[info.platform] = {
                        platform: info.platform,
                        icon: info.icon,
                        variants: {},
                      };
                    }
                    if (!acc[info.platform].variants[info.variant]) {
                      acc[info.platform].variants[info.variant] = {
                        variant: info.variant,
                        description: info.description,
                        assets: [],
                      };
                    }
                    acc[info.platform].variants[info.variant].assets.push(asset);
                    return acc;
                  },
                  {} as Record<string, PlatformGroup>,
                );

                const sortedPlatforms = Object.values(groupedByPlatform).sort((a, b) => {
                  const aIsRecommended = a.platform === detectedOS.os;
                  const bIsRecommended = b.platform === detectedOS.os;
                  if (aIsRecommended && !bIsRecommended) return -1;
                  if (!aIsRecommended && bIsRecommended) return 1;
                  return 0;
                });

                return (
                  <Card key={release.id} className="bg-surface-panel border-stroke-subtle">
                    <CardHeader>
                      <CardTitle className="text-lg text-text-secondary">
                        {release.name || release.tag_name}
                      </CardTitle>
                      <CardDescription className="text-text-muted">
                        Version {release.tag_name} - Published on{" "}
                        {new Date(release.published_at).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {sortedPlatforms.map((platformGroup) => {
                        const isPlatformRecommended = platformGroup.platform === detectedOS.os;
                        const sortedVariants = Object.values(platformGroup.variants).sort(
                          (a, b) => {
                            const aIsRecommended = isVariantRecommended(
                              platformGroup.platform,
                              a.variant,
                              detectedOS,
                            );
                            const bIsRecommended = isVariantRecommended(
                              platformGroup.platform,
                              b.variant,
                              detectedOS,
                            );
                            if (aIsRecommended && !bIsRecommended) return -1;
                            if (!aIsRecommended && bIsRecommended) return 1;
                            return 0;
                          },
                        );

                        return (
                          <div
                            key={platformGroup.platform}
                            className={cn(
                              "rounded-lg border p-4 transition-all",
                              isPlatformRecommended
                                ? "border-interactive/50 bg-interactive-muted"
                                : "border-transparent",
                            )}
                          >
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2.5 text-text-secondary">
                              {platformGroup.icon}
                              <span>{platformGroup.platform} Downloads</span>
                            </h3>
                            <div className="space-y-4 pl-2 border-l-2 border-stroke-subtle ml-3">
                              {sortedVariants.map((variantGroup) => {
                                const recommended = isVariantRecommended(
                                  platformGroup.platform,
                                  variantGroup.variant,
                                  detectedOS,
                                );
                                return (
                                  <div
                                    key={variantGroup.variant}
                                    className={cn(
                                      "p-4 rounded-lg transition-all",
                                      recommended
                                        ? "border border-interactive/50 bg-interactive-muted"
                                        : "bg-surface-panel",
                                    )}
                                  >
                                    <h4 className="font-semibold mb-1 flex items-center gap-2 text-md text-text-secondary">
                                      <span>{variantGroup.variant}</span>
                                      {recommended && (
                                        <span className="flex items-center gap-1.5 rounded-full bg-interactive-muted px-2 py-1 text-xs font-medium text-interactive">
                                          <CheckCircleIcon className="h-3.5 w-3.5" />
                                          Recommended
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-sm text-text-muted mb-3">
                                      {variantGroup.description}
                                    </p>
                                    <ul className="space-y-2">
                                      {variantGroup.assets.map((asset) => (
                                        <li key={asset.id}>
                                          <a
                                            href={asset.download_url}
                                            download
                                            className="flex items-center justify-between p-3 bg-card rounded-md hover:bg-surface-panel transition-colors group"
                                          >
                                            <div className="flex items-center gap-3">
                                              <DownloadIcon className="w-5 h-5 text-interactive" />
                                              <span className="font-medium text-text-secondary">
                                                {asset.name}
                                              </span>
                                            </div>
                                            <span className="text-sm text-text-muted group-hover:text-text-secondary">
                                              {formatBytes(asset.size)}
                                            </span>
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {!loading && !error && data && data.length === 0 && (
            <div className="p-10 text-center text-text-subtle">
              <p>No public releases found.</p>
            </div>
          )}
      </DataPanel>
    </PageShell>
  );
}
