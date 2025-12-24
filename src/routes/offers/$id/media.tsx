import { createFileRoute } from "@tanstack/react-router";
import { httpClient } from "@/lib/http-client";
import type { Media } from "@/types/media";
import type { SingleOffer } from "@/types/single-offer";
import { dehydrate, type DehydratedState, HydrationBoundary, useQuery } from "@tanstack/react-query";
import { getFetchedQuery } from "@/lib/get-fetched-query";
import { Suspense, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Image } from "@/components/app/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Player } from "@/components/app/video-player.client";
import { DownloadIcon, XIcon } from "lucide-react";
import * as Portal from "@radix-ui/react-portal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getQueryClient } from "@/lib/client";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { Button } from "@/components/ui/button";

type LoaderData = {
  dehydratedState: DehydratedState;
  id: string;
  offer: SingleOffer | undefined;
};

export const Route = createFileRoute("/offers/$id/media")({
  component: () => {
    const { dehydratedState } = Route.useLoaderData() as LoaderData;

    return (
      <HydrationBoundary state={dehydratedState}>
        <MediaPage />
      </HydrationBoundary>
    );
  },

  // @ts-expect-error - loader return type
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    const { id } = params;

    await queryClient.prefetchQuery({
      queryKey: ["media", { id: params.id }],
      queryFn: () => httpClient.get<Media>(`/offers/${params.id}/media`),
    });

    const offer = getFetchedQuery<SingleOffer>(queryClient, dehydrate(queryClient), [
      "offer",
      { id: params.id },
    ]);

    return {
      dehydratedState: dehydrate(queryClient),
      id,
      offer,
    };
  },

  head: (ctx) => {
    const { params } = ctx;
    const queryClient = getQueryClient();

    if (!ctx.loaderData) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    const offer = getFetchedQuery<SingleOffer>(queryClient, ctx.loaderData?.dehydratedState, [
      "offer",
      { id: params.id },
    ]);

    if (!offer) {
      return {
        meta: [
          {
            title: "Offer not found",
            description: "Offer not found",
          },
        ],
      };
    }

    return {
      meta: generateOfferMeta(offer, "Media"),
    };
  },
});

function MediaPage() {
  const params = Route.useParams();
  const { data: media, isLoading } = useQuery({
    queryKey: ["media", { id: params.id }],
    queryFn: () => httpClient.get<Media>(`/offers/${params.id}/media`),
    retry: false,
  });
  const { data: offer, isLoading: isOfferLoading } = useQuery({
    queryKey: ["offer", { id: params.id }],
    queryFn: () => httpClient.get<SingleOffer>(`/offers/${params.id}`),
    retry: false,
  });

  const [active, setActive] = useState<boolean | string>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActive(false);
      }
    };

    if (active) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  if (isLoading && !media && isOfferLoading) {
    return (
      <div className="flex flex-col gap-4 mt-6 max-w-4xl w-full mx-auto">
        <h4 className="text-xl">Images</h4>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            /* biome-ignore lint/suspicious/noArrayIndexKey: This is a static list for a skeleton loader */
            <Skeleton key={index} className="w-full h-72" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 w-full max-w-7xl mx-auto px-4">
      <Accordion
        type="single"
        collapsible
        className="w-full"
        defaultValue={media ? "images" : "covers"}
      >
        <AccordionItem value="images">
          <AccordionTrigger className="text-xl">Images</AccordionTrigger>
          <AccordionContent>
            {!media?.images.length && (
              <div className="text-center">
                <h2 className="text-2xl font-bold">No images found</h2>
              </div>
            )}
            {media?.images && media.images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {media.images.map((image) => (
                  <Image
                    key={image._id}
                    src={image.src}
                    alt=""
                    onClick={() => setActive(image._id)}
                    className="cursor-pointer rounded-xl w-full h-auto object-cover"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setActive(image._id);
                      }
                    }}
                    width={700}
                    height={400}
                  />
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="videos">
          <AccordionTrigger className="text-xl">Videos</AccordionTrigger>
          <AccordionContent>
            {!media?.videos.length && (
              <div className="text-center">
                <h2 className="text-2xl font-bold">No videos found</h2>
              </div>
            )}
            {(media?.videos.length ?? 0) > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {media?.videos.map((video) => (
                  <Suspense key={video._id} fallback={<div>Loading...</div>}>
                    <Player video={video} offer={offer as SingleOffer} />
                  </Suspense>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="covers">
          <AccordionTrigger className="text-xl">Covers</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {offer?.keyImages.map((cover) => (
                <div key={cover.md5} className="flex flex-col items-center gap-2 relative">
                  <span className="absolute top-2 right-2 text-xs font-mono">
                    <a
                      className="text-xs bg-card/15 p-2 rounded-md cursor-pointer inline-block"
                      href={cover.url}
                      download={`${offer.title}-${cover.type}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Download ${cover.type} cover`}
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </a>
                  </span>
                  <img
                    key={cover.md5}
                    src={cover.url}
                    alt={`${offer.title} - ${cover.type}`}
                    className="w-full h-auto object-contain"
                  />
                  <span className="text-sm font-mono">{cover.type}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {active && media?.images && (
        <Portal.Root>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: The explicit close button and escape key provide sufficient accessibility. */}
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm"
            onClick={() => setActive(false)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActive(false);
              }}
              className="absolute top-4 right-4 text-white z-[51] rounded-full bg-black/50 p-2"
              aria-label="Close"
            >
              <XIcon className="w-6 h-6" />
            </button>

            <Carousel
              className="w-full max-w-5xl"
              opts={{
                loop: true,
                startIndex: media.images.findIndex((image) => image._id === active) || 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <CarouselContent>
                {media.images.map((image) => (
                  <CarouselItem key={image._id}>
                    <div className="relative">
                      <Button
                        variant="outline"
                        className="absolute top-4 right-4 text-white z-[51] rounded-md bg-black/50 p-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(
                            image.src,
                            `${offer?.title}-${image.src.split("/").pop()?.split("?")[0]}`,
                          );
                        }}
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </Button>
                      <Image
                        src={image.src}
                        alt=""
                        className="w-full h-auto object-contain max-h-[90vh]"
                        width={1920}
                        height={1080}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute -left-12" />
              <CarouselNext className="absolute -right-12" />
            </Carousel>
          </div>
        </Portal.Root>
      )}
    </div>
  );
}

function downloadImage(src: string, title: string) {
  const a = document.createElement("a");
  a.href = src;
  a.download = title;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.click();
}
