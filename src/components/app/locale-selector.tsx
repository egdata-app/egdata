import * as React from "react";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
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
import { useLocale } from "@/hooks/use-locale";
import { SUPPORTED_LOCALES, getLocaleName } from "@/lib/supported-locales";

function LocaleSelectorImpl() {
  const [open, setOpen] = React.useState(false);
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  const current = locale ?? (typeof window !== "undefined" ? window.navigator.language : "en-US");

  const onSelect = React.useCallback(
    (currentName: string) => {
      const match = SUPPORTED_LOCALES.find((l) => l.name === currentName);
      if (match) {
        setLocale(match.code);
        setOpen(false);
      }
    },
    [setLocale],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-0 w-[130px] justify-between sm:w-[150px] md:w-[170px]"
        >
          <span className="min-w-0 truncate">{getLocaleName(current)}</span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        {open && (
          <Command>
            <CommandInput placeholder={t("nav.searchLanguages")} className="h-9" />
            <CommandList>
              <CommandEmpty>{t("nav.noLanguagesFound")}</CommandEmpty>
              <CommandGroup>
                {SUPPORTED_LOCALES.map((l) => (
                  <CommandItem
                    key={l.code}
                    value={l.name}
                    onSelect={onSelect}
                    className="flex items-center justify-between"
                  >
                    {l.name}
                    {current === l.code && <CheckIcon className="ml-auto h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const LocaleSelector = React.memo(LocaleSelectorImpl);
