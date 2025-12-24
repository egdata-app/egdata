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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import debounce from "lodash.debounce";

interface Item {
  id: string;
  name: string;
  count?: number;
}

interface ExtendedSearchProps {
  items: Item[];
  name: string;
  value: string | undefined;
  setValue: (value: string) => void;
}

export function ExtendedSearch({ items, value, setValue, name }: ExtendedSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [filteredItems, setFilteredItems] = React.useState<Item[]>(items);

  const handleSearch = React.useCallback(
    (query: string) => {
      const filtered = items.filter((dev) => dev.name.toLowerCase().includes(query.toLowerCase()));
      setFilteredItems(filtered);
    },
    [items],
  );

  const debouncedHandleSearch = React.useMemo(() => debounce(handleSearch, 300), [handleSearch]);

  React.useEffect(() => {
    return () => {
      // Cleanup the debounce on unmount
      debouncedHandleSearch.cancel();
    };
  }, [debouncedHandleSearch]);

  React.useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          // biome-ignore lint/a11y/useSemanticElements: <explanation>
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
        >
          {value ? items.find((item) => item.name === value)?.name : `Search ${name}`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search items..." onValueChange={debouncedHandleSearch} />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
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
      </PopoverContent>
    </Popover>
  );
}
