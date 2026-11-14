import i18n from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type * as React from "react";
import type { ComponentType } from "react";

type HeaderIcon = ComponentType<{ className?: string }>;

export type SandboxHeaderStat = {
  label: string;
  value: React.ReactNode;
};

export function formatSandboxCount(value: number | null | undefined) {
  return typeof value === "number"
    ? value.toLocaleString(i18n.language)
    : i18n.t("common.notAvailable");
}

export function SandboxPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  stats = [],
  children,
  className,
}: {
  icon?: HeaderIcon;
  eyebrow: string;
  title: string;
  description: string;
  stats?: SandboxHeaderStat[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-border/60 pb-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {Icon && (
              <span className="inline-flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/70 text-primary">
                <Icon className="size-4" />
              </span>
            )}
            <span className="sr-only">{eyebrow}</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>

        {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
      </div>

      {stats.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-w-0 items-baseline gap-2">
              <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="text-base font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function SandboxDataSurface({
  title,
  description,
  badge,
  children,
  className,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {badge && <Badge variant="outline">{badge}</Badge>}
      </div>
      {children}
    </section>
  );
}
