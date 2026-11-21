"use client";

import * as React from "react";
import { cn } from "cn";
import {
  Focusable,
  Popover as PopoverPrimitive,
  PreviewTrigger as PreviewTriggerPrimitive,
  type PopoverProps as PopoverPrimitiveProps,
  type PreviewTriggerProps,
} from "react-aria-components";

/**
 * PreviewTrigger (React Aria's hover card) passes its trigger props through
 * context, so the trigger child has to consume them. TanStack links, table
 * rows and plain spans don't, which left every hover card dead. `Focusable`
 * merges the trigger props (hover/focus/press) into the child element, the
 * same way the tooltip wrapper does.
 */
function HoverCardTrigger({
  delay = 600,
  closeDelay = 200,
  children,
  ...props
}: PreviewTriggerProps) {
  const [trigger, ...preview] = React.Children.toArray(children);

  return (
    <PreviewTriggerPrimitive
      data-slot="hover-card-trigger"
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    >
      <Focusable>{trigger as React.ComponentProps<typeof Focusable>["children"]}</Focusable>
      {preview}
    </PreviewTriggerPrimitive>
  );
}

function HoverCard({
  className,
  placement = "bottom",
  offset = 4,
  crossOffset = 0,
  ...props
}: Omit<PopoverPrimitiveProps, "className"> & {
  className?: string;
}) {
  return (
    <PopoverPrimitive
      data-slot="hover-card-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "z-50 w-72 origin-(--trigger-anchor-point) rounded-lg bg-popover p-2.5 text-xs/relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  );
}

export { HoverCard, HoverCardTrigger };
