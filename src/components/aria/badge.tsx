import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-interactive/35 bg-interactive-muted text-interactive",
  secondary: "border-stroke-default bg-surface-raised text-text-secondary",
  destructive: "border-danger/35 bg-danger-muted text-danger",
  outline: "border-stroke-default bg-transparent text-text-secondary",
};

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
}) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors [&>svg]:size-3",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
