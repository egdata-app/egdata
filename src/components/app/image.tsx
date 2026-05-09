import { useMemo, useRef, type FC, type ImgHTMLAttributes } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import buildImageUrl, { buildSrcSet } from "@/lib/build-image-url";
import type { ImageQuality } from "@/lib/build-image-url";
import { cn } from "@/lib/utils";

export type ImagePriority = "high" | "low" | "auto";

export type ImageProps = {
  quality?: ImageQuality;
  unoptimized?: boolean;
  width?: number;
  height?: number;
  alt?: string;
  /** @deprecated use priority="high" */
  eager?: boolean;
  priority?: ImagePriority;
  sizes?: string;
} & ImgHTMLAttributes<HTMLImageElement>;

export const Image: FC<ImageProps> = ({
  src,
  width = 400,
  height = 500,
  quality = "medium",
  unoptimized = false,
  alt = "",
  eager,
  priority,
  sizes,
  className,
  style,
  onLoad,
  onError,
  ...props
}) => {
  const effectivePriority: ImagePriority = priority ?? (eager ? "high" : "auto");
  const imageSrc = src || `https://via.placeholder.com/${width}x${height}`;

  const { url, srcSet } = useMemo(() => {
    if (unoptimized) return { url: imageSrc, srcSet: undefined };
    return {
      url: buildImageUrl(imageSrc, width, quality),
      srcSet: buildSrcSet(imageSrc, width, quality),
    };
  }, [imageSrc, width, quality, unoptimized]);

  const erroredRef = useRef(false);

  return (
    <div
      className="egd-image-wrap"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${width} / ${height}`,
        overflow: "hidden",
        ...style,
      }}
    >
      <img
        ref={(img) => {
          if (img && img.complete && img.naturalWidth > 0) {
            img.parentElement?.setAttribute("data-loaded", "true");
          }
        }}
        src={url}
        srcSet={srcSet}
        sizes={sizes ?? `${width}px`}
        width={width}
        height={height}
        alt={alt}
        loading={effectivePriority === "high" ? "eager" : "lazy"}
        decoding={effectivePriority === "high" ? "sync" : "async"}
        fetchPriority={effectivePriority === "auto" ? undefined : effectivePriority}
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        onLoad={(e) => {
          e.currentTarget.parentElement?.setAttribute("data-loaded", "true");
          onLoad?.(e);
        }}
        onError={(e) => {
          if (!erroredRef.current) {
            erroredRef.current = true;
            e.currentTarget.src = imageSrc;
          }
          e.currentTarget.parentElement?.setAttribute("data-loaded", "true");
          onError?.(e);
        }}
        {...props}
      />
      <Skeleton
        className="egd-image-skeleton"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
    </div>
  );
};
