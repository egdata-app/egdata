import { VideoContext } from "@/contexts/offers-video";
import { type ReactNode, type RefObject, useState } from "react";

export const VideoProvider = ({ children }: { children: ReactNode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [canvasRef, setCanvasRef] = useState<RefObject<HTMLCanvasElement> | null>(null);

  return (
    <VideoContext.Provider value={{ isHovered, setIsHovered, canvasRef, setCanvasRef }}>
      {children}
    </VideoContext.Provider>
  );
};
