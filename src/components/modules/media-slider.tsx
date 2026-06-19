import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import type { Media } from "@/types/media";
import type { SingleOffer } from "@/types/single-offer";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getImage } from "@/lib/getImage";
import { Player } from "../app/video-player";
import { Image } from "../app/image";
import { Button } from "../aria/button";
import { ChevronLeft, ChevronRight, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "../aria/skeleton";
import { Download as DownloadIcon } from "lucide-react";

interface SlideBase {
  id: string;
  thumbnail: string;
}

interface ImageSlide extends SlideBase {
  type: "image";
  /**
   * Image URL
   */
  image: string;
}

interface VideoSlide extends SlideBase {
  type: "video";
  /**
   * Dash URL
   */
  video: Media["videos"][0];
}

type Slide = ImageSlide | VideoSlide;

export function OfferMediaSlider({ offer }: { offer: SingleOffer }) {
  const { data } = useQuery({
    queryKey: ["media", { id: offer.id }],
    queryFn: () => httpClient.get<Media>(`/offers/${offer.id}/media`),
    retry: false,
  });

  // Videos first, then images, if no images, get cover image from offer data
  const slides = useMemo<Slide[]>(() => {
    const imageToUse =
      getImage(offer.keyImages, ["OfferImageWide", "DieselStoreFrontWide", "Featured"])?.url ??
      "/300x150-egdata-placeholder.png";

    if (!data) {
      return [
        {
          id: offer.id,
          type: "image" as const,
          image: imageToUse,
          thumbnail: imageToUse,
        },
      ];
    }

    const images = data.images.map((image) => ({
      id: image._id,
      type: "image" as const,
      image: image.src,
      thumbnail: image.src,
    }));

    const videos = data.videos
      .filter((video) => video.outputs?.length > 0)
      .map((video) => ({
        id: video._id,
        type: "video" as const,
        video: video,
        thumbnail: imageToUse,
      }));

    return [...videos, ...images];
  }, [data, offer]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const mainViewportRef = useRef<HTMLDivElement>(null);
  const thumbViewportRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollTo = useCallback(
    (index: number) => {
      slideRefs.current[index]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      thumbRefs.current[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setSelectedIndex((currentIndex) => (currentIndex === index ? currentIndex : index));
    },
    [],
  );

  const handlePrevious = useCallback(() => {
    scrollTo(Math.max(0, selectedIndex - 1));
  }, [scrollTo, selectedIndex]);

  const handleNext = useCallback(() => {
    scrollTo(Math.min(slides.length - 1, selectedIndex + 1));
  }, [scrollTo, selectedIndex, slides.length]);

  useEffect(() => {
    const viewport = mainViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const items = slideRefs.current.filter(Boolean) as HTMLDivElement[];
      const nextIndex = items.reduce((closest, item, index) => {
        return Math.abs(item.offsetLeft - viewport.scrollLeft) <
          Math.abs(items[closest].offsetLeft - viewport.scrollLeft)
          ? index
          : closest;
      }, 0);

      setSelectedIndex((current) => (current === nextIndex ? current : nextIndex));
      thumbRefs.current[nextIndex]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div key={`media-slider-${offer.id}`} className="flex flex-col gap-4 w-full">
      <div className="relative">
        <div ref={mainViewportRef} className="overflow-hidden scroll-smooth">
          <div className="flex snap-x snap-mandatory">
            {slides.map((slide, index) => (
              <div
                key={`slide-${slide.id}`}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className={cn(
                  "flex-[0_0_100%] min-w-0 snap-start",
                  slide.type === "video" && "pointer-events-none cursor-pointer",
                  slide.type === "image" && "pointer-events-auto cursor-grab",
                )}
                onPointerDown={(e) => {
                  if (slide.type === "image") {
                    // Change pointer to grabbing
                    e.currentTarget.style.cursor = "grabbing";
                    e.currentTarget.style.cursor = "-webkit-grabbing";
                  }
                }}
                onPointerUp={(e) => {
                  if (slide.type === "image") {
                    // Change pointer to grab
                    e.currentTarget.style.cursor = "grab";
                    e.currentTarget.style.cursor = "-webkit-grab";
                  }
                }}
              >
                {slide.type === "image" && (
                  <div className="w-full h-full relative">
                    <span className="absolute top-2 right-2 z-50">
                      <DownloadImage src={slide.image} />
                    </span>
                    <Image
                      src={slide.image}
                      alt={`Image ${index + 1}`}
                      width={960}
                      height={540}
                      quality="high"
                      priority={index === selectedIndex ? "high" : "auto"}
                      sizes="(min-width: 1280px) 960px, 100vw"
                      className="w-full h-auto object-cover rounded-lg"
                    />
                  </div>
                )}
                {slide.type === "video" && (
                  <Suspense
                    fallback={
                      <div className="flex flex-col w-full h-full">
                        <Skeleton className="w-full h-full" />
                      </div>
                    }
                  >
                    <Player
                      video={slide.video}
                      offer={offer}
                      className="w-full h-full max-w-full rounded-lg"
                      thumbnail={slide.thumbnail}
                      pauseWhenInactive
                    />
                  </Suspense>
                )}
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2"
          onClick={handlePrevious}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous slide</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleNext}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next slide</span>
        </Button>
      </div>
      <div className="mt-4">
        <div ref={thumbViewportRef} className="overflow-hidden scroll-smooth">
          <div className="flex -mx-2">
            {slides.map((slide, index) => (
              <div
                key={`thumbnail-${slide.id}`}
                ref={(node) => {
                  thumbRefs.current[index] = node;
                }}
                className="flex-[0_0_15%] min-w-0 px-2"
              >
                <button
                  type="button"
                  className={cn(
                    "w-full border-2 border-transparent rounded-md relative transition-all duration-300 ease-in-out hover:opacity-100",
                    index === selectedIndex ? "border-primary" : "opacity-35",
                  )}
                  onClick={() => scrollTo(index)}
                >
                  {slide.type === "video" && (
                    // Show a play icon so the user knows it's a video
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-text-primary z-50 opacity-75">
                      <PlayIcon className="size-8" fill="white" />
                    </span>
                  )}
                  <Image
                    src={slide.thumbnail}
                    alt={`Thumbnail ${index + 1}`}
                    width={160}
                    height={90}
                    quality="low"
                    sizes="160px"
                    className="w-full h-auto object-cover rounded-sm"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadImage({ src }: { src: string }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async () => {
    setIsDownloading(true);
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = src.replaceAll("%2F", "/").split("/").pop() ?? "image";
    a.click();
    URL.revokeObjectURL(url);
    setIsDownloading(false);
  }, [src]);

  return (
    <Button
      variant="outline"
      className="border border-stroke-subtle text-xs gap-2 opacity-75 hover:opacity-100 transition duration-150 ease-in-out"
      onClick={download}
      disabled={isDownloading}
    >
      <DownloadIcon className="size-3" />
      {isDownloading ? "Downloading..." : "Download"}
    </Button>
  );
}
