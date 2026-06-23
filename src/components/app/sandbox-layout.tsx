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
  return typeof value === "number" ? value.toLocaleString("en-GB") : "N/A";
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
    <section
      className={cn(
        "rounded-md border border-border/60 bg-card/75 p-5 shadow-sm shadow-black/10",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {Icon && (
              <span className="inline-flex size-8 items-center justify-center rounded-md border border-border/60 bg-background/70 text-primary">
                <Icon className="size-4" />
              </span>
            )}
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
              {description}
            </p>
          </div>
        </div>

        {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
      </div>

      {stats.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="min-w-0 rounded-md border border-border/50 bg-background/45 px-3 py-2"
            >
              <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 truncate text-lg font-semibold">{stat.value}</dd>
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
