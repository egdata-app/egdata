import { Skeleton as HeroSkeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <HeroSkeleton className={cn("rounded-xl bg-white/10", className)} {...props} />;
}

export { Skeleton };
