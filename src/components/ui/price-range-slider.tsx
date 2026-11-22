import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  step: number;
  defaultValue: [number, number];
  onValueChange?: (value: [number, number]) => void;
  currency?: string;
}

export function PriceRangeSlider({
  min,
  max,
  step,
  defaultValue,
  onValueChange,
  currency,
}: PriceRangeSliderProps) {
  const { locale } = useLocale();
  const safeMax = Math.max(min, max);
  const clampPair = React.useCallback(
    (a: number, b: number): [number, number] => {
      const clampedMin = Math.max(min, Math.min(a, safeMax));
      const clampedMax = Math.max(clampedMin, Math.min(b, safeMax));
      return [clampedMin, clampedMax];
    },
    [min, safeMax],
  );

  const initialPair = clampPair(defaultValue[0] ?? min, defaultValue[1] ?? safeMax);
  const [priceRange, setPriceRange] = React.useState<[number, number]>(initialPair);
  const [minInput, setMinInput] = React.useState<string>(initialPair[0].toString());
  const [maxInput, setMaxInput] = React.useState<string>(initialPair[1].toString());

  const commitRange = React.useCallback(
    (nextMin: number, nextMax: number) => {
      const [clampedMin, clampedMax] = clampPair(nextMin, nextMax);
      setPriceRange([clampedMin, clampedMax]);
      setMinInput(clampedMin.toString());
      setMaxInput(clampedMax.toString());
      onValueChange?.([clampedMin * 100, clampedMax * 100]);
    },
    [clampPair, onValueChange],
  );

  // Update visual preview smoothly while dragging; only trigger search on release.
  const handleSliderChange = (values: number[]) => {
    if (!values || values.length < 2) return;
    const [nextMin, nextMax] = clampPair(values[0], values[1]);
    setPriceRange([nextMin, nextMax]);
    setMinInput(nextMin.toString());
    setMaxInput(nextMax.toString());
  };

  const handleSliderCommit = (values: number[]) => {
    if (!values || values.length < 2) return;
    commitRange(values[0], values[1]);
  };

  const commitInputs = () => {
    const parsedMin = Number.parseInt(minInput, 10);
    const parsedMax = Number.parseInt(maxInput, 10);
    const nextMin = Number.isNaN(parsedMin) ? min : parsedMin;
    const nextMax = Number.isNaN(parsedMax) ? safeMax : parsedMax;
    commitRange(Math.min(nextMin, nextMax), Math.max(nextMin, nextMax));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitInputs();
      e.currentTarget.blur();
    }
  };

  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency ?? "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [locale, currency],
  );

  const currencySymbol = React.useMemo(
    () =>
      formatter
        .format(0)
        .replace(/[\d.,\s]/g, "")
        .trim() || "$",
    [formatter],
  );

  const isFiltered = priceRange[0] > min || priceRange[1] < safeMax;

  const presets = React.useMemo(() => {
    const items: Array<{ label: string; range: [number, number] }> = [];
    if (min === 0) {
      items.push({ label: "Free", range: [0, 0] });
    }
    for (const cap of [10, 20, 50]) {
      if (cap > min && cap < safeMax) {
        items.push({ label: `≤ ${formatter.format(cap)}`, range: [min, cap] });
      }
    }
    return items;
  }, [min, safeMax, formatter]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-foreground">Price Range</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {priceRange[0] === 0 && priceRange[1] === 0
              ? "Free"
              : `${formatter.format(priceRange[0])} – ${formatter.format(priceRange[1])}`}
          </span>
          {isFiltered && (
            <button
              type="button"
              onClick={() => commitRange(min, safeMax)}
              className="cursor-pointer text-xs font-medium text-primary transition-colors duration-150 hover:text-primary/80"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="px-1 py-2">
        <SliderPrimitive.Root
          className="relative flex h-5 w-full touch-none select-none items-center"
          defaultValue={initialPair}
          value={priceRange}
          min={min}
          max={safeMax}
          step={step}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          aria-label="Price Range"
        >
          <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className="block size-4 cursor-grab rounded-full border-2 border-primary bg-background shadow-md transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-110 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
            aria-label="Min price"
          />
          <SliderPrimitive.Thumb
            className="block size-4 cursor-grab rounded-full border-2 border-primary bg-background shadow-md transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-110 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
            aria-label="Max price"
          />
        </SliderPrimitive.Root>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor="min-price" className="text-[11px] font-medium text-muted-foreground">
            Min
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/80">
              {currencySymbol}
            </span>
            <Input
              id="min-price"
              type="number"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              onBlur={commitInputs}
              onKeyDown={handleInputKeyDown}
              className="h-8 rounded-lg border-border/70 bg-background/70 ps-7 pe-2 text-end text-xs tabular-nums transition-colors duration-150 focus-visible:border-primary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              min={min}
              max={safeMax}
              inputMode="numeric"
            />
          </div>
        </div>

        <span className="pb-1.5 text-xs text-muted-foreground/60" aria-hidden="true">
          –
        </span>

        <div className="grid gap-1">
          <Label htmlFor="max-price" className="text-[11px] font-medium text-muted-foreground">
            Max
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/80">
              {currencySymbol}
            </span>
            <Input
              id="max-price"
              type="number"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onBlur={commitInputs}
              onKeyDown={handleInputKeyDown}
              className="h-8 rounded-lg border-border/70 bg-background/70 ps-7 pe-2 text-end text-xs tabular-nums transition-colors duration-150 focus-visible:border-primary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              min={min}
              max={safeMax}
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {presets.map((preset) => {
            const active = priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1];
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => commitRange(preset.range[0], preset.range[1])}
                className={cn(
                  "cursor-pointer rounded-full border px-2.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors duration-150",
                  active
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-white/10 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
