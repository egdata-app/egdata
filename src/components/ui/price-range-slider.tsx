import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { useLocale } from "@/hooks/use-locale";
// import { calculatePrice } from '@/lib/calculate-price';
import { Input } from "./input";
import { Button } from "./button";
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
  const [priceRange, setPriceRange] = React.useState<[number, number]>(defaultValue);
  const [minInput, setMinInput] = React.useState<string>(defaultValue[0]?.toString() ?? "");
  const [maxInput, setMaxInput] = React.useState<string>(defaultValue[1]?.toString() ?? "");

  const handleSliderChange = (values: number[]) => {
    if (!values || values.length < 2) return;
    const [min, max] = values as [number, number];
    setPriceRange([min, max]);
    setMinInput(min.toString());
    setMaxInput(max.toString());
    if (onValueChange) onValueChange([min * 100, max * 100]);
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMinInput(value);
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxInput(value);
  };

  const handleInputBlur = () => {
    let minVal = Number.isNaN(Number.parseInt(minInput)) ? min : Number.parseInt(minInput);
    let maxVal = Number.isNaN(Number.parseInt(maxInput)) ? max : Number.parseInt(maxInput);

    // Ensure min doesn't exceed max
    if (minVal > maxVal) {
      minVal = maxVal;
      setMinInput(minVal.toString());
    }

    // Ensure values are within bounds
    if (minVal < min) minVal = min;
    if (maxVal > max) maxVal = max;

    setPriceRange([minVal, maxVal]);
    setMinInput(minVal.toString());
    setMaxInput(maxVal.toString());

    if (onValueChange) onValueChange([minVal * 100, maxVal * 100]);
  };

  const handleApply = () => {
    handleInputBlur();
  };

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency ?? "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium mb-2">Price Range</h3>
        <div className="py-6">
          <SliderPrimitive.Root
            className="relative flex items-center select-none touch-none w-full h-5"
            defaultValue={defaultValue}
            value={priceRange}
            min={min}
            max={max}
            step={step}
            onValueChange={handleSliderChange}
            aria-label="Price Range"
          >
            <SliderPrimitive.Track className="bg-slate-900 relative grow rounded-full h-[3px]">
              <SliderPrimitive.Range className="absolute bg-slate-200 rounded-full h-full" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
              className="block h-5 w-5 rounded-full border-2 border-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              aria-label="Min price"
            />
            <SliderPrimitive.Thumb
              className="block h-5 w-5 rounded-full border-2 border-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              aria-label="Max price"
            />
          </SliderPrimitive.Root>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="grid gap-1.5 w-full">
          <Label htmlFor="min-price" className="text-xs">
            Min
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {formatter.format(0).replace(/\d/g, "").trim()}
            </span>
            <Input
              id="min-price"
              type="number"
              value={minInput}
              onChange={handleMinInputChange}
              onBlur={handleInputBlur}
              className="pl-10 text-right"
              min={min}
              max={max}
              inputMode="text"
            />
          </div>
        </div>

        <div className="pt-5 px-1">—</div>

        <div className="grid gap-1.5 w-full">
          <Label htmlFor="max-price" className="text-xs">
            Max
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {formatter.format(0).replace(/\d/g, "").trim()}
            </span>
            <Input
              id="max-price"
              type="number"
              value={maxInput}
              onChange={handleMaxInputChange}
              onBlur={handleInputBlur}
              className="pl-10 text-right"
              min={min}
              max={max}
              inputMode="text"
            />
          </div>
        </div>
      </div>

      <Button onClick={handleApply} className="w-full">
        Apply Filter
      </Button>
    </div>
  );
}
