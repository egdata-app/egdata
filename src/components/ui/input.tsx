import * as React from "react";
import { Input as HeroInput } from "@heroui/react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <HeroInput
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-base text-white shadow-inner shadow-black/20 transition placeholder:text-white/45 focus-visible:border-primary focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
