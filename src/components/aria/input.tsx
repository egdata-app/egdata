import * as React from "react";
import { Input as AriaInput } from "react-aria-components";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<typeof AriaInput>) {
  return (
    <AriaInput
      type={type}
      data-slot="input"
      className={cn(
        "selection:bg-interactive selection:text-text-inverse flex h-9 w-full min-w-0 rounded-md border border-stroke-default bg-surface-raised px-3 py-1 text-base text-text-primary shadow-panel transition-[background-color,border-color,box-shadow,color] outline-none placeholder:text-text-subtle file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-secondary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-interactive focus-visible:ring-interactive/25 focus-visible:ring-[3px] data-[focus-visible]:border-interactive data-[focus-visible]:ring-interactive/25 data-[focus-visible]:ring-[3px]",
        "aria-invalid:ring-danger/20 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
