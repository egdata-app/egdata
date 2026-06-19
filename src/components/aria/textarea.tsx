import * as React from "react";
import { TextArea as AriaTextArea } from "react-aria-components";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<typeof AriaTextArea>) {
  return (
    <AriaTextArea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-stroke-default bg-surface-raised px-3 py-2 text-base text-text-primary shadow-panel transition-[background-color,border-color,box-shadow,color] outline-none placeholder:text-text-subtle focus-visible:border-interactive focus-visible:ring-interactive/25 focus-visible:ring-[3px] aria-invalid:border-danger aria-invalid:ring-danger/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
