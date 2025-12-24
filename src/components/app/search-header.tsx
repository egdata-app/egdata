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

const sortByDisplay: Record<string, string> = {
  releaseDate: "Release Date",
  lastModifiedDate: "Modified Date",
  effectiveDate: "Effective Date",
  creationDate: "Creation Date",
  viewableDate: "Viewable Date",
  pcReleaseDate: "PC Release Date",
  upcoming: "Upcoming",
  price: "Price",
  discount: "Discount",
  discountPercent: "Discount %",
};

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

  return (
    <header className={cn("inline-flex items-center justify-between w-full gap-2", className)}>
      <div className="flex flex-row items-center justify-start gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {isFetching && (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
      <div className="flex flex-row items-center justify-start gap-2">
        {showSort && (
          <>
            <form.Field name="sortBy">
              {({ handleChange, state }) => (
                <Select
                  value={state.value}
                  onValueChange={(value) => handleChange(value as keyof typeof sortByDisplay)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortByDisplay &&
                      Object.entries(sortByDisplay).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </form.Field>
            <form.Field name="sortDir">
              {({ handleChange, state }) => (
                <Button
                  onClick={() => {
                    if (state.value === "asc") {
                      handleChange("desc");
                    } else {
                      handleChange("asc");
                    }
                  }}
                  variant="outline"
                  className="w-9"
                >
                  <ArrowDown
                    className={cn(
                      "transition-transform duration-300 ease-in-out",
                      state.value === "asc" ? "rotate-180" : "rotate-0",
                    )}
                  />
                </Button>
              )}
            </form.Field>
          </>
        )}
        {showViewToggle && (
          <Button
            variant="outline"
            className="h-9 w-9 p-0 hidden md:flex"
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
