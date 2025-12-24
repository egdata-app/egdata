import type { TypeOf } from "zod";
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
  giveawayDate: "Giveaway Date",
};

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
}

export function SearchHeader(props: SearchHeaderProps) {
  const { view, setView } = usePreferences();
  const { query, setField, loading, title, showSort, showViewToggle } = props;

  return (
    <header className={cn("inline-flex items-center justify-between w-full gap-2")}>
      <div className="flex flex-row items-center justify-start gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {loading && (
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
            <Select
              value={query.sortBy ?? undefined}
              onValueChange={(value) => setField("sortBy", value as typeof query.sortBy)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
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
