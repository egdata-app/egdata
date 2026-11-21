import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import debounce from "lodash.debounce";

interface Item {
  id: string;
  name: string;
  count?: number;
}

interface QuerySearchProps {
  queryKey: string[];
  fetchItems: (query: string) => Promise<Item[]>;
  name: string;
  value: string | undefined;
  setValue: (value: string) => void;
  initialItems?: Item[];
}

export function QuerySearch({
  queryKey,
  fetchItems,
  value,
  setValue,
  name,
  initialItems = [],
}: QuerySearchProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const { data: items = initialItems, isLoading } = useQuery({
    queryKey: [...queryKey, searchQuery],
    queryFn: () => fetchItems(searchQuery),
    enabled: open, // Only fetch when the popover is open
  });

  const handleSearch = React.useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const debouncedHandleSearch = React.useMemo(() => debounce(handleSearch, 300), [handleSearch]);

  React.useEffect(() => {
    return () => {
      debouncedHandleSearch.cancel();
    };
  }, [debouncedHandleSearch]);

  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button variant="outline" className="w-[250px] justify-between">
        {value ? items.find((item) => item.name === value)?.name : `Search ${name}`}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      <Popover className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Search items..."
            onChange={(e) => debouncedHandleSearch(e.target.value)}
          />
          <CommandList
            renderEmptyState={() => (
              <CommandEmpty>{isLoading ? "Loading..." : "No items found."}</CommandEmpty>
            )}
          >
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  id={item.id}
                  textValue={item.name}
                  onAction={() => {
                    setValue(item.name === value ? "" : item.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-grow">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </Popover>
    </PopoverTrigger>
  );
}
