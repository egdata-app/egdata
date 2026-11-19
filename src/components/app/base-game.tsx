import { Link } from "@/components/app/localized-link";
import { useQuery } from "@tanstack/react-query";
import buildImageUrl from "@/lib/build-image-url";
import { httpClient } from "@/lib/http-client";
import { getImage } from "@/lib/getImage";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { cn } from "@/lib/utils";
import type { SingleOffer } from "@/types/single-offer";

export const BaseGame: React.FC<{ offer: SingleOffer }> = ({ offer }) => {
  const shouldFetch =
    offer.offerType !== "BASE_GAME" && !internalNamespaces.includes(offer.namespace);
  const { data: game } = useQuery({
    queryKey: ["base-game", { namespace: offer.namespace }],
    queryFn: () => httpClient.v1Get<SingleOffer>(`/base-game/${offer.namespace}`).catch(() => null),
    enabled: shouldFetch,
  });

  if (!shouldFetch || !game) {
    return null;
  }

  const imageUrl =
    getImage(game.keyImages, ["DieselGameBox", "DieselGameBoxWide", "OfferImageWide"])?.url ||
    "https://cdn.egdata.app/placeholder-1080.webp";

  return (
    <Link
      className="flex items-center bg-muted rounded-lg shadow-lg w-full h-16 relative mt-2 overflow-hidden group"
      to="/{-$locale}/offers/$id"
      params={{ id: game.id }}
    >
      <span className="text-foreground font-bold absolute z-20 flex-col px-5 gap-1">
        <h6 className="text-xs">Check the base game</h6>
        <h4 className="text-lg font-bold">{game.title}</h4>
      </span>
      <span
        className={cn(
          "absolute inset-0 z-[11]",
          "from-gray-700/20 to-gray-700/20 backdrop-blur-sm",
          "group-hover:backdrop-blur-none transition-all duration-700",
          "bg-gradient-to-r group-hover:from-gray-700/30 group-hover:from-40% group-hover:to-transparent",
        )}
      />
      <div className="absolute inset-0">
        <img
          style={{
            objectFit: "cover",
          }}
          src={buildImageUrl(imageUrl, 500)}
          alt={game.title}
          className="rounded-lg h-full w-full absolute object-cover z-10 opacity-40 group-hover:opacity-75 transition-opacity duration-500"
          loading="lazy"
        />
      </div>
    </Link>
  );
};
