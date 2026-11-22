import { Link } from "@/components/app/localized-link";
import { Image } from "@/components/app/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { calculatePrice } from "@/lib/calculate-price";
import { getImage } from "@/lib/get-image";
import { useLocale } from "@/hooks/use-locale";
import { useTranslation } from "@/lib/paraglide-react";
import type { HomeHistoricalLowOffer } from "@/queries/home";
import { DateTime } from "luxon";
import { getCurrentHistoricalLowOffers, getEffectivePrice } from "@/lib/effective-price";

type HistoricalLowsStripProps = {
  offers: HomeHistoricalLowOffer[];
  isLoading: boolean;
  isError: boolean;
};

export function HistoricalLowsStrip({ offers, isLoading, isError }: HistoricalLowsStripProps) {
  const { t } = useTranslation();
  const visibleOffers = getCurrentHistoricalLowOffers(offers);

  return (
    <section aria-labelledby="historical-lows-title" data-testid="historical-lows">
      <Carousel opts={{ align: "start", slidesToScroll: "auto" }}>
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-border/60 pb-2.5">
          <h2
            id="historical-lows-title"
            className="font-display text-lg font-semibold tracking-tight text-foreground"
          >
            {t("home.sections.historicalLows")}
          </h2>
          <div className="flex items-center gap-2">
            <CarouselPrevious
              aria-label={t("home.historicalLows.previous")}
              className="static size-8 translate-y-0 rounded-full border-border/60 bg-card/60 transition-colors duration-150 hover:border-primary/50 hover:bg-card hover:text-foreground"
              data-testid="historical-lows-previous"
            />
            <CarouselNext
              aria-label={t("home.historicalLows.next")}
              className="static size-8 translate-y-0 rounded-full border-border/60 bg-card/60 transition-colors duration-150 hover:border-primary/50 hover:bg-card hover:text-foreground"
              data-testid="historical-lows-next"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells are positional placeholders
              <div key={index} className="space-y-2.5">
                <div className="aspect-[16/9] animate-pulse rounded-lg bg-muted/40" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted/30" />
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted/25" />
              </div>
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
          <CarouselContent className="py-1">
            {visibleOffers.map((offer) => (
              <CarouselItem
                key={offer.id}
                className="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
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

function HistoricalLowOffer({ offer }: { offer: HomeHistoricalLowOffer }) {
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
  const discountPct =
    price.originalPrice > price.discountPrice && price.originalPrice > 0
      ? Math.round(((price.originalPrice - price.discountPrice) / price.originalPrice) * 100)
      : 0;

  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{ id: offer.id }}
      className="group block focus:outline-none"
      aria-label={t("home.historicalLows.openOffer", { title: offer.title })}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-white/10 bg-muted/40 transition-[box-shadow,border-color] duration-200 ease-out group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35 group-focus-visible:border-primary">
        <Image
          src={image ?? "/placeholder.webp"}
          alt=""
          width={320}
          height={180}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
        />
        {discountPct > 0 && (
          <span className="absolute bottom-2 end-2 rounded-md bg-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground shadow-sm">
            -{discountPct}%
          </span>
        )}
      </div>
      <div className="mt-2.5 space-y-1">
        <h3 className="line-clamp-1 text-sm font-medium leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
          {offer.title}
        </h3>
        <div className="flex items-baseline gap-2 tabular-nums">
          <span className="text-sm font-semibold text-foreground">
            {formatPrice(price.discountPrice)}
          </span>
          {price.originalPrice > price.discountPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(price.originalPrice)}
            </span>
          )}
        </div>
        <p suppressHydrationWarning className="truncate text-xs text-muted-foreground/80">
          {t("home.historicalLows.updated", { time: updatedAt ?? t("common.notAvailable") })}
        </p>
      </div>
    </Link>
  );
}
