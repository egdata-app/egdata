import * as React from "react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/aria/toggle";

const ToggleGroupContext = React.createContext<{ variant?: "default" | "outline"; size?: "default" | "sm" | "lg" }>({});

function ToggleGroup({
  className,
  variant,
  size,
  value,
  onValueChange,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ToggleButtonGroup>, "children"> & {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children?: React.ReactNode;
}) {
  return (
    <ToggleButtonGroup
      selectedKeys={Array.isArray(value) ? value : value ? [value] : undefined}
      onSelectionChange={(keys) => onValueChange?.(Array.from(keys).map(String))}
      className={cn("flex items-center justify-center gap-1", className)}
      {...(props as any)}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleButtonGroup>
  );
}

function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleButton> & {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleButton
      className={toggleVariants({
        variant: context.variant ?? variant,
        size: context.size ?? size,
        className: typeof className === "string" ? className : undefined,
      })}
      {...(props as any)}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
