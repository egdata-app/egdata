import * as React from "react";
import { Label as AriaLabel } from "react-aria-components";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof AriaLabel>) {
  return (
    <AriaLabel
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
