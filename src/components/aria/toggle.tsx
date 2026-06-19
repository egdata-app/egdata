import * as React from "react";
import { ToggleButton } from "react-aria-components";

import { cn } from "@/lib/utils";

type ToggleVariant = "default" | "outline";
type ToggleSize = "default" | "sm" | "lg";

function toggleVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ToggleVariant | null;
  size?: ToggleSize | null;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-accent data-[selected]:text-accent-foreground data-[focus-visible]:ring-1 data-[focus-visible]:ring-ring [&_svg]:size-4 [&_svg]:shrink-0",
    variant === "outline" && "border border-input bg-transparent shadow-panel hover:bg-accent hover:text-accent-foreground",
    (variant ?? "default") === "default" && "bg-transparent hover:bg-muted hover:text-muted-foreground",
    (size ?? "default") === "default" && "h-9 min-w-9 px-2",
    size === "sm" && "h-8 min-w-8 px-1.5",
    size === "lg" && "h-10 min-w-10 px-2.5",
    className,
  );
}

function Toggle({
  className,
  variant,
  size,
  pressed,
  onPressedChange,
  ...props
}: React.ComponentProps<typeof ToggleButton> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}) {
  return (
    <ToggleButton
      isSelected={pressed}
      onChange={onPressedChange}
      className={toggleVariants({
        variant,
        size,
        className: typeof className === "string" ? className : undefined,
      })}
      {...(props as any)}
    />
  );
}

export { Toggle, toggleVariants };
