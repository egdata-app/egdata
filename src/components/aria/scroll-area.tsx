import * as React from "react";

import { cn } from "@/lib/utils";

function ScrollArea({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="scroll-area" className={cn("relative overflow-auto", className)} {...props}>
      {children}
    </div>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal" }) {
  return (
    <div
      data-slot="scroll-bar"
      aria-hidden="true"
      className={cn(
        "hidden",
        orientation === "vertical" ? "h-full w-2.5 border-l border-l-transparent p-px" : "h-2.5 flex-col border-t border-t-transparent p-px",
        className,
      )}
      {...props}
    />
  );
}

export { ScrollArea, ScrollBar };
