import * as React from "react";
import {
  Button as AriaButton,
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
} from "react-aria-components";
import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { isNativeElement, PressableSlot } from "@/components/aria/pressable-slot";

function DropdownMenu({ children }: { children?: React.ReactNode }) {
  return <MenuTrigger>{children}</MenuTrigger>;
}

function DropdownMenuTrigger({
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

function DropdownMenuContent({
  className,
  sideOffset = 4,
  side,
  align = "center",
  children,
  ...props
}: React.ComponentProps<typeof Popover> & {
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}) {
  const placement = side
    ? (`${side}${align && align !== "center" ? ` ${align}` : ""}` as const)
    : props.placement;

  return (
    <Popover
      offset={sideOffset}
      placement={placement}
      crossOffset={align === "start" ? -12 : align === "end" ? 12 : 0}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md egd-overlay p-1 outline-none data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95",
        className,
      )}
      {...(props as any)}
    >
      <Menu className="outline-none">{children}</Menu>
    </Popover>
  );
}

function DropdownMenuItem({
  className,
  inset,
  asChild,
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof MenuItem> & {
  inset?: boolean;
  asChild?: boolean;
  onClick?: React.MouseEventHandler;
}) {
  const child = React.isValidElement(children) ? (children as React.ReactElement<any>) : null;
  const href = asChild && child && "href" in child.props ? String(child.props.href) : undefined;
  const content = asChild && child ? child.props.children : children;
  const { onAction, ...menuProps } = props;

  return (
    <MenuItem
      href={href}
      onAction={() => {
        onClick?.({} as React.MouseEvent);
        onAction?.();
      }}
      className={cn(
        "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[focused]:bg-surface-hover data-[focused]:text-text-primary [&>svg]:size-4 [&>svg]:shrink-0",
        inset && "pl-8",
        className,
      )}
      {...(menuProps as any)}
    >
      {content}
    </MenuItem>
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "children"> & {
  children?: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <MenuItem
      onAction={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm text-text-secondary outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[focused]:bg-surface-hover data-[focused]:text-text-primary",
        className,
      )}
      {...(props as any)}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        {checked && <Check className="size-4" />}
      </span>
      {children}
    </MenuItem>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof MenuItem>, "children"> & { children?: React.ReactNode }) {
  return (
    <MenuItem
      className={cn("relative flex cursor-default items-center rounded-sm py-1.5 pr-2 pl-8 text-sm text-text-secondary outline-none data-[focused]:bg-surface-hover data-[focused]:text-text-primary", className)}
      {...(props as any)}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <Circle className="size-2 fill-current" />
      </span>
      {children}
    </MenuItem>
  );
}

function DropdownMenuLabel({ className, inset, ...props }: React.ComponentProps<typeof Header> & { inset?: boolean }) {
  return <Header className={cn("px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted", inset && "pl-8", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator className={cn("-mx-1 my-1 h-px bg-stroke-subtle", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ml-auto text-xs tracking-widest text-text-subtle", className)} {...props} />;
}

const DropdownMenuGroup = MenuSection;
const DropdownMenuPortal = React.Fragment;
const DropdownMenuSub = React.Fragment;
const DropdownMenuSubContent = DropdownMenuContent;
const DropdownMenuSubTrigger = DropdownMenuItem;
const DropdownMenuRadioGroup = React.Fragment;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
