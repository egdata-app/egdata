import { Link } from "@tanstack/react-router";
import { Image } from "./image";
import { getImage } from "@/lib/getImage";
import { Skeleton } from "../ui/skeleton";
import type { SingleOffer } from "@/types/single-offer";
import { offersDictionary } from "@/lib/offers-dictionary";
import { useEffect, useMemo, useState } from "react";
import { useGenres } from "@/hooks/use-genres";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { calculatePrice } from "@/lib/calculate-price";
import { useLocale } from "@/hooks/use-locale";
import { platformIcons } from "./platform-icons";
import useExtension from "@/hooks/use-extension";

export function GameCard({ offer }: { offer: SingleOffer }) {
  const { locale } = useLocale();
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: offer.price?.price.currencyCode || "USD",
  });

  const isReleased = offer.releaseDate ? new Date(offer.releaseDate) < new Date() : false;
  const isPreOrder = offer.prePurchase;
  const isFree = offer.price?.price.discountPrice === 0;

  const gradientImage = getImage(offer.keyImages, [
    "OfferImageTall",
    "Thumbnail",
    "DieselGameBoxTall",
    "DieselStoreFrontTall",
  ])?.url;

  return (
    <Link
      to="/offers/$id"
      params={{ id: offer.id }}
      preload="viewport"
      aria-label={`Open offer ${offer.title}`}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-md bg-card aspect-[3/4] relative group">
        <Image
          src={gradientImage}
          quality="medium"
          alt={offer.title}
          width={400}
          height={500}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
        {offer.offerType && (
          <span className="absolute top-2 left-2 bg-background/60 backdrop-blur-sm text-foreground/90 text-[0.65rem] font-semibold px-2 py-1 rounded uppercase tracking-wide">
            {offersDictionary[offer.offerType as keyof typeof offersDictionary]}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 z-10">
          <h3 className="text-lg font-display font-semibold text-foreground leading-tight line-clamp-2">
            {offer.title}
          </h3>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">{offer.seller.name}</span>
            <div className="inline-flex items-center gap-2 justify-end">
              {isReleased && offer.price && (
                <>
                  {offer.price?.price.discount > 0 && (
                    <span className="text-xs text-muted-foreground line-through">
                      {fmt.format(offer.price?.price.originalPrice / 100)}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isFree || offer.price.price.discount > 0 ? "text-primary" : "text-foreground",
                    )}
                  >
                    {isFree ? "Free" : fmt.format(offer.price?.price.discountPrice / 100)}
                  </span>
                </>
              )}
              {!isReleased && isPreOrder && offer.price?.price.discountPrice !== undefined && (
                <span className="text-sm font-semibold text-foreground">
                  {fmt.format(offer.price.price.discountPrice / 100)}
                </span>
              )}
              {!isReleased && !isPreOrder && !offer.price && (
                <span className="text-sm font-semibold text-muted-foreground">Coming Soon</span>
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
    <div className="w-full max-w-sm overflow-hidden rounded-md bg-card aspect-[3/4] relative">
      <Skeleton className="w-full h-full absolute inset-0" />
    </div>
  );
}

const GRADIENT_TRANSITION_POINT = 0.1;
const NUM_STEPS = 10;
const GRADIENT_END_POINT = 0.8;

// Cubic easing function
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};

const gradientCache: Record<string, string> = {};

const extractGradient = async (imageSrc: string): Promise<string> => {
  if (gradientCache[imageSrc]) {
    return gradientCache[imageSrc];
  }

  return new Promise((resolve) => {
    if (imageSrc[0] === "/") {
      imageSrc = `https://egdata.app${imageSrc}`;
    }
    const imgUrl = new URL(imageSrc);
    imgUrl.searchParams.set("w", "1");
    imgUrl.searchParams.set("h", "1");
    imgUrl.searchParams.set("resize", "1");
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl.toString();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0, img.width, img.height);
      const imageData = ctx.getImageData(0, 0, img.width, img.height).data;

      let r = 0,
        g = 0,
        b = 0;
      const pixelCount = img.width * img.height;

      for (let i = 0; i < pixelCount * 4; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
      }

      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);

      const color = { r, g, b };
      const startColor = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
      const endColor = "rgba(0, 0, 0, 0)";

      let gradientSteps = `${startColor} 0%, `;
      for (let i = 1; i <= NUM_STEPS; i++) {
        const t = i / NUM_STEPS;
        const easedT = easeInOutCubic(t);
        const opacity = 1 - easedT;
        gradientSteps += `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity}) ${
          GRADIENT_TRANSITION_POINT * 100 +
          (i * ((GRADIENT_END_POINT - GRADIENT_TRANSITION_POINT) * 100)) / NUM_STEPS
        }%, `;
      }
      gradientSteps += `${endColor} ${GRADIENT_END_POINT * 100}%, ${endColor} 100%`;

      const gradient = `radial-gradient(ellipse at center top, ${gradientSteps})`;
      gradientCache[imageSrc] = gradient;
      resolve(gradient);
    };
  });
};

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
  content,
}: {
  offer: SingleOffer;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  content?: React.ReactNode;
}) {
  const { addId, removeId, ownedStatus } = useExtension();
  const { genres } = useGenres();
  const [gradient, setGradient] = useState<string | null>(null);

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
    if (import.meta.env.DEV) {
      setGradient(null);
      return;
    }
    extractGradient(gradientImage).then(setGradient);
  }, [gradientImage]);

  useEffect(() => {
    addId(offer.id, offer.namespace);
    return () => removeId(offer.id, offer.namespace);
  }, [addId, removeId, offer]);

  const owned = ownedStatus[`${offer.id}:${offer.namespace}`];

  return (
    <Link
      to="/offers/$id"
      params={{
        id: offer.id,
      }}
      preload="viewport"
      className="select-none group mx-auto w-fit md:w-full"
      viewTransition
      aria-label={`Open offer ${offer.title}`}
    >
      <div className="relative w-64 md:w-full overflow-hidden rounded-md bg-card aspect-[3/4]">
        <Image
          src={gradientImage}
          alt={offer.title}
          width={600}
          height={800}
          quality="high"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            backgroundImage: gradient ?? "linear-gradient(0deg, #000, #000)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            mixBlendMode: "screen",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
        {offer.offerType && (
          <span className="absolute top-2 left-2 bg-background/60 backdrop-blur-sm text-foreground/90 text-[0.65rem] font-semibold px-2 py-1 rounded uppercase tracking-wide">
            {offersDictionary[offer.offerType as keyof typeof offersDictionary]}
          </span>
        )}
        <OfferBadges offer={offer} owned={owned} />
        {!content && (
          <div className="absolute inset-x-0 bottom-0 p-3 z-10">
            <h3
              className={cn(
                "font-display font-semibold text-foreground leading-tight line-clamp-2 drop-shadow-md",
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
            <div className="mt-1 max-h-0 overflow-hidden group-hover:max-h-24 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
              <p className="text-xs text-muted-foreground mb-2">
                {offerGenres.length > 0
                  ? offerGenres.join(", ")
                  : offersDictionary[offer.offerType as keyof typeof offersDictionary]}
              </p>
            </div>
            <div className="mt-1.5">
              <OfferPrice offer={offer} size={size} />
            </div>
          </div>
        )}
        {content && <div className="absolute inset-x-0 bottom-0 p-3 z-10">{content}</div>}
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
      className="absolute top-2 right-2 bg-primary text-primary-foreground"
    >
      {badges.join(" - ")}
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
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency: offer.price?.price.currencyCode || "USD",
  });

  const isReleased = offer.releaseDate ? new Date(offer.releaseDate) < new Date() : false;
  const isPreOrder = offer.prePurchase;
  const isFree = offer.price?.price.discountPrice === 0;

  if (!offer.price) return null;

  const discountTextSizes = {
    xs: "text-[0.6rem]",
    sm: "text-[0.6rem]",
    md: "text-[0.8rem]",
    lg: "text-[1rem]",
    xl: "text-[1.125rem]",
  };

  const textSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-md",
    lg: "text-lg",
    xl: "text-xl",
  };

  const formatPrice = (price: number) =>
    fmt.format(calculatePrice(price, offer.price?.price.currencyCode ?? "USD"));

  const isDiscounted = (offer.price?.price.discount ?? 0) > 0;

  const renderPrice = () => (
    <>
      <span className={isFree || isDiscounted ? "text-primary" : "text-foreground"}>
        {isFree ? "Free" : formatPrice(offer.price?.price.discountPrice ?? 0)}
      </span>
      {isDiscounted && (
        <span
          className={cn(
            "line-through text-muted-foreground",
            discountTextSizes[size] ?? discountTextSizes.xl,
          )}
        >
          {formatPrice(offer.price?.price.originalPrice ?? 0)}
        </span>
      )}
    </>
  );

  const renderDiscountBadge = () => (
    <div className="text-xs inline-flex items-center rounded-full bg-primary text-primary-foreground px-2 py-1 font-semibold shadow-sm">
      {`-${Math.round(
        (((offer.price?.price.originalPrice ?? 0) - (offer.price?.price.discountPrice ?? 0)) /
          (offer.price?.price.originalPrice ?? 0)) *
          100,
      )}%`}
    </div>
  );

  return (
    <div
      className={cn(
        "text-lg font-bold inline-flex items-end gap-2 z-10 h-full justify-between",
        textSizes[size] ?? textSizes.xl,
      )}
    >
      <div className="inline-flex items-center gap-2">
        {isReleased ? (
          renderPrice()
        ) : isPreOrder ? (
          renderPrice()
        ) : offer.price && offer.price.price.discountPrice !== 0 ? (
          renderPrice()
        ) : (
          <span className="text-muted-foreground">Coming Soon</span>
        )}
      </div>
      {offer.price.price.discount > 0 && renderDiscountBadge()}
    </div>
  );
}
