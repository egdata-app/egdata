import * as React from "react";
import { Slider as AriaSlider, SliderOutput, SliderThumb, SliderTrack } from "react-aria-components";

import { cn } from "@/lib/utils";

function Slider({
  className,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  minValue,
  maxValue,
  step,
  ...props
}: Omit<React.ComponentProps<typeof AriaSlider>, "value" | "defaultValue" | "onChange" | "children"> & {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  name?: string;
}) {
  return (
    <AriaSlider
      value={value}
      defaultValue={defaultValue}
      onChange={(next) => onValueChange?.(Array.isArray(next) ? next : [next])}
      minValue={minValue ?? min}
      maxValue={maxValue ?? max}
      step={step}
      className={cn("relative flex w-full touch-none select-none flex-col gap-2", className)}
      {...(props as any)}
    >
      <SliderOutput className="sr-only" />
      <SliderTrack className="relative h-1.5 w-full grow rounded-full bg-interactive-muted">
        {({ state }) => (
          <>
            <div
              className="absolute h-full rounded-full bg-interactive"
              style={{
                left: `${state.getThumbPercent(0) * 100}%`,
                width: `${(state.getThumbPercent(state.values.length - 1) - state.getThumbPercent(0)) * 100 || state.getThumbPercent(0) * 100}%`,
              }}
            />
            {state.values.map((_, index) => (
              <SliderThumb key={index} index={index} className="top-1/2 block size-4 rounded-full border border-interactive/60 bg-text-primary shadow-panel transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-interactive/35" />
            ))}
          </>
        )}
      </SliderTrack>
    </AriaSlider>
  );
}

export { Slider };
