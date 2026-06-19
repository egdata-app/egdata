import * as React from "react";
import { useLocale } from "@/hooks/use-locale";
import { Input } from "@/components/aria/input";
import { Button } from "@/components/aria/button";
import { Label } from "@/components/aria/label";
import { Slider } from "@/components/aria/slider";

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
    const [minValue, maxValue] = values as [number, number];
    setPriceRange([minValue, maxValue]);
    setMinInput(minValue.toString());
    setMaxInput(maxValue.toString());
    onValueChange?.([minValue * 100, maxValue * 100]);
  };

  const handleInputBlur = () => {
    let minVal = Number.isNaN(Number.parseInt(minInput)) ? min : Number.parseInt(minInput);
    let maxVal = Number.isNaN(Number.parseInt(maxInput)) ? max : Number.parseInt(maxInput);

    if (minVal > maxVal) minVal = maxVal;
    if (minVal < min) minVal = min;
    if (maxVal > max) maxVal = max;

    setPriceRange([minVal, maxVal]);
    setMinInput(minVal.toString());
    setMaxInput(maxVal.toString());
    onValueChange?.([minVal * 100, maxVal * 100]);
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
        <h3 className="mb-2 text-base font-medium">Price Range</h3>
        <div className="py-6">
          <Slider
            value={priceRange}
            minValue={min}
            maxValue={max}
            step={step}
            onValueChange={handleSliderChange}
            aria-label="Price Range"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="min-price" className="text-xs">
            Min
          </Label>
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              {formatter.format(0).replace(/\d/g, "").trim()}
            </span>
            <Input
              id="min-price"
              type="number"
              value={minInput}
              onChange={(event) => setMinInput(event.target.value)}
              onBlur={handleInputBlur}
              className="pl-10 text-right"
              min={min}
              max={max}
              inputMode="text"
            />
          </div>
        </div>

        <div className="px-1 pt-5">-</div>

        <div className="grid w-full gap-1.5">
          <Label htmlFor="max-price" className="text-xs">
            Max
          </Label>
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              {formatter.format(0).replace(/\d/g, "").trim()}
            </span>
            <Input
              id="max-price"
              type="number"
              value={maxInput}
              onChange={(event) => setMaxInput(event.target.value)}
              onBlur={handleInputBlur}
              className="pl-10 text-right"
              min={min}
              max={max}
              inputMode="text"
            />
          </div>
        </div>
      </div>

      <Button onPress={handleInputBlur} className="w-full">
        Apply Filter
      </Button>
    </div>
  );
}
