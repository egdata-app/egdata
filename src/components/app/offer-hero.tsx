import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { extractDominantVideoColors } from "@/lib/ambient-colors";
import { httpClient } from "@/lib/http-client";
import { getImage } from "@/lib/getImage";
import { cn } from "@/lib/utils";
import type { Media } from "@/types/media";
import type { SingleOffer } from "@/types/single-offer";
import { GameFeatures } from "./features";
import { Image } from "./image";
import { useVideo } from "@/hooks/use-video";

const HOVER_DELAY_MS = 150;
const AMBIENT_SAMPLE_INTERVAL_MS = 900;
const MAX_HOVER_VIDEO_WIDTH = 720;

const canUseHoverPreview = () => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
};

const getHoverVideoUrl = (media?: Media) => {
  const outputs = media?.videos?.[0]?.outputs ?? [];
  const usableOutputs = outputs.filter(
    (output) =>
      output.url &&
      typeof output.width === "number" &&
      !output.contentType.startsWith("image/") &&
      output.contentType !== "application/dash+xml",
  );
  const playableOutputs = usableOutputs.filter((output) => {
    const url = output.url.toLowerCase().split("?")[0];

    return output.contentType.startsWith("video/") || url.endsWith(".mp4");
  });
  const candidates = playableOutputs.length ? playableOutputs : usableOutputs;
  const sorted = [...candidates].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const atOrBelowTarget = sorted.filter((output) => (output.width ?? 0) <= MAX_HOVER_VIDEO_WIDTH);

  return (atOrBelowTarget.at(-1) ?? sorted[0])?.url;
};

export function OfferHero({ offer }: { offer: SingleOffer }) {
  const { data: media } = useQuery({
    queryKey: ["media", { id: offer.id }],
    queryFn: () => httpClient.get<Media>(`/offers/${offer.id}/media`),
    retry: false,
  });
  const { isHovered, setIsHovered, setVideoRef, setAmbientColors } = useVideo();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoUrl = getHoverVideoUrl(media);

  useEffect(() => {
    setVideoRef(videoRef);

    return () => {
      setVideoRef(null);
    };
  }, [setVideoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.crossOrigin = "anonymous";

    if (video.src !== videoUrl) {
      video.src = videoUrl;
      video.load();
    }
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isHovered) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      setIsHovered(false);
    });
  }, [isHovered, setIsHovered]);

  useEffect(() => {
    if (!isHovered) {
      setAmbientColors([]);
      return;
    }

    const video = videoRef.current;
    if (!video || !canUseHoverPreview()) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let samplingBlocked = false;
    const canvas = sampleCanvasRef.current ?? document.createElement("canvas");
    sampleCanvasRef.current = canvas;

    const sampleColors = () => {
      if (samplingBlocked || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      try {
        const colors = extractDominantVideoColors(video, canvas);

        if (colors.length) {
          setAmbientColors(colors);
        }
      } catch {
        samplingBlocked = true;
        setAmbientColors([]);

        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    const startSampling = () => {
      sampleColors();
      intervalId = setInterval(sampleColors, AMBIENT_SAMPLE_INTERVAL_MS);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      startSampling();
    } else {
      video.addEventListener("loadeddata", startSampling, { once: true });
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }

      video.removeEventListener("loadeddata", startSampling);
      setAmbientColors([]);
    };
  }, [isHovered, setAmbientColors, videoUrl]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      setIsHovered(false);
      setAmbientColors([]);
    };
  }, [setAmbientColors, setIsHovered]);

  const clearHoverTimeout = () => {
    if (!hoverTimeoutRef.current) return;

    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
  };

  const handleMouseEnter = () => {
    if (!videoUrl || !canUseHoverPreview()) return;

    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      hoverTimeoutRef.current = null;
    }, HOVER_DELAY_MS);
  };

  const handleMouseLeave = () => {
    clearHoverTimeout();
    setIsHovered(false);
  };

  const isFabItem = offer.customAttributes.FabListingId;

  return (
    <div
      className="relative w-full h-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {videoUrl && (
        <video
          className={cn(
            "rounded-lg shadow-raised transition-opacity duration-700 absolute inset-0 ease-in-out w-full h-full object-cover",
            isHovered ? "opacity-100" : "opacity-0",
          )}
          loop
          muted
          playsInline
          controls={false}
          preload="metadata"
          crossOrigin="anonymous"
          width={"100%"}
          height={"auto"}
          ref={videoRef}
        />
      )}
      <Image
        src={
          getImage(offer.keyImages, [
            "DieselStoreFrontWide",
            "OfferImageWide",
            "DieselGameBoxWide",
            "TakeoverWide",
            isFabItem ? "Screenshot" : undefined,
          ])?.url ?? "https://cdn.egdata.app/placeholder-1080.webp"
        }
        alt={offer.title}
        quality="high"
        width={720}
        height={400}
        className={cn(
          "rounded-lg shadow-raised transition-opacity duration-700 ease-in-out",
          videoUrl && isHovered ? "opacity-0" : "opacity-100",
        )}
        eager
        key={offer.id}
      />
      <GameFeatures id={offer.id} />
    </div>
  );
}
