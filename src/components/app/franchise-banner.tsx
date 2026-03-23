import { Link } from "@tanstack/react-router";
import type { Franchise } from "@/types/franchise";
import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import type { SingleOffer } from "@/types/single-offer";
import { getImage } from "@/lib/getImage";
import { useCountry } from "@/hooks/use-country";
import { cn } from "@/lib/utils";

export const FranchiseBanner = ({ franchise }: { franchise: Franchise }) => {
  const { country } = useCountry();

  // Try to find an offer with an image to show as background
  // we pick the first one that has a DieselStoreFrontWide or OfferImageWide
  const offerToFetchId = franchise.offers[0];

  const { data: offer } = useQuery({
    queryKey: ["offer", { id: offerToFetchId, country }],
    queryFn: () =>
      httpClient.get<SingleOffer>(`/offers/${offerToFetchId}`, {
        params: { country },
      }),
    enabled: !!offerToFetchId,
  });

  const backgroundImage = offer
    ? getImage(offer.keyImages, ["DieselStoreFrontWide", "OfferImageWide"])?.url
    : null;

  return (
    <Link
      to="/franchises/$id"
      params={{ id: franchise._id }}
      className="block w-full mt-2 group overflow-hidden rounded-lg relative min-h-[60px] bg-secondary/20 border border-secondary/30"
    >
      {backgroundImage && (
        <div
          className="absolute -inset-8 z-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105 blur-2xl opacity-30"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      {/* Overlay to ensure text readability */}
      <div
        className={cn(
          "absolute inset-0 z-10 transition-colors duration-300",
          backgroundImage
            ? "bg-black/20 group-hover:bg-black/10"
            : "bg-black/20 group-hover:bg-black/10",
        )}
      />

      <div className="relative z-20 p-3 flex flex-col justify-center h-full">
        <span className="text-lg font-bold text-left text-gray-200 drop-shadow-md">
          Check the {franchise.name} Franchise
        </span>
      </div>
    </Link>
  );
};
