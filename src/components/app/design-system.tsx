import * as React from "react";
import { EllipsisVertical } from "lucide-react";

import { Button, buttonVariants } from "@/components/aria/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/aria/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/aria/dropdown-menu";
import { cn } from "@/lib/utils";

function PageShell({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn("mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

function PageHeader({
  actions,
  children,
  className,
  eyebrow,
  title,
}: React.ComponentProps<"header"> & {
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-stroke-subtle pb-5 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-wide text-interactive">
            {eyebrow}
          </div>
        ) : null}
        {title ? (
          <h1 className="font-montserrat text-3xl font-bold tracking-normal text-text-primary md:text-4xl">
            {title}
          </h1>
        ) : null}
        {children ? <div className="max-w-3xl text-sm text-text-muted md:text-base">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

function DataPanel({
  actions,
  children,
  className,
  contentClassName,
  description,
  headerClassName,
  title,
}: Omit<React.ComponentProps<typeof Card>, "title"> & {
  actions?: React.ReactNode;
  contentClassName?: string;
  description?: React.ReactNode;
  headerClassName?: string;
  title?: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || description || actions) && (
        <CardHeader
          className={cn(
            "flex-row items-center justify-between gap-4 border-b border-stroke-subtle p-4",
            headerClassName,
          )}
        >
          <div className="min-w-0 space-y-1">
            {title ? <CardTitle className="truncate font-mono text-sm text-text-secondary">{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </CardHeader>
      )}
      <CardContent className={cn("p-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

function MetricTile({
  className,
  detail,
  icon,
  label,
  value,
}: React.ComponentProps<"div"> & {
  detail?: React.ReactNode;
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg egd-panel p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-text-primary">{value}</div>
          {detail ? <div className="mt-1 text-xs text-text-subtle">{detail}</div> : null}
        </div>
        {icon ? <div className="rounded-md bg-interactive-muted p-2 text-interactive">{icon}</div> : null}
      </div>
    </div>
  );
}

function MediaCard({
  children,
  className,
  image,
  imageAlt = "",
  meta,
  title,
}: React.ComponentProps<"article"> & {
  image?: React.ReactNode;
  imageAlt?: string;
  meta?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <article className={cn("group overflow-hidden rounded-lg egd-panel transition-colors hover:border-stroke-strong", className)}>
      {image ? (
        <div className="relative overflow-hidden bg-surface-raised" aria-label={imageAlt}>
          {image}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 egd-image-overlay" />
        </div>
      ) : null}
      <div className="space-y-2 p-4">
        {title ? <h3 className="line-clamp-2 font-semibold text-text-primary">{title}</h3> : null}
        {meta ? <div className="text-sm text-text-muted">{meta}</div> : null}
        {children}
      </div>
    </article>
  );
}

function DataTableShell({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("overflow-hidden rounded-lg egd-panel", className)} {...props} />;
}

function FilterRail({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      className={cn("w-full rounded-lg egd-panel p-4 lg:sticky lg:top-4 lg:w-80", className)}
      {...props}
    />
  );
}

function Toolbar({
  as: Component = "div",
  className,
  ...props
}: React.ComponentProps<"div"> & { as?: "div" | "header" }) {
  return (
    <Component
      className={cn("flex w-full flex-col gap-3 rounded-lg egd-panel p-3 md:flex-row md:items-center md:justify-between", className)}
      {...props}
    />
  );
}

function EmptyState({
  action,
  children,
  className,
  title = "No data found",
}: React.ComponentProps<"div"> & {
  action?: React.ReactNode;
  title?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-stroke-default bg-surface-panel/60 p-8 text-center", className)}>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {children ? <div className="max-w-md text-sm text-text-muted">{children}</div> : null}
      {action}
    </div>
  );
}

function ActionMenu({
  children,
  label = "Open actions",
}: {
  children?: React.ReactNode;
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

function navigationButtonStyles(className?: string) {
  return buttonVariants({ variant: "ghost", className });
}

export {
  ActionMenu,
  DataPanel,
  DataTableShell,
  EmptyState,
  FilterRail,
  MediaCard,
  MetricTile,
  PageHeader,
  PageShell,
  Toolbar,
  navigationButtonStyles,
};
