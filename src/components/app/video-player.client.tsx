import type { Media } from "@/types/media";
import { MediaPlayer, type MediaPlayerInstance, MediaProvider, Poster } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import { useLocalStorage } from "@uidotdev/usehooks";
import type { SingleOffer } from "@/types/single-offer";
import { useEffect, useRef } from "react";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  /**
   * Video to play from Epic Games API
   */
  video: Media["videos"][0];
  /**
   * Offer linked to the video
   */
  offer: SingleOffer;
  /**
   * Force a specific thumbnail
   */
  thumbnail?: string;
  /**
   * Classes to apply to the parent div
   */
  className?: string;
  /**
   * Pause the video is not in the viewport
   * @default false
   */
  pauseWhenInactive?: boolean;
}

export function Player({
  video,
  offer,
  className,
  thumbnail,
  pauseWhenInactive,
}: VideoPlayerProps) {
  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "-250px",
  });
  const player = useRef<MediaPlayerInstance>(null);

  const manifests = video.outputs.filter((output) => output.contentType === "application/dash+xml");
  const images = video.outputs.filter((output) => output.contentType.startsWith("image/"));

  useEffect(() => {
    if (!player.current) return;

    // If the video is not in the viewport, pause it
    if (pauseWhenInactive && !entry?.isIntersecting) {
      player.current.pause();
    }
  }, [entry?.isIntersecting, pauseWhenInactive]);

  return (
    <div className={cn("w-full max-w-[640px] mx-auto", className)} ref={ref}>
      <MediaPlayer
        ref={player}
        className="w-full bg-slate-900 text-white font-sans overflow-hidden rounded-md ring-media-focus data-[focus]:ring-4"
        title={offer.title}
        src={manifests[0]?.url.replace(
          "media-cdn.epicgames.com",
          "epic-dash-proxy.snpm.workers.dev",
        )}
        poster={images[0]?.url}
        viewType="video"
        streamType="on-demand"
        playsInline
        volume={0.05}
      >
        <MediaProvider>
          <Poster className="vds-poster" src={thumbnail} />
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
}
