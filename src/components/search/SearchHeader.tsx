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
  showSort: boolean;
  showViewToggle: boolean;
  mobileFilterButton?: React.ReactNode;
}

export function SearchHeader(props: SearchHeaderProps) {
  const { t } = useTranslation();
  const { view, setView } = usePreferences();
  const { query, setField, loading, title, showSort, showViewToggle, mobileFilterButton } = props;

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
      className={cn("flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}
    >
      <div className="flex min-w-0 flex-row items-center justify-between gap-2 sm:justify-start">
        <div className="flex min-w-0 flex-row items-center justify-start gap-2">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          {loading && (
            <svg
              className="-ml-1 mr-3 h-5 w-5 shrink-0 animate-spin text-foreground"
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
              value={query.sortBy ?? undefined}
              onValueChange={(value) => setField("sortBy", value as typeof query.sortBy)}
            >
              <SelectTrigger
                className="w-full min-w-0 sm:w-[180px]"
                aria-label={t("search.sort.sortAriaLabel")}
              >
                <SelectValue placeholder={t("search.sort.sortBy")} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sortByDisplay).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setField("sortDir", query.sortDir === "asc" ? "desc" : "asc")}
              variant="outline"
              className="w-9"
              aria-label={t("search.sort.sortDirectionAriaLabel")}
            >
              <ArrowDown
                className={cn(
                  "transition-transform duration-300 ease-in-out",
                  query.sortDir === "asc" ? "rotate-180" : "rotate-0",
                )}
              />
            </Button>
          </>
        )}
        {showViewToggle && (
          <Button
            variant="outline"
            className="h-9 w-9 p-0 hidden md:flex"
            onClick={() => setView(view === "grid" ? "list" : "grid")}
            aria-label={
              view === "grid" ? t("search.sort.showListView") : t("search.sort.showGridView")
            }
          >
            {view === "grid" ? (
              <ListBulletIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <GridIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
    </header>
  );
}
