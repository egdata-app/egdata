import { createContext, type RefObject } from "react";

interface VideoContextType {
  isHovered: boolean;
  setIsHovered: (hovered: boolean) => void;
  canvasRef: RefObject<HTMLCanvasElement | null> | null;
  setCanvasRef: (ref: RefObject<HTMLCanvasElement | null> | null) => void;
}

export const VideoContext = createContext<VideoContextType | undefined>(undefined);
