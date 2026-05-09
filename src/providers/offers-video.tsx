import { VideoContext } from "@/contexts/offers-video";
import { type ReactNode, type RefObject, useState } from "react";

export const VideoProvider = ({ children }: { children: ReactNode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [videoRef, setVideoRef] = useState<RefObject<HTMLVideoElement | null> | null>(null);
  const [ambientColors, setAmbientColors] = useState<string[]>([]);

  return (
    <VideoContext.Provider
      value={{ isHovered, setIsHovered, videoRef, setVideoRef, ambientColors, setAmbientColors }}
    >
      {children}
    </VideoContext.Provider>
  );
};
