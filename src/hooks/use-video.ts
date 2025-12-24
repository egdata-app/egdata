import { VideoContext } from "@/contexts/offers-video";
import { useContext } from "react";

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo must be used within a VideoProvider");
  }
  return context;
};
