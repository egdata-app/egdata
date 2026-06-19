import * as React from "react";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";

import { cn } from "@/lib/utils";
import { isNativeElement, PressableSlot } from "@/components/aria/pressable-slot";

function Popover({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <AriaDialogTrigger isOpen={open} onOpenChange={onOpenChange}>
      {children}
    </AriaDialogTrigger>
  );
}

function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof AriaButton> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    if (isNativeElement(children)) {
      const { isDisabled, onPress, ...triggerProps } = props;
      return (
        <PressableSlot
          isDisabled={isDisabled}
          onPress={onPress as any}
          {...(triggerProps as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </PressableSlot>
      );
    }

    return React.cloneElement(children, props as React.HTMLAttributes<HTMLElement>);
  }

  return <AriaButton {...props}>{children}</AriaButton>;
}

function PopoverContent({
  className,
  align = "center",
  side,
  sideOffset = 4,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AriaPopover>, "children"> & {
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  children?: React.ReactNode;
}) {
  const placement = side
    ? (`${side}${align && align !== "center" ? ` ${align}` : ""}` as const)
    : props.placement;

  return (
    <AriaPopover
      offset={sideOffset}
      placement={placement}
      crossOffset={align === "start" ? -12 : align === "end" ? 12 : 0}
      className={cn(
        "z-50 w-72 rounded-md egd-overlay p-4 outline-none data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95",
        className,
      )}
      {...(props as any)}
    >
      <AriaDialog className="outline-none">{children}</AriaDialog>
    </AriaPopover>
  );
}

function PopoverAnchor({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
