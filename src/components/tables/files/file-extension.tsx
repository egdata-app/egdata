import type React from "react";
import { useState, useCallback, type KeyboardEvent, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { PlusCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import type { Column } from "@tanstack/react-table";

interface FileExtensionFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
}

export function FileExtensionFilter<TData, TValue>({
  column,
  title = "File Extensions",
}: FileExtensionFilterProps<TData, TValue>) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const extensions = (column?.getFilterValue() as string[]) ?? [];

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue) {
        e.preventDefault();
        const newExtension = inputValue.replace(/^\./, "");
        if (!extensions.includes(newExtension)) {
          const newExtensions = [...extensions, newExtension];
          column?.setFilterValue(newExtensions);
        }
        setInputValue("");
      }
    },
    [inputValue, extensions, column],
  );

  const removeExtension = useCallback(
    (ext: string) => {
      const newExtensions = extensions.filter((e) => e !== ext);
      column?.setFilterValue(newExtensions.length ? newExtensions : undefined);
    },
    [extensions, column],
  );

  const clearFilters = useCallback(() => {
    column?.setFilterValue(undefined);
  }, [column]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircledIcon className="mr-2 h-4 w-4" />
          {title}
          {extensions.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {extensions.length}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {extensions.length > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {extensions.length} selected
                  </Badge>
                ) : (
                  extensions.map((ext) => (
                    <Badge variant="secondary" key={ext} className="rounded-sm px-1 font-normal">
                      {ext}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2 relative">
          <div className="absolute inset-y-0 left-[17px] flex items-center pointer-events-none text-muted-foreground">
            .
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            className="h-8 pl-4"
            placeholder="extension"
          />
        </div>
        {extensions.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              {extensions.map((ext) => (
                <Badge key={ext} variant="secondary" className="m-1 pr-1.5">
                  .{ext}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-auto p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeExtension(ext)}
                  >
                    <Cross2Icon className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Separator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
