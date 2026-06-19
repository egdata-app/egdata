import * as React from "react";
import { Radio, RadioGroup as AriaRadioGroup } from "react-aria-components";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof AriaRadioGroup>, "onChange"> & {
  onValueChange?: (value: any) => void;
}) {
  return (
    <AriaRadioGroup
      className={cn("grid gap-2", className)}
      onChange={(value) => onValueChange?.(String(value))}
      {...(props as any)}
    />
  );
}

function RadioGroupItem({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Radio>, "children"> & { children?: React.ReactNode }) {
  return (
    <Radio
      className={cn(
        "group inline-flex items-center gap-2 text-sm text-text-secondary outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[selected]:text-text-primary",
        className,
      )}
      {...(props as any)}
    >
      <span className="flex size-4 items-center justify-center rounded-full border border-stroke-strong bg-surface-raised text-interactive shadow-panel group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-interactive/35 group-data-[selected]:border-interactive">
        <span className="hidden size-2 rounded-full bg-interactive group-data-[selected]:block" />
      </span>
      {children}
    </Radio>
  );
}

export { RadioGroup, RadioGroupItem };
