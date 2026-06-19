import * as React from "react";
import { Button as AriaButton } from "react-aria-components";

import { cn } from "@/lib/utils";
import { PressableSlot } from "@/components/aria/pressable-slot";

type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out outline-none disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-interactive focus-visible:ring-interactive/25 focus-visible:ring-[3px] data-[focus-visible]:border-interactive data-[focus-visible]:ring-interactive/25 data-[focus-visible]:ring-[3px] pressed:translate-y-px";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  default:
    "border border-interactive bg-interactive text-text-inverse shadow-panel hover:bg-interactive-hover pressed:bg-interactive-active",
  destructive:
    "border border-danger bg-danger text-text-primary shadow-panel hover:bg-danger/90 pressed:bg-danger/80 focus-visible:ring-danger/25",
  outline:
    "border border-stroke-default bg-surface-raised text-text-primary shadow-panel hover:border-stroke-strong hover:bg-surface-hover",
  secondary:
    "border border-stroke-default bg-surface-panel text-text-primary shadow-panel hover:bg-surface-hover",
  ghost: "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
  link: "h-auto rounded-none px-0 py-0 text-interactive underline-offset-4 hover:text-interactive-hover hover:underline",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
  lg: "h-10 px-6 has-[>svg]:px-4",
  icon: "size-9",
};

function buttonStyles({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  className?: string;
} = {}) {
  return cn(
    buttonBase,
    buttonVariantClasses[variant ?? "default"],
    buttonSizeClasses[size ?? "default"],
    className,
  );
}

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  disabled?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
};

const Button = React.forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    disabled,
    isDisabled,
    onPress,
    onClick,
    ...props
  },
  ref,
) {
  const classes = buttonStyles({
    variant,
    size,
    className: typeof className === "string" ? className : undefined,
  });

  if (asChild && React.isValidElement(props.children)) {
    const { children, ...slotProps } = props;
    return (
      <PressableSlot
        className={classes}
        isDisabled={isDisabled ?? disabled}
        onClick={onClick as React.MouseEventHandler<HTMLElement>}
        onPress={onPress ? () => onPress() : undefined}
        ref={ref as React.Ref<HTMLElement>}
        {...(slotProps as React.HTMLAttributes<HTMLElement>)}
      >
        {children as React.ReactElement<any>}
      </PressableSlot>
    );
  }

  return (
    <AriaButton
      data-slot="button"
      className={classes}
      isDisabled={isDisabled ?? disabled}
      onPress={onPress}
      onClick={onClick as any}
      ref={ref as React.Ref<HTMLButtonElement>}
      {...(props as any)}
    />
  );
});

export { Button, buttonStyles as buttonVariants, type ButtonProps };
