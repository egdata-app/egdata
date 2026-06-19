import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarX2, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PerformanceEmptyStateProps = {
  variant: "no-data" | "no-range" | "no-collection";
  className?: string;
};

const config: Record<
  PerformanceEmptyStateProps["variant"],
  { icon: LucideIcon; title: string; description: string }
> = {
  "no-data": {
    icon: Inbox,
    title: "No performance data",
    description: "This offer hasn't appeared in any tracked charts yet.",
  },
  "no-range": {
    icon: CalendarX2,
    title: "No data in this range",
    description: "Try selecting a different date range above.",
  },
  "no-collection": {
    icon: BarChart3,
    title: "No collection selected",
    description: "Pick one of the charts above to see positions.",
  },
};

export function PerformanceEmptyState({ variant, className }: PerformanceEmptyStateProps) {
  const { icon: Icon, title, description } = config[variant];

  return (
    <Card
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}
