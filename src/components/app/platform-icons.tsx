import {
  FaAmazon,
  FaAndroid,
  FaApple,
  FaDiscord,
  FaGoogle,
  FaHtml5,
  FaItchIo,
  FaLinux,
  FaPlaystation,
  FaSteam,
  FaWindows,
  FaXbox,
} from "react-icons/fa6";
import { SiGogdotcom, SiMacos, SiOculus, SiSamsung } from "react-icons/si";
import { BsNintendoSwitch } from "react-icons/bs";
import type { LinkedAccount } from "@/types/profiles";
import type { SingleItem } from "@/types/single-item";
import { createElement } from "react";

const linkedAccounts = [
  "amazon",
  "apple",
  "discord",
  "gog",
  "google",
  "itchio",
  "nintendo",
  "oculus",
  "psn",
  "steam",
  "xbl",
  "samsung",
];

export const platformIcons: Record<string, React.ReactNode> = {
  "9547": <FaWindows className="w-5 h-5 text-muted-foreground" />,
  "10719": <FaApple className="w-5 h-5 text-muted-foreground" />,
  "39071": <FaAndroid className="w-5 h-5 text-muted-foreground" />,
  "39070": <FaApple className="w-5 h-5 text-muted-foreground" />,
};

export const textPlatformIcons: Record<string, React.ReactNode> = {
  Windows: <FaWindows className="w-5 h-5 text-muted-foreground" />,
  Mac: <FaApple className="w-5 h-5 text-muted-foreground" />,
  Android: <FaAndroid className="w-5 h-5 text-muted-foreground" />,
  "SteamVR / HTC Vive": <FaSteam className="w-5 h-5 text-muted-foreground" />,
  Win32: <FaWindows className="w-5 h-5 text-muted-foreground" />,
  PS4: <FaPlaystation className="w-5 h-5 text-muted-foreground" />,
  "Gear VR": <FaSteam className="w-5 h-5 text-muted-foreground" />,
  HTML5: <FaHtml5 className="w-5 h-5 text-muted-foreground" />,
  Linux: <FaLinux className="w-5 h-5 text-muted-foreground" />,
  iOS: <FaApple className="w-5 h-5 text-muted-foreground" />,
};

const rawTextPlatformIcons = {
  Windows: FaWindows,
  Mac: SiMacos,
  Android: FaAndroid,
  "SteamVR / HTC Vive": FaSteam,
  Win32: FaWindows,
  PS4: FaPlaystation,
  "Gear VR": FaSteam,
  HTML5: FaHtml5,
  Linux: FaLinux,
  iOS: FaApple,
};

export function RenderTextPlatformIcon({
  platform,
  className,
  key,
}: {
  platform: string;
  className?: string;
  key?: string;
}) {
  return createElement(rawTextPlatformIcons[platform], {
    className,
    key,
  });
}

export const accountPlatformIcons: Record<string, React.ReactNode> = {
  amazon: <FaAmazon className="w-5 h-5 text-muted-foreground" />,
  apple: <FaApple className="w-5 h-5 text-muted-foreground" />,
  discord: <FaDiscord className="w-5 h-5 text-muted-foreground" />,
  gog: <SiGogdotcom className="w-5 h-5 text-muted-foreground" />,
  google: <FaGoogle className="w-5 h-5 text-muted-foreground" />,
  itchio: <FaItchIo className="w-5 h-5 text-muted-foreground" />,
  nintendo: <BsNintendoSwitch className="w-5 h-5 text-muted-foreground" />,
  oculus: <SiOculus className="w-5 h-5 text-muted-foreground" />,
  psn: <FaPlaystation className="w-5 h-5 text-muted-foreground" />,
  steam: <FaSteam className="w-5 h-5 text-muted-foreground" />,
  xbl: <FaXbox className="w-5 h-5 text-muted-foreground" />,
  samsung: <SiSamsung className="w-5 h-5 text-muted-foreground" />,
};

export const getPlatformsArray = (releaseInfo: SingleItem["releaseInfo"]): string[] => {
  const platforms = releaseInfo.flatMap((release) => release.platform);

  return Array.from(new Set(platforms));
};

export const getAccountIcon = (account: LinkedAccount): React.ReactNode | null => {
  if (!account) {
    return null;
  }

  const platform = account.identityProviderId.toLowerCase();

  if (linkedAccounts.includes(platform)) {
    return accountPlatformIcons[platform];
  }

  return null;
};
