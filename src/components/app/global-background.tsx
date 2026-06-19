import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useVideo } from "@/hooks/use-video";
import { useMatches } from "@tanstack/react-router";
import { getImage } from "@/lib/get-image";
import type { SingleOffer } from "@/types/single-offer";

const AMBIENT_MORPH_DURATION_MS = 900;

type AmbientStyle = CSSProperties & {
  "--ambient-primary": string;
  "--ambient-secondary": string;
  "--ambient-tertiary": string;
  "--ambient-quaternary": string;
};

const AMBIENT_BACKGROUND = [
  "linear-gradient(180deg, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.74))",
  "radial-gradient(circle at 18% 28%, var(--ambient-primary) 0, transparent 38%)",
  "radial-gradient(circle at 78% 20%, var(--ambient-secondary) 0, transparent 36%)",
  "radial-gradient(circle at 48% 64%, var(--ambient-tertiary) 0, transparent 48%)",
  "radial-gradient(circle at 88% 78%, var(--ambient-quaternary) 0, transparent 38%)",
].join(", ");

const withAlpha = (color: string, alpha: number) =>
  color.replace(/^rgb\((.+)\)$/, `rgba($1, ${alpha})`);

const buildAmbientStyle = (colors: string[]): AmbientStyle | undefined => {
  const [primary, secondary = primary, tertiary = secondary, quaternary = tertiary] = colors;

  if (!primary) return undefined;

  return {
    "--ambient-primary": withAlpha(primary, 0.9),
    "--ambient-secondary": withAlpha(secondary, 0.78),
    "--ambient-tertiary": withAlpha(tertiary, 0.74),
    "--ambient-quaternary": withAlpha(quaternary, 0.66),
    background: AMBIENT_BACKGROUND,
    transitionProperty:
      "--ambient-primary, --ambient-secondary, --ambient-tertiary, --ambient-quaternary",
    transitionDuration: `${AMBIENT_MORPH_DURATION_MS}ms`,
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
};

export function GlobalBackground() {
  const { isHovered, ambientColors } = useVideo();
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

  const ambientStyle = useMemo(() => buildAmbientStyle(ambientColors), [ambientColors]);
  const showAmbientBackground = isHovered && Boolean(ambientStyle);

  if (!src) return null;

  return (
    <>
      <div
        className={cn(
          "fade-in absolute inset-0 overflow-hidden -z-10 pointer-events-none",
          "transition-opacity duration-1000 ease-in-out",
          showAmbientBackground ? "opacity-0" : "opacity-100",
        )}
        style={{
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
        }}
      >
        <div
          className={cn(
            "w-full h-[700px] bg-no-repeat bg-cover bg-center blur-3xl bg-surface-scrim",
            "filter brightness-[0.15]",
          )}
          style={{ backgroundImage: `url(${src})` }}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 overflow-hidden -z-10 pointer-events-none",
          "transition-opacity duration-1000 ease-in-out",
          showAmbientBackground ? "opacity-70" : "opacity-0",
        )}
        style={{
          maskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 100%)",
        }}
      >
        <div className="w-full h-[700px] saturate-150" style={ambientStyle} />
      </div>
      <div
        className="absolute inset-x-0 top-[520px] h-[220px] -z-10 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--background) 0%, transparent 100%)",
        }}
      />
    </>
  );
}
