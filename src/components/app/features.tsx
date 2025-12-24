import { useEffect, useState } from "react";
import { FaCloud, FaHandshake, FaMedal, FaTrophy, FaPeopleGroup } from "react-icons/fa6";
import { IoGameController, IoWifiOutline } from "react-icons/io5";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EpicGamesIcon } from "../icons/epic";
import { EaIcon } from "../icons/ea";
import { UbisoftIcon } from "../icons/ubisoft";
import { httpClient } from "@/lib/http-client";
import { useQuery } from "@tanstack/react-query";

interface OfferFeatures {
  launcher: "epic" | "ea" | "ubisoft";
  features: string[];
  epicFeatures: string[];
}

type FeaturesSizes = "xs" | "sm" | "md" | "lg" | "xl";

export function GameFeatures({ id, size = "md" }: { id: string; size?: FeaturesSizes }) {
  const [offerFeatures, setOfferFeatures] = useState<OfferFeatures | null>(null);

  useEffect(() => {
    httpClient
      .get<OfferFeatures>(`/offers/${id}/features`)
      .then((response) => {
        setOfferFeatures(response);
      })
      .catch((error) => {
        console.error(error);
        return null;
      });
  }, [id]);

  if (!offerFeatures) return null;

  const launcher = getLauncher(offerFeatures?.launcher || "");
  const features = gameFeatures(offerFeatures?.features || []);
  const storeFeatures = epicFeatures(offerFeatures?.epicFeatures || []);

  if (!launcher && features.length === 0 && storeFeatures.length === 0) {
    return null;
  }

  return (
    <div className="w-full justify-center items-center flex absolute bottom-3 right-0 left-0 px-2">
      <div className="h-auto flex flex-wrap gap-3 w-fit max-w-full bg-gray-500/30 py-2 px-6 rounded-xl justify-center items-center text-white backdrop-blur-sm">
        {launcher && (
          <TooltipProvider>
            <Tooltip delayDuration={50}>
              <TooltipTrigger>{launcher.icon}</TooltipTrigger>
              <TooltipContent>
                <div className="text-center">{launcher.name}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {storeFeatures.map((feature) => (
          <TooltipProvider key={feature.key}>
            <Tooltip delayDuration={50}>
              <TooltipTrigger>{feature.icon}</TooltipTrigger>
              <TooltipContent>
                <div className="text-center">{feature.text}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {features.map((feature) => (
          <TooltipProvider key={feature.key}>
            <Tooltip delayDuration={50}>
              <TooltipTrigger>{feature.icon}</TooltipTrigger>
              <TooltipContent>
                <div className="text-center">{feature.text}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

const getLauncher = (launcher: string): { name: string; icon: JSX.Element } | null => {
  switch (launcher) {
    case "epic":
      return null;

    case "ea":
      return {
        name: "EA App",
        icon: <EaIcon />,
      };

    case "ubisoft":
      return {
        name: "Ubisoft Connect",
        icon: <UbisoftIcon />,
      };

    default:
      return null;
  }
};

const gameFeatures = (features: string[]) => {
  const items: { icon: JSX.Element; text: string; key: string }[] = [];

  for (const feature of features) {
    switch (feature) {
      case "Single Player":
        items.push({
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>
          ),
          text: "Single Player",
          key: "single-player",
        });
        break;

      case "Co-op":
        items.push({
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-1.01.75.75 0 0 0 .42-.643 4.875 4.875 0 0 0-6.957-4.611 8.586 8.586 0 0 1 1.71 5.157v.003Z" />
            </svg>
          ),
          text: "Co-op",
          key: "co-op",
        });
        break;
      case "Online Multiplayer":
        items.push({
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M21.721 12.752a9.711 9.711 0 0 0-.945-5.003 12.754 12.754 0 0 1-4.339 2.708 18.991 18.991 0 0 1-.214 4.772 17.165 17.165 0 0 0 5.498-2.477ZM14.634 15.55a17.324 17.324 0 0 0 .332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 0 0 .332 4.647 17.385 17.385 0 0 0 5.268 0ZM9.772 17.119a18.963 18.963 0 0 0 4.456 0A17.182 17.182 0 0 1 12 21.724a17.18 17.18 0 0 1-2.228-4.605ZM7.777 15.23a18.87 18.87 0 0 1-.214-4.774 12.753 12.753 0 0 1-4.34-2.708 9.711 9.711 0 0 0-.944 5.004 17.165 17.165 0 0 0 5.498 2.477ZM21.356 14.752a9.765 9.765 0 0 1-7.478 6.817 18.64 18.64 0 0 0 1.988-4.718 18.627 18.627 0 0 0 5.49-2.098ZM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 0 0 1.988 4.718 9.765 9.765 0 0 1-7.478-6.816ZM13.878 2.43a9.755 9.755 0 0 1 6.116 3.986 11.267 11.267 0 0 1-3.746 2.504 18.63 18.63 0 0 0-2.37-6.49ZM12 2.276a17.152 17.152 0 0 1 2.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0 1 12 2.276ZM10.122 2.43a18.629 18.629 0 0 0-2.37 6.49 11.266 11.266 0 0 1-3.746-2.504 9.754 9.754 0 0 1 6.116-3.985Z" />
            </svg>
          ),
          text: "Online Multiplayer",
          key: "online-multiplayer",
        });
        break;
      case "Competitive":
        items.push({
          icon: <FaMedal />,
          text: "Competitive",
          key: "competitive",
        });
        break;
      case "Controller Support":
        items.push({
          icon: <IoGameController />,
          text: "Controller Support",
          key: "controller-support",
        });
        break;
      case "Cross Platform":
        items.push({
          icon: <FaHandshake />,
          text: "Cross Platform",
          key: "cross-platform",
        });
        break;
      case "Local Multiplayer":
        items.push({
          icon: <IoWifiOutline />,
          text: "Local Multiplayer",
          key: "local-multiplayer",
        });
        break;
      case "Multiplayer":
        items.push({
          icon: <FaPeopleGroup />,
          text: "Multiplayer",
          key: "multiplayer",
        });
        break;
      default:
        break;
    }
  }

  return items;
};

const epicFeatures = (features: string[]) => {
  const items: { icon: JSX.Element; text: string; key: string }[] = [];

  for (const feature of features) {
    switch (feature) {
      case "Achievements":
        items.push({
          icon: <FaTrophy />,
          text: "Achievements",
          key: "achievements",
        });
        break;
      case "Cloud Saves":
        items.push({
          icon: <FaCloud />,
          text: "Cloud Saves",
          key: "cloud-saves",
        });
        break;
      case "Epic Online Services":
        items.push({
          icon: <EpicGamesIcon className="size-4" />,
          text: "Epic Online Services",
          key: "eos",
        });
        break;

      default:
        break;
    }
  }

  return items;
};

/**
 * Same as GameFeatures but with a different layout
 * Each icon is in it's own bubble, no absolute positioning
 */
export function GameFeaturesV2({ id }: { id: string }) {
  const { data: offerFeatures } = useQuery({
    queryKey: ["offer-features", { id }],
    queryFn: () => httpClient.get<OfferFeatures>(`/offers/${id}/features`),
  });

  const launcher = getLauncher(offerFeatures?.launcher || "");
  const features = gameFeatures(offerFeatures?.features || []);
  const storeFeatures = epicFeatures(offerFeatures?.epicFeatures || []);

  if (!launcher && features.length === 0 && storeFeatures.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-row gap-2 w-full justify-start items-center">
      {launcher && (
        <TooltipProvider>
          <Tooltip delayDuration={50}>
            <TooltipTrigger className="bg-gray-400/25 rounded-full p-2 text-center">
              {launcher.icon}
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">{launcher.name}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {storeFeatures.map((feature) => (
        <TooltipProvider key={feature.key}>
          <Tooltip delayDuration={50}>
            <TooltipTrigger className="bg-gray-400/25 rounded-full p-2 text-center">
              {feature.icon}
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">{feature.text}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {features.map((feature) => (
        <TooltipProvider key={feature.key}>
          <Tooltip delayDuration={50}>
            <TooltipTrigger className="bg-gray-400/25 rounded-full p-2 text-center">
              {feature.icon}
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">{feature.text}</div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
