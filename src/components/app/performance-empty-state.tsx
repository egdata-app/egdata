import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarX2, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type PerformanceEmptyStateProps = {
  variant: "no-data" | "no-range" | "no-collection";
  className?: string;
};

const config = {
  "no-data": {
    icon: Inbox,
    titleKey: "components.performanceTable.empty.noData.title",
    descriptionKey: "components.performanceTable.empty.noData.description",
  },
  "no-range": {
    icon: CalendarX2,
    titleKey: "components.performanceTable.empty.noRange.title",
    descriptionKey: "components.performanceTable.empty.noRange.description",
  },
  "no-collection": {
    icon: BarChart3,
    titleKey: "components.performanceTable.empty.noCollection.title",
    descriptionKey: "components.performanceTable.empty.noCollection.description",
  },
} as const satisfies Record<
  PerformanceEmptyStateProps["variant"],
  { icon: LucideIcon; titleKey: string; descriptionKey: string }
>;

export function PerformanceEmptyState({ variant, className }: PerformanceEmptyStateProps) {
  const { t } = useTranslation();
  const { icon: Icon, titleKey, descriptionKey } = config[variant];

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
        <p className="text-sm font-medium text-foreground">{t(titleKey)}</p>
        <p className="text-xs text-muted-foreground">{t(descriptionKey)}</p>
      </div>
    </Card>
  );
}
