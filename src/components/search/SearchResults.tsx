import type { TypeOf } from "zod";
import { useTranslation } from "@/lib/paraglide-react";
import type { formSchema } from "@/stores/searchStore";
import type { NormalizedV1SearchResponse } from "@/lib/v1-adapters";
import { usePreferences } from "@/hooks/use-preferences";
import { cn } from "@/lib/utils";
import { GameCardSkeleton, OfferCard } from "@/components/app/offer-card";
import { OfferListItem } from "@/components/app/game-card";
import { DynamicPagination } from "@/components/app/dynamic-pagination";
import { DEFAULT_LIMIT } from "@/stores/searchStore";
import type { SingleOffer } from "@/types/single-offer";
import { SearchX } from "lucide-react";

export interface SearchResultsProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  results: NormalizedV1SearchResponse | null | undefined;
}

export function SearchResults(props: SearchResultsProps) {
  const { t } = useTranslation();
  const { view } = usePreferences();
  const { query, setField, loading, results } = props;
  const offers = Array.isArray(results?.offers) ? results.offers : [];

  if (loading && !results) {
    return (
      <div
        className={cn(
          "w-full",
          view === "grid"
            ? "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
            : "flex flex-col gap-4",
        )}
      >
        {Array.from({ length: 16 }).map((_, i) => (
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

  if (!results || offers.length === 0) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-card/60 px-6 py-16 text-center">
        <span className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-background/70 text-muted-foreground">
          <SearchX className="size-5" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {t("search.results.noResults")}
        </span>
      </div>
    );
  }

  return (
    <section className="flex w-full flex-col gap-6">
      <div
        className={cn(
          view === "grid"
            ? "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
            : "flex flex-col gap-4",
        )}
      >
        {offers.map((offer) => {
          if (view === "grid") {
            return <OfferCard key={offer.id} offer={offer as unknown as SingleOffer} size="md" />;
          }

          return <OfferListItem key={offer.id} game={offer as unknown as SingleOffer} />;
        })}
      </div>
      <DynamicPagination
        cursorMode
        currentPage={results.page ?? query.page ?? 1}
        totalPages={results.totalPages ?? Math.ceil(results.total / (query.limit ?? DEFAULT_LIMIT))}
        hasMore={results.hasMore}
        setPage={(page) => setField("page", page)}
      />
    </section>
  );
}
