import * as React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
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
import { httpClient } from "@/lib/http-client";
import { useCountry } from "@/hooks/use-country";

/**
 * Retrieves a list of countries from the API
 * Uses localstorage if exists (TTL 1 week)
 */
async function getCountries(): Promise<string[]> {
  const isBrowser = typeof window !== "undefined";
  const cacheKey = "egdata:countries";
  const cache = isBrowser ? localStorage.getItem(cacheKey) : null;

  const currentDateTime = new Date().getTime();
  const cacheData = cache ? JSON.parse(cache) : null;
  const cacheDateTime = cacheData ? cacheData.exiresAt : null;

  if (cacheDateTime && currentDateTime < cacheDateTime) {
    return cacheData.data;
  }

  const response = await client.get<string[]>("/countries");
  const data = response.data;

  if (isBrowser) {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        exiresAt: new Date().setDate(new Date().getDate() + 7),
      }),
    );
  }

  return data;
}

export function CountriesSelector() {
  const [open, setOpen] = React.useState(false);
  const [countries, setCountries] = React.useState<
    {
      name: string;
      code: string;
    }[]
  >([]);
  const { country, setCountry } = useCountry();

  const regionNameFmt = new Intl.DisplayNames(["en"], { type: "region" });

  // biome-ignore lint/correctness/useExhaustiveDependencies: This effect should only run once
  React.useEffect(() => {
    getCountries().then((data) =>
      setCountries(data.map((c) => ({ name: regionNameFmt.of(c) as string, code: c }))),
    );
  }, []);

  // TODO: unknown country --> reset
  if (!countries.find((x) => x.code === country)) {
    // setCountry('US');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[170px] justify-between"
        >
          {regionNameFmt.of(country)}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search countries..." className="h-9" />
          <CommandList>
            <CommandEmpty>No countries found</CommandEmpty>
            <CommandGroup>
              {countries.map((c) => (
                <CommandItem
                  key={c.code}
                  value={c.name}
                  onSelect={(currentCountry: string) => {
                    const country = countries.find((c) => c.name === currentCountry);
                    if (country) {
                      setCountry(country.code);
                      setOpen(false);
                    }
                  }}
                  className="flex items-center justify-between"
                >
                  {c.name}
                  {country === c.code ? (
                    <CheckIcon className="ml-auto h-4 w-4" />
                  ) : (
                    <picture>
                      <source
                        type="image/webp"
                        srcSet={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.webp,
                          https://flagcdn.com/32x24/${c.code.toLowerCase()}.webp 2x,
                          https://flagcdn.com/48x36/${c.code.toLowerCase()}.webp 3x`}
                      />
                      <source
                        type="image/png"
                        srcSet={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.png,
                          https://flagcdn.com/32x24/${c.code.toLowerCase()}.png 2x,
                          https://flagcdn.com/48x36/${c.code.toLowerCase()}.png 3x`}
                      />
                      <img
                        src={`https://flagcdn.com/16x12/${c.code.toLowerCase()}.png`}
                        width="16"
                        height="12"
                        alt={c.name}
                      />
                    </picture>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
