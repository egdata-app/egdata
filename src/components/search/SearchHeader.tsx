import type { TypeOf } from "zod";
import type * as React from "react";
import { useTranslation } from "@/lib/paraglide-react";
import type { formSchema } from "@/stores/searchStore";
import { usePreferences } from "@/hooks/use-preferences";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ListBulletIcon } from "@radix-ui/react-icons";
import { GridIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown } from "lucide-react";

export interface SearchHeaderProps {
  query: TypeOf<typeof formSchema>;
  setField: <K extends keyof TypeOf<typeof formSchema>>(
    field: K,
    value: TypeOf<typeof formSchema>[K],
  ) => void;
  loading: boolean;
  title: string;
  totalCount?: number;
  showSort: boolean;
  showViewToggle: boolean;
  mobileFilterButton?: React.ReactNode;
}

export function SearchHeader(props: SearchHeaderProps) {
  const { t } = useTranslation();
  const { view, setView } = usePreferences();
  const {
    query,
    setField,
    loading,
    title,
    totalCount,
    showSort,
    showViewToggle,
    mobileFilterButton,
  } = props;

  const sortByDisplay: Record<string, string> = {
    releaseDate: t("search.sort.releaseDate"),
    lastModifiedDate: t("search.sort.lastModifiedDate"),
    effectiveDate: t("search.sort.effectiveDate"),
    creationDate: t("search.sort.creationDate"),
    viewableDate: t("search.sort.viewableDate"),
    pcReleaseDate: t("search.sort.pcReleaseDate"),
    upcoming: t("search.sort.upcoming"),
    price: t("search.sort.price"),
    discount: t("search.sort.discount"),
    discountPercent: t("search.sort.discountPercent"),
    giveawayDate: t("search.sort.giveawayDate"),
  };

  return (
    <header
      className={cn(
        "flex w-full flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 flex-row items-center justify-between gap-2.5 sm:justify-start">
        <div className="flex min-w-0 flex-row items-baseline justify-start gap-2.5">
          <h1 className="truncate font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {typeof totalCount === "number" && (
            <span className="shrink-0 rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {totalCount.toLocaleString()}
            </span>
          )}
          {loading && (
            <svg
              className="h-4 w-4 shrink-0 animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </div>
        {mobileFilterButton}
      </div>
      <div className="flex w-full flex-row items-center justify-start gap-2 sm:w-auto">
        {showSort && (
          <>
            <Select
              aria-label={t("search.sort.sortAriaLabel")}
              placeholder={t("search.sort.sortBy")}
              value={query.sortBy ?? null}
              onChange={(value) => setField("sortBy", (value ?? undefined) as typeof query.sortBy)}
            >
              <SelectTrigger className="w-full min-w-0 rounded-lg border-border/70 bg-card/80 transition-colors duration-150 hover:border-primary/50 hover:bg-card sm:w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortByDisplay).map(([key, value]) => (
                  <SelectItem key={key} id={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setField("sortDir", query.sortDir === "asc" ? "desc" : "asc")}
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-lg border-border/70 bg-card/80 transition-colors duration-150 hover:border-primary/50 hover:bg-card"
              aria-label={t("search.sort.sortDirectionAriaLabel")}
            >
              <ArrowDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200 ease-out",
                  query.sortDir === "asc" ? "rotate-180" : "rotate-0",
                )}
              />
            </Button>
          </>
        )}
        {showViewToggle && (
          <Button
            variant="outline"
            className="hidden h-9 w-9 shrink-0 rounded-lg border-border/70 bg-card/80 p-0 transition-colors duration-150 hover:border-primary/50 hover:bg-card md:flex"
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            aria-label={
              view === "grid" ? t("search.sort.showListView") : t("search.sort.showGridView")
            }
          >
            {view === "grid" ? (
              <ListBulletIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <GridIcon className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
