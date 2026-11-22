import type { SingleOffer } from "@/types/single-offer";
import { CarouselItem } from "../ui/carousel";
import { Link } from "@/components/app/localized-link";
import { Card } from "../ui/card";
import { Image } from "./image";
import { getImage } from "@/lib/getImage";
import { Badge } from "../ui/badge";
import { offersDictionary } from "@/lib/offers-dictionary";
import { calculatePrice } from "@/lib/calculate-price";
import { textPlatformIcons } from "./platform-icons";
import { useLocale } from "@/hooks/use-locale";
import { getEffectivePrice } from "@/lib/effective-price";
import type { Price } from "@/types/price";

export function GameCard({
  game,
}: {
  game: Pick<
    SingleOffer,
    "id" | "keyImages" | "title" | "seller" | "developerDisplayName" | "publisherDisplayName"
  >;
}) {
  return (
    <CarouselItem key={game.id} className="basis-1/1 lg:basis-1/4">
      <Link
        to="/{-$locale}/offers/$id"
        params={{ id: game.id }}
        className="group relative block w-full select-none focus-visible:outline-none"
        aria-label={`Open offer ${game.title}`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/10 bg-card/80 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35 group-focus-visible:border-primary">
          <Image
            src={getImage(game.keyImages, ["Thumbnail", "OfferImageTall"])?.url}
            alt={game.title}
            width={400}
            height={500}
            className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/45 via-40% to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 p-3.5">
            <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground line-clamp-2 transition-colors duration-200 group-hover:text-primary md:text-lg">
              {game.title}
            </h3>
            {game.seller && (
              <p className="mt-1 truncate text-xs text-muted-foreground/90">
                {typeof game.seller === "string" ? game.seller : game.seller.name}
              </p>
            )}
          </div>
        </div>
      </Link>
    </CarouselItem>
  );
}

export function OfferListItem({
  game,
}: {
  game: Pick<
    SingleOffer,
    | "id"
    | "keyImages"
    | "title"
    | "seller"
    | "developerDisplayName"
    | "publisherDisplayName"
    | "tags"
    | "releaseDate"
    | "price"
    | "offerType"
    | "prePurchase"
    | "giveaway"
  >;
}) {
  const { locale } = useLocale();
  const price = getEffectivePrice(game.price);
  const epicImage = getImage(game.keyImages, [
    "DieselGameBoxWide",
    "OfferImageWide",
    "TakeoverWide",
  ])?.url as string | undefined;

  const priceFmtd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price?.price.currencyCode || "USD",
  });

  const isFree = price?.price.discountPrice === 0;
  const isDiscounted = price ? price.price.originalPrice !== price.price.discountPrice : false;

  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{ id: game.id }}
      className="group block w-full focus-visible:outline-none"
      aria-label={`Open offer ${game.title}`}
    >
      <Card className="relative flex h-fit w-full flex-col gap-3 rounded-lg border border-white/10 bg-card/80 p-3 text-card-foreground shadow-sm transition-[box-shadow,border-color,background-color] duration-200 ease-out group-hover:bg-card group-hover:border-primary/60 group-hover:shadow-lg group-hover:shadow-black/35 group-focus-visible:border-primary md:flex-row md:gap-5 md:p-3.5">
        {/* Image Section */}
        <div className="relative inline-flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-muted/40 md:w-72">
          <Image
            src={epicImage ?? "/300x150-egdata-placeholder.png"}
            alt={game.title}
            className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.035]"
            width={350}
            height={200}
          />
          {game.prePurchase && (
            <Badge
              variant="default"
              className="absolute top-2.5 left-2.5 bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow-sm"
            >
              Pre-purchase
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="flex min-w-0 flex-grow flex-col justify-between py-0.5">
          {/* Title and Tags */}
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h2 className="font-display min-w-0 max-w-full truncate text-lg font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary md:text-xl">
                  {game.title}
                </h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {offersDictionary[game.offerType as keyof typeof offersDictionary] ||
                    game.offerType}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {game.tags
                  .filter((tag) => tag?.name)
                  .slice(0, 4)
                  ?.map((tag) => (
                    <Badge
                      key={tag?.id}
                      variant="secondary"
                      className="bg-secondary/70 font-normal text-secondary-foreground/90"
                    >
                      {tag?.name ?? "N/A"}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Platform Tags */}
            <div className="flex shrink-0 items-center gap-1.5 pt-1 text-muted-foreground">
              {game.tags
                .filter((tag) => textPlatformIcons[tag?.name])
                .map((tag) => (
                  <span key={tag?.id} className="inline-flex items-center gap-1">
                    {textPlatformIcons[tag?.name]}
                  </span>
                ))}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-1 text-xs md:text-sm text-muted-foreground">
              {/* Seller Info */}
              <span className="font-medium text-foreground/85">{game.seller.name}</span>

              {/* Release Date */}
              <span className="tabular-nums">
                Release date:{" "}
                {new Date(game.releaseDate).toLocaleString("en-UK", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              {/* Giveaway Info */}
              {game.giveaway && (
                <span className="tabular-nums">
                  Giveaway period:{" "}
                  {new Date(game.giveaway.startDate).toLocaleString("en-UK", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(game.giveaway.endDate).toLocaleString("en-UK", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            {/* Price and Sale Info */}
            {price && (
              <div className="flex flex-wrap items-center justify-start gap-2.5 tabular-nums md:justify-end">
                {price.appliedRules.length > 0 && <SaleModule price={price} />}
                {isDiscounted && (
                  <span className="text-sm text-muted-foreground line-through tabular-nums">
                    {priceFmtd.format(
                      calculatePrice(price.price.originalPrice, price.price.currencyCode),
                    )}
                  </span>
                )}
                {isFree ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/20 tabular-nums">
                    Free
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-foreground tabular-nums">
                    {priceFmtd.format(
                      calculatePrice(price.price.discountPrice, price.price.currencyCode),
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * Shows the 1st applied rule of the offer that the end date is not passed
 */
function SaleModule({ price }: { price: Price }) {
  const sale = price.appliedRules.find((rule) => {
    return new Date(rule.endDate) > new Date();
  });

  if (!sale) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground tabular-nums">
        ends in {relativeFutureDate(new Date(sale.endDate))} days
      </span>
      <Badge
        variant="default"
        className="bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums"
      >
        -{100 - sale.discountSetting.discountPercentage}%
      </Badge>
    </div>
  );
}

const relativeFutureDate = (date: Date) => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days;
};
