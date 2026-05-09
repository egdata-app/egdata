import { useCallback, useEffect, useMemo, useRef, type FC, type ImgHTMLAttributes } from "react";
import buildImageUrl, { buildSrcSet } from "@/lib/build-image-url";
import type { ImageQuality } from "@/lib/build-image-url";

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
  loading,
  decoding,
  fetchPriority,
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

  const wrapRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const erroredRef = useRef(false);

  const markLoaded = useCallback(() => {
    wrapRef.current?.setAttribute("data-loaded", "true");
  }, []);

  const handleImageRef = useCallback(
    (img: HTMLImageElement | null) => {
      imageRef.current = img;

      if (img && img.complete && img.naturalWidth > 0) {
        markLoaded();
      }
    },
    [markLoaded],
  );

  useEffect(() => {
    erroredRef.current = false;
    wrapRef.current?.removeAttribute("data-loaded");

    const img = imageRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      markLoaded();
    }
  }, [markLoaded, url]);

  return (
    <div
      ref={wrapRef}
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
        ref={handleImageRef}
        src={url}
        srcSet={srcSet}
        sizes={sizes ?? `${width}px`}
        width={width}
        height={height}
        alt={alt}
        loading={loading ?? (effectivePriority === "high" ? "eager" : "lazy")}
        decoding={decoding ?? "async"}
        fetchPriority={
          fetchPriority ?? (effectivePriority === "auto" ? undefined : effectivePriority)
        }
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        onLoad={(e) => {
          markLoaded();
          onLoad?.(e);
        }}
        onError={(e) => {
          if (!erroredRef.current) {
            erroredRef.current = true;
            e.currentTarget.src = imageSrc;
          }
          markLoaded();
          onError?.(e);
        }}
        {...props}
      />
      <div className="egd-image-skeleton rounded-md bg-primary/10" aria-hidden="true" />
    </div>
  );
};
