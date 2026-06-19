import * as React from "react";
import { Separator as AriaSeparator } from "react-aria-components";

import { cn } from "@/lib/utils";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof AriaSeparator> & {
  decorative?: boolean;
}) {
  return (
    <AriaSeparator
      data-slot="separator"
      orientation={orientation}
      aria-hidden={decorative || undefined}
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
