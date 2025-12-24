import { useState, useEffect, type FC, type ImgHTMLAttributes } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import buildImageUrl from "@/lib/build-image-url";
import type { ImageQuality } from "@/lib/build-image-url";
import { useIntersectionObserver } from "@uidotdev/usehooks";

export type ImageProps = {
  quality?: ImageQuality;
  unoptimized?: boolean;
  width?: number;
  height?: number;
  alt?: string;
  eager?: boolean;
} & ImgHTMLAttributes<HTMLImageElement>;

export const Image: FC<ImageProps> = ({
  src,
  width = 400,
  height = 500,
  quality = "medium",
  unoptimized = false,
  alt = "",
  eager = false,
  ...props
}) => {
  const [loading, setLoading] = useState(!eager);
  const [imgRef, isIntersecting] = useIntersectionObserver<HTMLImageElement>({
    rootMargin: "200px",
    threshold: 0,
  });

  const aspectRatio = (height / width) * 100;

  const imageSrc = src || `https://via.placeholder.com/${width}x${height}`;
  const url = unoptimized ? imageSrc : buildImageUrl(imageSrc, width, quality);

  // biome-ignore lint/correctness/useExhaustiveDependencies: set loading to true when url changes
  useEffect(() => {
    setLoading(!eager);
  }, [url]);

  const shouldLoad = eager || isIntersecting;

  return (
    <div
      ref={imgRef}
      style={{
        position: "relative",
        width: "100%",
        paddingTop: `${aspectRatio}%`,
        overflow: "hidden",
      }}
    >
      <Skeleton
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transition: "opacity 0.5s ease",
          opacity: loading ? 1 : 0,
          zIndex: loading ? 1 : -1,
        }}
      />
      {shouldLoad && (
        <picture style={{ opacity: loading ? 0 : 1, transition: "opacity 0.5s ease" }}>
          <img
            src={url}
            width={width}
            height={height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onLoad={() => setLoading(false)}
            onError={(e) => {
              setLoading(false);
              e.currentTarget.src = imageSrc;
            }}
            loading={eager ? "eager" : "lazy"}
            {...props}
            alt={alt}
          />
        </picture>
      )}
    </div>
  );
};
