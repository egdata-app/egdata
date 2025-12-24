import type { TypeOf } from "zod";
import type { formSchema } from "@/stores/searchStore";
import type { SearchV2Response } from "@/types/search-v2";
import { usePreferences } from "@/hooks/use-preferences";
import { cn } from "@/lib/utils";
import { GameCardSkeleton, OfferCard } from "@/components/app/offer-card";
import { OfferListItem } from "@/components/app/game-card";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { DEFAULT_LIMIT } from "@/stores/searchStore";
import type { SingleOffer } from "@/types/single-offer";

export interface SearchResultsProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  results: SearchV2Response | null | undefined;
}

export function SearchResults(props: SearchResultsProps) {
  const { view } = usePreferences();
  const { query, setField, loading, results } = props;

  if (loading && !results) {
    return (
      <div
        className={cn(
          "w-full flex flex-col gap-4",
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            : "flex flex-col gap-4",
        )}
      >
        {Array.from({ length: 34 }).map((_, i) => (
          <GameCardSkeleton
            key={`skeleton-${
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              i
            }`}
          />
        ))}
      </div>
    );
  }

  if (!results || results.offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-gray-400">No results found</span>
      </div>
    );
  }

  return (
    <section className={cn("flex flex-col gap-4 w-full overflow-hidden")}>
      <div
        className={cn(
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            : "flex flex-col gap-4",
        )}
      >
        {results.offers.map((offer) => {
          if (view === "grid") {
            return <OfferCard key={offer.id} offer={offer as unknown as SingleOffer} size="md" />;
          }

          return <OfferListItem key={offer.id} game={offer as unknown as SingleOffer} />;
        })}
      </div>
      <DynamicPagination
        currentPage={query.page ?? 1}
        totalPages={Math.ceil(results.total / (query.limit ?? DEFAULT_LIMIT))}
        setPage={(page) => setField("page", page)}
      />
    </section>
  );
}
