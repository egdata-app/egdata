import i18n from "@/lib/i18n";
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {Icon && (
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-card/80 text-primary shadow-sm">
                <Icon className="size-4" />
              </span>
            )}
            <span className="sr-only">{eyebrow}</span>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>

        {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
      </div>

      {stats.length > 0 && (
        <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-border/40 pt-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col">
              <dd className="font-display text-xl font-bold tracking-tight tabular-nums text-foreground sm:text-2xl">
                {stat.value}
              </dd>
              <dt className="mt-0.5 truncate text-xs text-muted-foreground">{stat.label}</dt>
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
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3 border-b border-border/60 pb-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {badge && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-card/80 px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
