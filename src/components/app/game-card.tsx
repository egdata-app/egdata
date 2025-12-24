import type { SingleOffer } from "@/types/single-offer";
import { CarouselItem } from "../ui/carousel";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "../ui/card";
import { Image } from "./image";
import { getImage } from "@/lib/getImage";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { offersDictionary } from "@/lib/offers-dictionary";
import { calculatePrice } from "@/lib/calculate-price";
import { textPlatformIcons } from "./platform-icons";
import { useLocale } from "@/hooks/use-locale";

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
      <Link to={`/offers/${game.id}`} className="w-96 relative select-none" preload="viewport">
        <Card className="w-72 lg:max-w-sm rounded-lg overflow-hidden shadow-lg">
          <Image
            src={getImage(game.keyImages, ["Thumbnail"])?.url}
            alt={game.title}
            width={400}
            height={500}
            className="w-full h-96 object-cover hover:scale-105 transition-transform duration-300"
          />
          <CardContent className="p-4 flex-grow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold max-w-xs truncate">{game.title}</h3>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2 h-full max-w-xs truncate">
              {game.seller && (
                <div className="text-sm text-gray-400">
                  {typeof game.seller === "string" ? game.seller : game.seller.name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
  const epicImage = getImage(game.keyImages, [
    "DieselGameBoxWide",
    "OfferImageWide",
    "TakeoverWide",
  ])?.url as string | undefined;

  const priceFmtd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: game.price?.price.currencyCode || "USD",
  });

  return (
    <Link to={`/offers/${game.id}`} className="w-full" preload="viewport">
      <Card className="flex flex-row w-full bg-card text-white p-2 rounded-lg h-fit relative">
        {/* Image Section */}
        <div className="flex-shrink-0 w-72 h-auto inline-flex items-center justify-center relative">
          <Image
            src={epicImage ?? "/300x150-egdata-placeholder.png"}
            alt={game.title}
            className="w-full object-cover rounded-lg"
            width={350}
            height={200}
          />
          {game.prePurchase && (
            <Badge variant="default" className="absolute top-2 left-2 text-sm">
              Pre-purchase
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-grow ml-4 p-2 w-full justify-between">
          {/* Title and Tags */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold truncate">{game.title}</h2>
                <span className="text-sm text-muted-foreground">-</span>
                <span className="text-sm text-muted-foreground">
                  {offersDictionary[game.offerType as keyof typeof offersDictionary] ||
                    game.offerType}
                </span>
              </div>
              <div className="flex flex-wrap mt-1 space-x-2">
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
          {game.price && (
            <div className="flex items-end justify-end space-x-4 mt-4">
              {game.price.appliedRules.length > 0 && <SaleModule game={game} />}
              {game.price.price.originalPrice !== game.price.price.discountPrice && (
                <span className="line-through text-muted-foreground">
                  {priceFmtd.format(
                    calculatePrice(game.price.price.originalPrice, game.price.price.currencyCode),
                  )}
                </span>
              )}
              <span
                className={cn(
                  "text-lg font-bold",
                  game.price.price.originalPrice !== game.price.price.discountPrice
                    ? "text-green-400"
                    : "text-white",
                )}
              >
                {priceFmtd.format(
                  calculatePrice(game.price.price.discountPrice, game.price.price.currencyCode),
                )}
              </span>
            </div>
          )}
        </div>

        {/* Platform Tags */}
        <span className="absolute top-0 right-0 p-3">
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
function SaleModule({ game }: { game: Pick<SingleOffer, "price"> }) {
  const sale = game.price?.appliedRules.find((rule) => {
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
      <Badge variant="default" className="bg-green-500 text-black text-sm">
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
