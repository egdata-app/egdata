import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import type { SingleOffer } from "@/types/single-offer";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Image } from "@/components/app/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Player } from "@/components/app/video-player";
import { DownloadIcon, XIcon } from "lucide-react";
import * as Portal from "@radix-ui/react-portal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { generateOfferMeta } from "@/lib/generate-offer-meta";
import { useLocale } from "@/hooks/use-locale";
import { Button } from "@/components/ui/button";
import { offerMediaQueryOptions, offerOnlyQueryOptions, resolveQueryLocale } from "@/queries/offer";
import { useTranslation } from "@/lib/paraglide-react";
import i18n from "@/lib/i18n";
import { parseKeyImage } from "@/utils/parse-key-image";

export const Route = createFileRoute("/{-$locale}/offers/$id/media")({
  component: MediaPage,

  loader: async ({ context, params }) => {
    const { queryClient, locale, cookies } = context;
    const { id } = params;
    const resolvedLocale = resolveQueryLocale(
      import.meta.env.SSR ? locale : (locale ?? cookies?.user_locale),
    );
    const offerQuery = offerOnlyQueryOptions(id, resolvedLocale);

    if (import.meta.env.SSR) {
      const [offer] = await Promise.all([
        queryClient.ensureQueryData(offerQuery).catch(() => null),
        queryClient.prefetchQuery(offerMediaQueryOptions(id)),
      ]);

      return {
        id,
        offer,
        locale: resolvedLocale,
        isOfferLoaded: true,
      };
    }

    const cachedOffer = queryClient.getQueryData(offerQuery.queryKey);
    void queryClient.prefetchQuery(offerMediaQueryOptions(id));

    return {
      id,
      offer: cachedOffer ?? null,
      locale: resolvedLocale,
      isOfferLoaded: cachedOffer !== undefined,
    };
  },

  head: (ctx) => {
    if (!ctx.loaderData) {
      return {
        meta: [],
      };
    }

    const { offer, isOfferLoaded } = ctx.loaderData;

    if (!offer) {
      if (!isOfferLoaded) {
        return {
          meta: [],
        };
      }

      return {
        meta: [
          {
            title: i18n.t("offerDetail.common.offerNotFound"),
            description: i18n.t("offerDetail.common.offerNotFound"),
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
  const { t } = useTranslation();
  const params = Route.useParams();
  const { locale } = useLocale();
  const { data: media, isLoading } = useQuery(offerMediaQueryOptions(params.id));
  const { data: offer, isLoading: isOfferLoading } = useQuery(
    offerOnlyQueryOptions(params.id, locale),
  );

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
      <section id="offer-media" className="flex w-full flex-col">
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {t("offerDetail.tabs.media")}
          </h2>
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <div className="rounded-xl border border-white/10 bg-card/80 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              /* biome-ignore lint/suspicious/noArrayIndexKey: This is a static list for a skeleton loader */
              <Skeleton
                key={index}
                className="aspect-video w-full rounded-xl border border-white/10 bg-muted/60"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const imageCount = media?.images.length ?? 0;
  const videoCount = media?.videos.length ?? 0;
  const coverCount = offer?.keyImages?.length ?? 0;
  const totalMediaCount = imageCount + videoCount + coverCount;

  return (
    <section id="offer-media" className="flex w-full flex-col items-start">
      <div className="flex w-full items-baseline justify-between gap-3 border-b border-border/60 pb-3 mb-5">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
          {t("offerDetail.tabs.media")}
        </h2>
        <span className="shrink-0 rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
          {totalMediaCount}
        </span>
      </div>

      <Accordion
        className="w-full overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-sm"
        defaultExpandedKeys={[media ? "images" : "covers"]}
      >
        <AccordionItem
          id="images"
          className="not-last:border-b not-last:border-border/60 data-open:bg-transparent"
        >
          <AccordionTrigger className="items-center px-5 py-4 font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground transition-colors duration-150 hover:text-primary hover:no-underline">
            <span className="inline-flex items-baseline gap-2.5">
              <span>{t("offerDetail.media.images")}</span>
              <span className="rounded-full border border-white/10 bg-background/60 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {imageCount}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pt-1 pb-5">
            {!media?.images.length && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-background/40 px-6 py-12 text-center">
                <p className="font-display text-base font-semibold text-muted-foreground">
                  {t("offerDetail.media.noImages")}
                </p>
              </div>
            )}
            {media?.images && media.images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {media.images.map((image) => (
                  <button
                    key={image._id}
                    type="button"
                    onClick={() => setActive(image._id)}
                    className="group relative block w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-card/80 text-left shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:shadow-lg hover:shadow-black/35 focus-visible:outline-none focus-visible:border-primary"
                  >
                    <Image
                      src={image.src}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.03]"
                      width={700}
                      height={400}
                    />
                  </button>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          id="videos"
          className="not-last:border-b not-last:border-border/60 data-open:bg-transparent"
        >
          <AccordionTrigger className="items-center px-5 py-4 font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground transition-colors duration-150 hover:text-primary hover:no-underline">
            <span className="inline-flex items-baseline gap-2.5">
              <span>{t("offerDetail.media.videos")}</span>
              <span className="rounded-full border border-white/10 bg-background/60 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {videoCount}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pt-1 pb-5">
            {!media?.videos.length && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-background/40 px-6 py-12 text-center">
                <p className="font-display text-base font-semibold text-muted-foreground">
                  {t("offerDetail.media.noVideos")}
                </p>
              </div>
            )}
            {(media?.videos.length ?? 0) > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {media?.videos.map((video) => (
                  <div
                    key={video._id}
                    className="overflow-hidden rounded-xl border border-white/10 bg-card/80 p-2 sm:p-3 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:shadow-lg hover:shadow-black/35"
                  >
                    <ClientOnly
                      fallback={<Skeleton className="aspect-video w-full rounded-lg bg-muted/60" />}
                    >
                      <Suspense
                        fallback={
                          <Skeleton className="aspect-video w-full rounded-lg bg-muted/60" />
                        }
                      >
                        <Player video={video} offer={offer as SingleOffer} />
                      </Suspense>
                    </ClientOnly>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          id="covers"
          className="not-last:border-b not-last:border-border/60 data-open:bg-transparent"
        >
          <AccordionTrigger className="items-center px-5 py-4 font-display text-lg sm:text-xl font-semibold tracking-tight text-foreground transition-colors duration-150 hover:text-primary hover:no-underline">
            <span className="inline-flex items-baseline gap-2.5">
              <span>{t("offerDetail.media.covers")}</span>
              <span className="rounded-full border border-white/10 bg-background/60 px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {coverCount}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pt-1 pb-5">
            {!offer?.keyImages?.length && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-background/40 px-6 py-12 text-center">
                <p className="font-display text-base font-semibold text-muted-foreground">
                  {t("offerDetail.media.noCovers")}
                </p>
              </div>
            )}
            {(offer?.keyImages?.length ?? 0) > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {offer?.keyImages?.map(parseKeyImage).map((cover) => (
                  <div
                    key={cover.md5}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:shadow-lg hover:shadow-black/35"
                  >
                    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-background/40 p-3">
                      <a
                        className="absolute top-2.5 right-2.5 z-10 inline-flex items-center justify-center rounded-lg border border-white/10 bg-background/80 p-2 text-foreground/90 backdrop-blur-md transition-[border-color,background-color,color] duration-150 hover:border-primary/60 hover:bg-background hover:text-primary"
                        href={cover.mediaType === "image" ? cover.imageUrl : cover.coverUrl}
                        download={`${offer.title}-${cover.type}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("offerDetail.media.downloadCoverAria", { type: cover.type })}
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </a>
                      <img
                        src={cover.mediaType === "image" ? cover.imageUrl : cover.coverUrl}
                        alt={`${offer.title} - ${cover.type}`}
                        className="max-h-80 w-full h-auto object-contain transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-border/50 px-3.5 py-2.5">
                      <span className="text-xs font-mono text-muted-foreground">{cover.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              className="absolute top-4 right-4 text-foreground z-[51] rounded-full border border-white/10 bg-black/70 p-2 backdrop-blur-md transition-colors hover:border-primary/60 hover:bg-black/85"
              aria-label={t("offerDetail.media.close")}
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
                        className="absolute top-4 right-4 text-foreground z-[51] rounded-lg border border-white/10 bg-black/70 p-2 backdrop-blur-md transition-colors hover:border-primary/60 hover:bg-black/85"
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
                        className="w-full h-auto object-contain max-h-[90vh] rounded-xl"
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
    </section>
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
