import type { FormApi } from "@tanstack/react-form";
import type { TypeOf } from "zod";
import { usePreferences } from "@/hooks/use-preferences";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowDown, GridIcon } from "lucide-react";
import { ListBulletIcon } from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { formSchema } from "./search-form";
import { useTranslation } from "@/lib/paraglide-react";

const sortByKeys = [
  "releaseDate",
  "lastModifiedDate",
  "effectiveDate",
  "creationDate",
  "viewableDate",
  "pcReleaseDate",
  "upcoming",
  "price",
  "discount",
  "discountPercent",
] as const;

export type SearchHeaderProps = {
  // @ts-expect-error
  form: FormApi<TypeOf<typeof formSchema>>;
  title?: string;
  showSort?: boolean;
  showViewToggle?: boolean;
  className?: string;
  isFetching?: boolean;
};

export function SearchHeader({
  form,
  title = "Search",
  showSort = true,
  showViewToggle = true,
  className,
  isFetching = false,
}: SearchHeaderProps) {
  const { view, setView } = usePreferences();
  const { t } = useTranslation();

  return (
    <header
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4",
        className,
      )}
    >
      <div className="flex flex-row items-center justify-start gap-2.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {isFetching && (
          <svg
            className="h-4 w-4 animate-spin text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
      <div className="flex flex-wrap items-center justify-start gap-2">
        {showSort && (
          <>
            <form.Field name="sortBy">
              {({ handleChange, state }: any) => (
                <Select
                  value={state.value}
                  onChange={(value) => {
                    if (value !== null) handleChange(String(value) as (typeof sortByKeys)[number]);
                  }}
                  placeholder={t("search.sort.sortBy")}
                >
                  <SelectTrigger className="h-9 w-[180px] rounded-lg border-border/60 bg-card/80 text-sm transition-colors hover:bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortByKeys.map((key) => (
                      <SelectItem key={key} id={key}>
                        {t(`search.sort.${key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </form.Field>
            <form.Field name="sortDir">
              {({ handleChange, state }: any) => (
                <Button
                  onPress={() => {
                    if (state.value === "asc") {
                      handleChange("desc");
                    } else {
                      handleChange("asc");
                    }
                  }}
                  variant="outline"
                  aria-label={state.value === "asc" ? "Sort ascending" : "Sort descending"}
                  className="h-9 w-9 rounded-lg border-border/60 bg-card/80 transition-colors hover:bg-card"
                >
                  <ArrowDown
                    className={cn(
                      "transition-transform duration-300 ease-in-out",
                      state.value === "asc" ? "rotate-180" : "rotate-0",
                    )}
                    aria-hidden="true"
                  />
                </Button>
              )}
            </form.Field>
          </>
        )}
        {showViewToggle && (
          <Button
            variant="outline"
            aria-label={view === "grid" ? "Switch to list view" : "Switch to grid view"}
            className="hidden h-9 w-9 rounded-lg border-border/60 bg-card/80 p-0 transition-colors hover:bg-card md:flex"
            onClick={() => setView(view === "grid" ? "list" : "grid")}
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
