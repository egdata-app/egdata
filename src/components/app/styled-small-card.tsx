import { Link } from "@/components/app/localized-link";
import buildImageUrl from "@/lib/build-image-url";
import { calculatePrice } from "@/lib/calculate-price";
import { getImage } from "@/lib/getImage";
import type { SingleOffer } from "@/types/single-offer";
import { useLocale } from "@/hooks/use-locale";
import { getEffectivePrice } from "@/lib/effective-price";

export const StyledSmallCard: React.FC<{
  offer: SingleOffer;
  title: string;
  showPrice?: boolean;
}> = ({ offer, title, showPrice = false }) => {
  const { locale } = useLocale();
  const price = getEffectivePrice(offer.price);
  const imageUrl =
    getImage(offer.keyImages, ["DieselGameBox", "DieselGameBoxWide", "OfferImageWide"])?.url ||
    "https://cdn.egdata.app/placeholder-1080.webp";

  const priceFormatter = price
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: price.price.currencyCode || "USD",
      })
    : null;

  return (
    <Link
      className="group relative flex h-16 w-full select-none items-center justify-between gap-3 overflow-hidden rounded-lg border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/60 hover:shadow-lg hover:shadow-black/35 focus-visible:outline-none focus-visible:border-primary"
      to="/{-$locale}/offers/$id"
      params={{ id: offer.id }}
      aria-label={`Open offer ${offer.title}`}
    >
      <div className="relative z-10 flex min-w-0 flex-col gap-0.5 px-4">
        <span className="truncate text-xs font-medium text-muted-foreground">{title}</span>
        <h4 className="font-display truncate text-base font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
          {offer.title}
        </h4>
      </div>
      {showPrice && price && priceFormatter && (
        <div className="relative z-10 flex shrink-0 flex-col items-end justify-center gap-0.5 px-4 text-right tabular-nums">
          {price.price.discount > 0 && (
            <span className="text-xs text-muted-foreground line-through tabular-nums">
              {priceFormatter.format(
                calculatePrice(price.price.originalPrice, price.price.currencyCode),
              )}
            </span>
          )}
          <span className="font-display text-base font-semibold text-foreground tabular-nums">
            {priceFormatter.format(
              calculatePrice(price.price.discountPrice, price.price.currencyCode),
            )}
          </span>
        </div>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-background/95 via-background/80 to-background/45 transition-opacity duration-200 group-hover:opacity-90"
      />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img
          src={buildImageUrl(imageUrl, 500)}
          alt={offer.title}
          className="h-full w-full object-cover opacity-35 transition-[transform,opacity] duration-300 ease-out will-change-transform group-hover:scale-[1.035] group-hover:opacity-55"
          loading="lazy"
        />
      </div>
    </Link>
  );
};
