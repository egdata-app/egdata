import { Link } from "@/components/app/localized-link";
import { Image } from "./image";
import { getImage } from "@/lib/getImage";
import { Skeleton } from "../ui/skeleton";
import type { SingleOffer } from "@/types/single-offer";
import { offersDictionary } from "@/lib/offers-dictionary";
import { useEffect, useMemo } from "react";
import { useGenres } from "@/hooks/use-genres";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { calculatePrice } from "@/lib/calculate-price";
import { useLocale } from "@/hooks/use-locale";
import { platformIcons } from "./platform-icons";
import useExtension from "@/hooks/use-extension";
import { getEffectivePrice } from "@/lib/effective-price";

export function GameCard({ offer }: { offer: SingleOffer }) {
  const { locale } = useLocale();
  const price = getEffectivePrice(offer.price);
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: price?.price.currencyCode || "USD",
  });

  const isReleased = offer.releaseDate ? new Date(offer.releaseDate) < new Date() : false;
  const isPreOrder = offer.prePurchase;
  const isFree = price?.price.discountPrice === 0;

  const gradientImage = getImage(offer.keyImages, [
    "OfferImageTall",
    "Thumbnail",
    "DieselGameBoxTall",
    "DieselStoreFrontTall",
  ])?.url;

  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{ id: offer.id }}
      className="group block w-full max-w-sm select-none focus-visible:outline-none"
      aria-label={`Open offer ${offer.title}`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35 group-focus-visible:border-primary">
        <Image
          src={gradientImage}
          quality="medium"
          alt={offer.title}
          width={400}
          height={500}
          className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/45 via-40% to-transparent" />
        {offer.offerType && (
          <span className="absolute top-2.5 left-2.5 rounded-md bg-background/75 px-2 py-0.5 text-[0.7rem] font-medium text-foreground/90 ring-1 ring-white/10 backdrop-blur-md">
            {offersDictionary[offer.offerType as keyof typeof offersDictionary]}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3.5">
          <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground line-clamp-2 transition-colors duration-200 group-hover:text-primary md:text-lg">
            {offer.title}
          </h3>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground/90">{offer.seller.name}</span>
            <div className="inline-flex shrink-0 items-center justify-end gap-1.5 tabular-nums">
              {isReleased && price && (
                <>
                  {price.price.discount > 0 && price.price.originalPrice > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-primary-foreground tabular-nums">
                      {`-${Math.round(
                        ((price.price.originalPrice - price.price.discountPrice) /
                          price.price.originalPrice) *
                          100,
                      )}%`}
                    </span>
                  )}
                  {price.price.discount > 0 && (
                    <span className="text-xs text-muted-foreground line-through tabular-nums">
                      {fmt.format(price.price.originalPrice / 100)}
                    </span>
                  )}
                  {isFree ? (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20 tabular-nums">
                      Free
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {fmt.format(price.price.discountPrice / 100)}
                    </span>
                  )}
                </>
              )}
              {!isReleased && isPreOrder && price?.price.discountPrice !== undefined && (
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {fmt.format(price.price.discountPrice / 100)}
                </span>
              )}
              {!isReleased && !isPreOrder && !price && (
                <span className="text-xs font-medium text-muted-foreground">Coming Soon</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border border-white/10 bg-card/80">
      <Skeleton className="absolute inset-0 h-full w-full" />
    </div>
  );
}

const textSizes = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const mobilePlatforms = ["39070", "39071"];

export function OfferCard({
  offer,
  size = "xl",
}: {
  offer: SingleOffer;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const { addId, removeId, ownedStatus } = useExtension();
  const { genres } = useGenres();

  const offerGenres = useMemo(() => {
    if (!genres) return [];
    const genreIds = genres.map((genre) => genre.id);
    return offer.tags
      .filter((tag) => tag)
      .filter((tag) => genreIds.includes(tag?.id))
      .map((tag) => tag.name);
  }, [genres, offer.tags]);

  const gradientImage = useMemo(
    () =>
      getImage(offer.keyImages, [
        "OfferImageTall",
        "Thumbnail",
        "DieselGameBoxTall",
        "DieselStoreFrontTall",
      ])?.url ?? "/placeholder.webp",
    [offer.keyImages],
  );

  useEffect(() => {
    addId(offer.id, offer.namespace);
    return () => removeId(offer.id, offer.namespace);
  }, [addId, removeId, offer]);

  const owned = ownedStatus[`${offer.id}:${offer.namespace}`];

  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{
        id: offer.id,
      }}
      className="group mx-auto block w-fit select-none focus-visible:outline-none md:w-full"
      viewTransition
      aria-label={`Open offer ${offer.title}`}
    >
      <div className="relative aspect-[3/4] w-64 overflow-hidden rounded-lg border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35 group-focus-visible:border-primary md:w-full">
        <Image
          src={gradientImage}
          alt={offer.title}
          width={600}
          height={800}
          quality="high"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/50 via-40% to-transparent" />
        {offer.offerType && (
          <span className="absolute top-2.5 left-2.5 rounded-md bg-background/75 px-2 py-0.5 text-[0.7rem] font-medium text-foreground/90 ring-1 ring-white/10 backdrop-blur-md">
            {offersDictionary[offer.offerType as keyof typeof offersDictionary]}
          </span>
        )}
        <OfferBadges offer={offer} owned={owned} />
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col p-3.5">
          <h3
            className={cn(
              "font-display font-semibold leading-snug tracking-tight text-foreground line-clamp-2 drop-shadow-sm transition-colors duration-200 group-hover:text-primary",
              textSizes[size] ?? textSizes.xl,
            )}
          >
            {offer.title}{" "}
            <span className="inline-flex items-center gap-1.5 align-middle">
              {offer.tags
                .filter((tag) => tag)
                .filter((tag) => mobilePlatforms.includes(tag?.id))
                .map((tag) => (
                  <span key={tag?.id} className="scale-90">
                    {platformIcons[tag?.id]}
                  </span>
                ))}
            </span>
          </h3>
          {offer.seller?.name && (
            <p className="mt-1 truncate text-xs text-muted-foreground/90">{offer.seller.name}</p>
          )}
          <div className="max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity,margin-top] duration-200 ease-out group-hover:mt-1 group-hover:max-h-12 group-hover:opacity-100">
            <p className="truncate text-[0.7rem] text-muted-foreground/80">
              {offerGenres.length > 0
                ? offerGenres.join(" · ")
                : offersDictionary[offer.offerType as keyof typeof offersDictionary]}
            </p>
          </div>
          <div className="mt-2">
            <OfferPrice offer={offer} size={size} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function OfferBadges({ offer, owned }: { offer: SingleOffer; owned: boolean | undefined }) {
  const badges = useMemo(() => {
    const badges: string[] = [];

    if (offer.tags.filter((tag) => tag).find((tag) => tag?.id === "1310")) {
      badges.push("Early Access");
    }

    if (offer.prePurchase) {
      badges.push("Pre-Purchase");
    }

    if (owned === true) {
      badges.push("Owned");
    }

    return badges;
  }, [offer.tags, offer.prePurchase, owned]);

  return badges.length > 0 ? (
    <Badge
      variant={"default"}
      className="absolute top-2.5 right-2.5 bg-primary font-semibold text-primary-foreground shadow-sm"
    >
      {badges.join(" · ")}
    </Badge>
  ) : null;
}

function OfferPrice({
  offer,
  size = "xl",
}: {
  offer: SingleOffer;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) {
  const { locale } = useLocale();
  const price = getEffectivePrice(offer.price);
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: price?.price.currencyCode || "USD",
  });

  const isReleased = offer.releaseDate ? new Date(offer.releaseDate) < new Date() : false;
  const isPreOrder = offer.prePurchase;
  const isFree = price?.price.discountPrice === 0;

  if (!price) return null;

  const discountTextSizes = {
    xs: "text-[0.65rem]",
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
    xl: "text-sm",
  };

  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const formatPrice = (amount: number) =>
    fmt.format(calculatePrice(amount, price.price.currencyCode));

  const isDiscounted = price.price.discount > 0;

  const renderPrice = () => (
    <>
      {isFree ? (
        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20 tabular-nums">
          Free
        </span>
      ) : (
        <span className="font-semibold text-foreground tabular-nums">
          {formatPrice(price.price.discountPrice)}
        </span>
      )}
      {isDiscounted && (
        <span
          className={cn(
            "line-through text-muted-foreground tabular-nums",
            discountTextSizes[size] ?? discountTextSizes.xl,
          )}
        >
          {formatPrice(price.price.originalPrice)}
        </span>
      )}
    </>
  );

  const renderDiscountBadge = () => (
    <span className="inline-flex shrink-0 items-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm tabular-nums">
      {`-${Math.round(
        ((price.price.originalPrice - price.price.discountPrice) / price.price.originalPrice) * 100,
      )}%`}
    </span>
  );

  return (
    <div
      className={cn(
        "z-10 flex w-full items-center justify-between gap-2 font-semibold tabular-nums",
        textSizes[size] ?? textSizes.xl,
      )}
    >
      <div className="inline-flex items-center gap-2">
        {isReleased ? (
          renderPrice()
        ) : isPreOrder ? (
          renderPrice()
        ) : price.price.discountPrice !== 0 ? (
          renderPrice()
        ) : (
          <span className="text-xs font-medium text-muted-foreground">Coming Soon</span>
        )}
      </div>
      {price.price.discount > 0 && renderDiscountBadge()}
    </div>
  );
}
