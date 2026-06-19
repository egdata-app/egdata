import * as React from "react";
import { ProgressBar } from "react-aria-components";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<typeof ProgressBar>, "children"> & { value?: number | null }) {
  return (
    <ProgressBar value={value ?? 0} data-slot="progress" className={cn("relative h-2 w-full overflow-hidden rounded-full bg-interactive-muted", className)} {...props}>
      {({ percentage }) => (
        <div className="h-full w-full flex-1 bg-interactive transition-all" style={{ transform: `translateX(-${100 - (percentage || 0)}%)` }} />
      )}
    </ProgressBar>
  );
}

export { Progress };
