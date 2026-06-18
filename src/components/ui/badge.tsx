import * as React from "react";
import { Badge as HeroBadge } from "@heroui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold w-fit whitespace-nowrap shrink-0 gap-1 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-white/10 text-white",
        destructive: "border-transparent bg-destructive text-white",
        outline: "border-white/15 bg-white/5 text-white/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <HeroBadge className={cn(badgeVariants({ variant }), className)} {...(props as any)} />;
}

export { Badge, badgeVariants };
