import * as React from "react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  checked,
  onCheckedChange,
  disabled,
  isDisabled,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "checked" | "disabled" | "onChange" | "type"> & {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  isDisabled?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const isIndeterminate = checked === "indeterminate";

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      data-slot="checkbox"
      checked={checked === "indeterminate" ? false : checked}
      disabled={isDisabled ?? disabled}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      className={cn(
        "peer size-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-stroke-strong bg-surface-raised shadow-panel outline-none transition-colors checked:border-interactive checked:bg-interactive checked:text-text-inverse disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-interactive/35",
        isIndeterminate && "border-interactive bg-interactive",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
