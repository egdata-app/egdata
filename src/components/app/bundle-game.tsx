import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCountry } from "@/hooks/use-country";
import buildImageUrl from "@/lib/build-image-url";
import { getImage } from "@/lib/getImage";
import { httpClient } from "@/lib/http-client";
import { internalNamespaces } from "@/lib/internal-namespaces";
import { cn } from "@/lib/utils";
import type { SingleOffer } from "@/types/single-offer";

export const OfferInBundle: React.FC<{ offer: SingleOffer }> = ({ offer }) => {
  const { country } = useCountry();
  const { data: bundles } = useQuery({
    queryKey: [
      "in-bundles",
      {
        id: offer.id,
        country,
      },
    ],
    queryFn: () =>
      httpClient.get<SingleOffer[]>(`/offers/${offer.id}/in-bundle`, {
        params: {
          country,
        },
      }),
  });

  if (
    offer.offerType === "BUNDLE" ||
    internalNamespaces.includes(offer.namespace) ||
    !bundles ||
    bundles?.length === 0
  ) {
    return null;
  }

  const bundle = bundles[0];

  const imageUrl =
    getImage(bundle.keyImages, ["DieselGameBox", "DieselGameBoxWide", "OfferImageWide"])?.url ||
    "https://cdn.egdata.app/placeholder-1080.webp";

  return (
    <Link
      className="flex items-center bg-gray-800 rounded-lg shadow-lg w-full h-16 relative overflow-hidden group"
      to="/offers/$id"
      params={{ id: bundle.id }}
      preload="viewport"
    >
      <span className="text-white font-bold absolute z-20 flex-col px-5 gap-1">
        <h6 className="text-xs">This offer is part of</h6>
        <h4 className="text-lg font-bold">{bundle.title}</h4>
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
          alt={bundle.title}
          className="rounded-lg h-full w-full absolute object-cover z-10 opacity-40 group-hover:opacity-75 transition-opacity duration-500"
          loading="lazy"
        />
      </div>
    </Link>
  );
};
