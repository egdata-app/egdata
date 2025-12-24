import { GithubIcon } from "@/components/icons/github";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type DetectedOS, useOSDetection } from "@/hooks/use-os-detection";
import { cn } from "@/lib/utils";
import { getGithubReleases } from "@/queries/github-releases";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, AppleIcon, CheckCircleIcon, DownloadIcon, File } from "lucide-react";
import { FaLinux, FaWindows } from "react-icons/fa6";

type ReleaseAsset = {
  id: number;
  name: string;
  download_url: string;
  size: number;
};

type Release = {
  id: number;
  tag_name: string;
  name: string;
  published_at: string;
  assets: ReleaseAsset[];
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
        icon: <AppleIcon className="h-6 w-6 text-slate-400" />,
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
        icon: <AppleIcon className="h-6 w-6 text-slate-400" />,
        description: "For older Mac computers with Intel processors.",
      };
    }
    return {
      platform: "macOS",
      variant: "Universal",
      icon: <AppleIcon className="h-6 w-6 text-slate-400" />,
      description: "Compatible with both Apple Silicon and Intel Macs.",
    };
  }

  // Windows
  if (lowerCaseName.endsWith(".msi")) {
    return {
      platform: "Windows",
      variant: ".msi Installer",
      icon: <FaWindows className="h-6 w-6 text-slate-400" />,
      description: "A standard installer wizard. Recommended for most users.",
    };
  }
  if (lowerCaseName.endsWith(".exe")) {
    return {
      platform: "Windows",
      variant: ".exe Installer",
      icon: <FaWindows className="h-6 w-6 text-slate-400" />,
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
      icon: <FaLinux className="h-6 w-6 text-slate-400" />,
      description: "For Linux-based operating systems.",
    };
  }

  return {
    platform: "Other",
    variant: "File",
    icon: <File className="h-6 w-6 text-slate-400" />,
    description: "A generic file or source code.",
  };
};

function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      {[...Array(2)].map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
        <Card key={i} className="bg-slate-800/50 border-slate-800">
          <CardHeader>
            <div className="h-6 w-3/5 bg-slate-700 rounded-md" />
            <div className="h-4 w-2/5 bg-slate-700 rounded-md mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Skeleton for one platform */}
            <div className="p-4 rounded-lg bg-slate-800/30">
              <div className="h-5 w-1/3 bg-slate-700 rounded-md mb-4" />
              <ul className="space-y-2">
                <li className="flex items-center justify-between p-3 bg-card rounded-md">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-5 w-5 bg-slate-700 rounded-md" />
                    <div className="h-5 w-4/5 bg-slate-700 rounded-md" />
                  </div>
                </li>
                <li className="flex items-center justify-between p-3 bg-card rounded-md">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-5 w-5 bg-slate-700 rounded-md" />
                    <div className="h-5 w-3/5 bg-slate-700 rounded-md" />
                  </div>
                </li>
              </ul>
            </div>
            {/* Skeleton for another platform */}
            <div className="p-4 rounded-lg bg-slate-800/30">
              <div className="h-5 w-1/4 bg-slate-700 rounded-md mb-4" />
              <ul className="space-y-2">
                <li className="flex items-center justify-between p-3 bg-card rounded-md">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-5 w-5 bg-slate-700 rounded-md" />
                    <div className="h-5 w-1/2 bg-slate-700 rounded-md" />
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
    return <div>Error: {error.message}</div>;
  }

  if (data && "error" in data) {
    return <div>Error: {data.error}</div>;
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
    <div className="w-full max-w-2xl mx-auto">
      <Card className="w-full bg-card border-slate-800 shadow-2xl shadow-slate-950/50">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <GithubIcon className="w-8 h-8 text-slate-300" />
            <CardTitle className="text-2xl text-slate-50">egdata.app Client Releases</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Download the latest version. We've highlighted the recommended section for your
            operating system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <SkeletonLoader />}
          {error && (
            <div className="flex items-center gap-3 text-red-400 bg-red-950/50 border border-red-900 p-4 rounded-md">
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
                  <Card key={release.id} className="bg-slate-800/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-200">
                        {release.name || release.tag_name}
                      </CardTitle>
                      <CardDescription className="text-slate-400">
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
                                ? "border-sky-700/50 bg-sky-950/20"
                                : "border-transparent",
                            )}
                          >
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2.5 text-slate-300">
                              {platformGroup.icon}
                              <span>{platformGroup.platform} Downloads</span>
                            </h3>
                            <div className="space-y-4 pl-2 border-l-2 border-slate-700/50 ml-3">
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
                                        ? "bg-sky-950/30 border border-sky-700/50"
                                        : "bg-slate-800/30",
                                    )}
                                  >
                                    <h4 className="font-semibold mb-1 flex items-center gap-2 text-md text-slate-300">
                                      <span>{variantGroup.variant}</span>
                                      {recommended && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium bg-sky-500/10 text-sky-400 px-2 py-1 rounded-full">
                                          <CheckCircleIcon className="h-3.5 w-3.5" />
                                          Recommended
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-sm text-slate-400 mb-3">
                                      {variantGroup.description}
                                    </p>
                                    <ul className="space-y-2">
                                      {variantGroup.assets.map((asset) => (
                                        <li key={asset.id}>
                                          <a
                                            href={asset.download_url}
                                            download
                                            className="flex items-center justify-between p-3 bg-card rounded-md hover:bg-slate-800/80 transition-colors group"
                                          >
                                            <div className="flex items-center gap-3">
                                              <DownloadIcon className="w-5 h-5 text-sky-400" />
                                              <span className="font-medium text-slate-200">
                                                {asset.name}
                                              </span>
                                            </div>
                                            <span className="text-sm text-slate-400 group-hover:text-slate-300">
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
            <div className="text-center p-10 text-slate-500">
              <p>No public releases found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
