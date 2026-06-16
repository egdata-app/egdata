import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Button as HeroButton } from "@heroui/react";
import type { ButtonProps as HeroButtonProps } from "@heroui/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-lg shadow-sky-500/20 hover:bg-sky-400",
        destructive: "bg-destructive text-white shadow-lg shadow-red-500/20 hover:bg-red-500",
        outline: "border border-white/10 bg-white/5 text-white hover:bg-white/10",
        secondary: "bg-white text-black hover:bg-white/90",
        ghost: "text-white/80 hover:bg-white/10 hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const heroVariant = (variant: ButtonProps["variant"]): HeroButtonProps["variant"] => {
  switch (variant) {
    case "destructive":
      return "danger";
    case "outline":
      return "outline";
    case "secondary":
      return "secondary";
    case "ghost":
    case "link":
      return "ghost";
    default:
      return "primary";
  }
};

const heroSize = (size: ButtonProps["size"]): HeroButtonProps["size"] => {
  switch (size) {
    case "sm":
      return "sm";
    case "lg":
      return "lg";
    default:
      return "md";
  }
};

function Button({ className, variant, size, asChild = false, disabled, ...props }: ButtonProps) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }

  return (
    <HeroButton
      data-slot="button"
      variant={heroVariant(variant)}
      size={heroSize(size)}
      isIconOnly={size === "icon"}
      isDisabled={disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      {...(props as Omit<HeroButtonProps, "size" | "variant">)}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
