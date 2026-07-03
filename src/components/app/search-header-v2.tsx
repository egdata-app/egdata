import type { SearchV2Response } from "@/types/search-v2";
import React from "react";
import { useTranslation } from "@/lib/paraglide-react";

export interface SearchHeaderV2Props {
  query: Record<string, unknown>;
  loading: boolean;
  results: SearchV2Response | null;
}

export function SearchHeaderV2({ query, loading, results }: SearchHeaderV2Props) {
  const { t } = useTranslation();
  const queryString = typeof query.q === "string" ? query.q : undefined;
  return (
    <header className="flex flex-col gap-2 w-full">
      <div className="flex flex-row items-center gap-4">
        <h2 className="text-2xl font-bold">
          {results
            ? t("components.searchHeader.results", { count: results.total })
            : t("common.search")}
        </h2>
        {loading && <span className="text-primary animate-pulse">{t("common.loading")}</span>}
      </div>
      {queryString && (
        <div className="text-muted-foreground text-sm">
          {t("components.searchHeader.showingResultsFor")}{" "}
          <span className="font-semibold">{queryString}</span>
        </div>
      )}
    </header>
  );
}
