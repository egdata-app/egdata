import { useQuery } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import { httpClient } from "@/lib/http-client";
import { getImage } from "@/lib/getImage";
import { cn } from "@/lib/utils";
import type { Media } from "@/types/media";
import type { SingleOffer } from "@/types/single-offer";
import { GameFeatures } from "./features";
import { Image } from "./image";
import { useVideo } from "@/hooks/use-video";

export function OfferHero({ offer }: { offer: SingleOffer }) {
  const { data: media } = useQuery({
    queryKey: ["media", { id: offer.id }],
    queryFn: () => httpClient.get<Media>(`/offers/${offer.id}/media`),
    retry: false,
  });
  const { isHovered, setIsHovered, setCanvasRef } = useVideo();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const videoUrl = media?.videos?.[0]?.outputs
    .filter((output) => output.width !== undefined)
    .sort((a, b) => (b?.width ?? 0) - (a?.width ?? 0))[0]?.url;

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.src = videoUrl;
      videoRef.current.load();
    }
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      if (!isHovered) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isHovered]);

  useEffect(() => {
    if (localCanvasRef.current) {
      setCanvasRef(localCanvasRef);
    }
  }, [setCanvasRef]);

  useEffect(() => {
    let animationFrameId: number;

    const drawFrame = () => {
      if (videoRef.current && localCanvasRef.current) {
        const ctx = localCanvasRef.current.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            localCanvasRef.current.width,
            localCanvasRef.current.height,
          );
          ctx.filter = "blur(10px)"; // Apply blur effect
          ctx.drawImage(localCanvasRef.current, 0, 0);
        }
      }
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    if (isHovered && videoRef.current && localCanvasRef.current) {
      drawFrame();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isHovered]);

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setHoverTimeout(
      setTimeout(() => {
        setIsHovered(true);
      }, 150),
    );
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
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
            "rounded-xl shadow-lg transition-opacity duration-700 absolute inset-0 ease-in-out",
            isHovered ? "opacity-100" : "opacity-0",
          )}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          width={"100%"}
          height={"auto"}
          src={videoUrl}
          ref={videoRef}
        />
      )}
      <canvas ref={localCanvasRef} width={720} height={480} style={{ display: "none" }} />
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
          "rounded-xl shadow-lg transition-opacity duration-700 ease-in-out",
          videoUrl && isHovered ? "opacity-0" : "opacity-100",
        )}
        eager
        key={offer.id}
      />
      <GameFeatures id={offer.id} />
    </div>
  );
}
