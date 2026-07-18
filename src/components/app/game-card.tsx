import type { SingleOffer } from "@/types/single-offer";
import { CarouselItem } from "../ui/carousel";
import { Link } from "@/components/app/localized-link";
import { Card } from "../ui/card";
import { Image } from "./image";
import { getImage } from "@/lib/getImage";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
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
        className="w-full relative select-none group"
        preload="viewport"
        aria-label={`Open offer ${game.title}`}
      >
        <div className="relative w-full overflow-hidden rounded-md bg-card aspect-[3/4]">
          <Image
            src={getImage(game.keyImages, ["Thumbnail", "OfferImageTall"])?.url}
            alt={game.title}
            width={400}
            height={500}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3 z-10">
            <h3 className="text-lg font-display font-semibold text-foreground leading-tight line-clamp-2">
              {game.title}
            </h3>
            {game.seller && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
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

  return (
    <Link
      to="/{-$locale}/offers/$id"
      params={{ id: game.id }}
      className="w-full"
      preload="viewport"
      aria-label={`Open offer ${game.title}`}
    >
      <Card className="relative flex h-fit w-full flex-col rounded-md border-border/60 bg-card p-2 text-card-foreground md:flex-row">
        {/* Image Section */}
        <div className="relative inline-flex aspect-video w-full shrink-0 items-center justify-center md:w-72">
          <Image
            src={epicImage ?? "/300x150-egdata-placeholder.png"}
            alt={game.title}
            className="h-full w-full rounded-md object-cover"
            width={350}
            height={200}
          />
          {game.prePurchase && (
            <Badge
              variant="default"
              className="absolute top-2 left-2 text-sm bg-primary text-primary-foreground"
            >
              Pre-purchase
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="flex min-w-0 flex-grow flex-col justify-between p-2 md:ml-4">
          {/* Title and Tags */}
          <div className="flex min-w-0 items-start justify-between">
            <div className="flex min-w-0 flex-col">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="min-w-0 max-w-full truncate text-lg font-bold md:text-xl">
                  {game.title}
                </h2>
                <span className="hidden text-sm text-muted-foreground md:inline">-</span>
                <span className="text-sm text-muted-foreground">
                  {offersDictionary[game.offerType as keyof typeof offersDictionary] ||
                    game.offerType}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {game.tags
                  .filter((tag) => tag?.name)
                  .slice(0, 4)
                  ?.map((tag) => (
                    <Badge key={tag?.id} variant="secondary">
                      {tag?.name ?? "N/A"}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <div className="inline-flex gap-2 items-center justify-start my-2">
            <span className="text-sm text-muted-foreground">{game.seller.name}</span>
          </div>

          {/* Release Date */}
          <div className="inline-flex gap-2 items-center justify-start">
            <span className="text-sm text-muted-foreground">
              Release date:{" "}
              {new Date(game.releaseDate).toLocaleString("en-UK", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Giveaway Info */}
          {game.giveaway && (
            <div className="inline-flex gap-2 items-center justify-start mt-2">
              <span className="text-sm text-muted-foreground">
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
            </div>
          )}

          {/* Price and Sale Info */}
          {price && (
            <div className="mt-4 flex flex-wrap items-end justify-start gap-3 md:justify-end md:gap-4">
              {price.appliedRules.length > 0 && <SaleModule price={price} />}
              {price.price.originalPrice !== price.price.discountPrice && (
                <span className="line-through text-muted-foreground">
                  {priceFmtd.format(
                    calculatePrice(price.price.originalPrice, price.price.currencyCode),
                  )}
                </span>
              )}
              <span
                className={cn(
                  "text-lg font-bold",
                  price.price.originalPrice !== price.price.discountPrice
                    ? "text-primary"
                    : "text-foreground",
                )}
              >
                {priceFmtd.format(
                  calculatePrice(price.price.discountPrice, price.price.currencyCode),
                )}
              </span>
            </div>
          )}
        </div>

        {/* Platform Tags */}
        <span className="absolute right-0 top-0 p-3">
          {game.tags
            .filter((tag) => textPlatformIcons[tag?.name])
            .map((tag) => (
              <span key={tag?.id} className="inline-flex items-center gap-1">
                {textPlatformIcons[tag?.name]}
              </span>
            ))}
        </span>
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
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center">
        <span className="text-sm text-muted-foreground">
          ends in {relativeFutureDate(new Date(sale.endDate))} days
        </span>
      </div>
      <Badge variant="default" className="bg-primary text-primary-foreground text-sm">
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
