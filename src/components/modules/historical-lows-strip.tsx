import { Link } from "@/components/app/localized-link";
import { Image } from "@/components/app/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { calculatePrice } from "@/lib/calculate-price";
import { getImage } from "@/lib/get-image";
import { offersDictionary } from "@/lib/offers-dictionary";
import { useLocale } from "@/hooks/use-locale";
import { useTranslation } from "@/lib/paraglide-react";
import type { SearchV2Response } from "@/types/search-v2";
import { DateTime } from "luxon";
import { getCurrentHistoricalLowOffers, getEffectivePrice } from "@/lib/effective-price";

type HistoricalLowsStripProps = {
  offers: SearchV2Response["offers"];
  isLoading: boolean;
  isError: boolean;
};

export function HistoricalLowsStrip({ offers, isLoading, isError }: HistoricalLowsStripProps) {
  const { t } = useTranslation();
  const visibleOffers = getCurrentHistoricalLowOffers(offers);

  return (
    <section
      aria-labelledby="historical-lows-title"
      className="rounded-md border border-border/60 bg-card/40 p-4 backdrop-blur-sm"
      data-testid="historical-lows"
    >
      <Carousel opts={{ align: "start", slidesToScroll: "auto" }}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            id="historical-lows-title"
            className="font-display text-sm font-semibold text-muted-foreground"
          >
            {t("home.sections.historicalLows")}
          </h2>
          <div className="flex items-center gap-2">
            <CarouselPrevious
              aria-label={t("home.historicalLows.previous")}
              className="static size-7 translate-y-0"
              data-testid="historical-lows-previous"
            />
            <CarouselNext
              aria-label={t("home.historicalLows.next")}
              className="static size-7 translate-y-0"
              data-testid="historical-lows-next"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells are positional placeholders
              <div key={index} className="h-44 animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("home.historicalLows.error")}
          </p>
        ) : visibleOffers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("home.historicalLows.empty")}
          </p>
        ) : (
          <CarouselContent className="-ml-3">
            {visibleOffers.map((offer) => (
              <CarouselItem
                key={offer.id}
                className="basis-full pl-3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
              >
                <HistoricalLowOffer offer={offer} />
              </CarouselItem>
            ))}
          </CarouselContent>
        )}
      </Carousel>
    </section>
  );
}

function HistoricalLowOffer({ offer }: { offer: SearchV2Response["offers"][number] }) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const price = (getEffectivePrice(offer.price) ?? offer.price).price;
  const image = getImage(offer.keyImages, [
    "OfferImageWide",
    "DieselGameBoxWide",
    "Thumbnail",
    "OfferImageTall",
    "DieselGameBoxTall",
  ])?.url;
  const formatPrice = (amount: number) =>
    Intl.NumberFormat(locale, { style: "currency", currency: price.currencyCode }).format(
      calculatePrice(amount, price.currencyCode),
    );
  const updatedAt = DateTime.fromISO(offer.price.updatedAt)
    .setLocale(locale ?? "en-US")
    .toRelative();

  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{ id: offer.id }}
      className="group block overflow-hidden rounded-md border border-border/50 bg-background/40 transition-colors hover:border-primary/60"
      aria-label={t("home.historicalLows.openOffer", { title: offer.title })}
    >
      <div className="relative aspect-[16/8] overflow-hidden bg-muted/40">
        <Image
          src={image ?? "/placeholder.webp"}
          alt=""
          width={320}
          height={160}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <Badge
          className="absolute start-2 top-2 max-w-[calc(100%-1rem)] truncate bg-background/80 text-[0.65rem] text-foreground backdrop-blur-sm"
          variant="secondary"
        >
          {offersDictionary[offer.offerType as keyof typeof offersDictionary] ?? offer.offerType}
        </Badge>
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground">
          {offer.title}
        </h3>
        <div className="flex items-baseline gap-2">
          {price.originalPrice > price.discountPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(price.originalPrice)}
            </span>
          )}
          <span className="text-sm font-bold text-primary">{formatPrice(price.discountPrice)}</span>
        </div>
        <p suppressHydrationWarning className="truncate text-xs text-muted-foreground">
          {t("home.historicalLows.updated", { time: updatedAt ?? t("common.notAvailable") })}
        </p>
      </div>
    </Link>
  );
}
