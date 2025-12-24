import type { SearchV2Response, Offer } from "@/types/search-v2";
import { GameCardSkeleton } from "@/components/app/offer-card";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import React from "react";

export interface SearchFormV2Props {
  query: Record<string, unknown>;
  onQueryChange: (newQuery: Partial<Record<string, unknown>>) => void;
  loading: boolean;
  results: SearchV2Response | null;
}

function formatPrice(offer: Offer) {
  if (!offer.price || !offer.price.price) return null;
  const { discountPrice, currencyCode } = offer.price.price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
  }).format(discountPrice / 100);
}

export function SearchFormV2({ query, onQueryChange, loading, results }: SearchFormV2Props) {
  // Extract pagination info
  const page = typeof query.page === "number" ? query.page : Number(query.page) || 1;
  const limit = results?.limit || 28;
  const total = results?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handler for page change
  const handlePageChange = (newPage: number) => {
    onQueryChange({ page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Create a static array for skeleton keys
  const skeletonKeys = Array.from({ length: limit }, (_, i) => `skeleton-${i}`);

  return (
    <div className="w-full">
      {loading && (
        <div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-2 lg:grid-cols-5">
          {skeletonKeys.map((key) => (
            <GameCardSkeleton key={key} />
          ))}
        </div>
      )}
      {!loading && results && results.offers.length === 0 && (
        <div className="text-center text-gray-400 py-12">No results found.</div>
      )}
      {!loading && results && results.offers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-2 lg:grid-cols-5">
          {results.offers.map((offer: Offer) => (
            <div key={offer.id} className="bg-card rounded-xl p-4 flex flex-col items-start">
              <img
                src={offer.keyImages?.[0]?.url}
                alt={offer.title}
                className="w-full h-48 object-cover rounded-lg mb-2"
                loading="lazy"
              />
              <h3 className="text-lg font-bold truncate w-full">{offer.title}</h3>
              <div className="text-sm text-gray-400 truncate w-full">{offer.seller?.name}</div>
              <div className="text-primary font-semibold mt-2">{formatPrice(offer)}</div>
            </div>
          ))}
        </div>
      )}
      {results && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <DynamicPagination
            currentPage={page}
            totalPages={totalPages}
            setPage={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
