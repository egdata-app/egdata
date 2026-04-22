import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useVideo } from "@/hooks/use-video";
import { useMatches } from "@tanstack/react-router";
import { getImage } from "@/lib/get-image";
import type { SingleOffer } from "@/types/single-offer";

export function GlobalBackground() {
  const { isHovered, canvasRef } = useVideo();
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const matches = useMatches();

  // Find the deepest offer route with loader data
  const offerMatch = matches.findLast(
    (m) =>
      m.routeId.startsWith("/offers/$id") &&
      m.loaderData &&
      (m.loaderData as { offer?: SingleOffer }).offer,
  );

  const offer = offerMatch?.loaderData as { offer?: SingleOffer } | undefined;
  const keyImages = offer?.offer?.keyImages;

  const src = keyImages
    ? getImage(keyImages, [
        "DieselStoreFrontWide",
        "OfferImageWide",
        "DieselGameBoxWide",
        "TakeoverWide",
      ])?.url ?? "/placeholder.webp"
    : null;

  useEffect(() => {
    let animationFrameId: number;

    const drawFrame = () => {
      const canvas = localCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas && canvasRef?.current) {
        ctx.drawImage(canvasRef.current, 0, 0, canvas.width, canvas.height);
        ctx.filter = "blur(1px)";
        ctx.drawImage(canvas, 0, 0);
      }
      animationFrameId = requestAnimationFrame(drawFrame);
    };

    if (isHovered && canvasRef?.current) {
      drawFrame();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isHovered, canvasRef]);

  if (!src) return null;

  return (
    <>
      <div
        className={cn(
          "fade-in absolute inset-0 overflow-hidden -z-10 pointer-events-none",
          "transition-opacity duration-1000 ease-in-out",
          isHovered ? "opacity-0" : "opacity-100",
        )}
        style={{
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
        }}
      >
        <div
          className={cn(
            "w-full h-[700px] bg-no-repeat bg-cover bg-center blur-3xl bg-black/40",
            "filter brightness-[0.15]",
          )}
          style={{ backgroundImage: `url(${src})` }}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 overflow-hidden -z-10 pointer-events-none",
          "transition-opacity duration-1000 ease-in-out",
          isHovered ? "opacity-50" : "opacity-0",
        )}
        style={{
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
        }}
      >
        <canvas
          ref={localCanvasRef}
          className="w-full h-[700px] filter brightness-[0.30] blur-3xl"
          width={720}
          height={480}
        />
      </div>
    </>
  );
}
