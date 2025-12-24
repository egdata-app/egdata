import { Link } from "@tanstack/react-router";
import buildImageUrl from "@/lib/build-image-url";
import { calculatePrice } from "@/lib/calculate-price";
import { getImage } from "@/lib/getImage";
import { cn } from "@/lib/utils";
import type { SingleOffer } from "@/types/single-offer";
import { useLocale } from "@/hooks/use-locale";

export const StyledSmallCard: React.FC<{
  offer: SingleOffer;
  title: string;
  showPrice?: boolean;
}> = ({ offer, title, showPrice = false }) => {
  const { locale } = useLocale();
  const imageUrl =
    getImage(offer.keyImages, ["DieselGameBox", "DieselGameBoxWide", "OfferImageWide"])?.url ||
    "https://cdn.egdata.app/placeholder-1080.webp";

  return (
    <Link
      className="flex items-center justify-between bg-gray-800 rounded-lg shadow-lg w-full h-16 relative overflow-hidden group"
      to={`/offers/${offer.id}`}
      preload="viewport"
    >
      <span className="text-white font-bold flex flex-col px-5 gap-1 z-10">
        <h6 className="text-xs">{title}</h6>
        <h4 className="text-lg font-bold truncate max-w-[175px] w-full">{offer.title}</h4>
      </span>
      {showPrice && offer.price && (
        <span className="text-white font-bold flex flex-col px-5 gap-1 z-10">
          {offer.price?.price.discount > 0 && (
            <span className="text-xs text-gray-100/50 line-through">
              {Intl.NumberFormat(locale, {
                style: "currency",
                currency: offer.price.price.currencyCode,
              }).format(
                calculatePrice(offer.price.price.originalPrice, offer.price?.price.currencyCode),
              )}
            </span>
          )}
          <h4 className="text-lg font-bold">
            {Intl.NumberFormat(locale, {
              style: "currency",
              currency: offer.price.price.currencyCode,
            }).format(
              calculatePrice(offer.price.price.discountPrice, offer.price?.price.currencyCode),
            )}
          </h4>
        </span>
      )}
      <span
        className={cn(
          "absolute inset-0 z-[9]",
          "from-gray-700/20 to-gray-700/20 backdrop-blur-sm",
          "group-hover:backdrop-blur-[0.5px] transition-all duration-700",
          "bg-gradient-to-r group-hover:from-gray-700/30 group-hover:from-40% group-hover:to-transparent",
        )}
      />
      <div className="absolute inset-0 z-0">
        <img
          style={{
            objectFit: "cover",
          }}
          src={buildImageUrl(imageUrl, 500)}
          alt={offer.title}
          className="rounded-lg h-full w-full absolute object-cover z-10 opacity-40 group-hover:opacity-75 transition-opacity duration-500"
          loading="lazy"
        />
      </div>
    </Link>
  );
};
