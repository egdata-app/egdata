import { createContext, type RefObject } from "react";

interface VideoContextType {
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  videoRef: RefObject<HTMLVideoElement | null> | null;
  setVideoRef: (ref: RefObject<HTMLVideoElement | null> | null) => void;
  ambientColors: string[];
  setAmbientColors: (colors: string[]) => void;
}

export const VideoContext = createContext<VideoContextType | undefined>(undefined);
