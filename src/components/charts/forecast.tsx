import type React from "react";

/** Number of completed months used to fit monthly projections. */
export const FORECAST_WINDOW_MONTHS = 24;

/** Number of completed years used to fit yearly projections. */
export const FORECAST_WINDOW_YEARS = 5;

/** Shared colors so legend, lines, dots, bands and tooltip rows always match. */
export const FORECAST_COLORS = {
  ongoing: "oklch(0.6 0.118 184.704)",
  prediction: "var(--chart-3)",
} as const;

/** One labelled row inside a custom chart tooltip. */
export function TooltipRow({
  color,
  label,
  value,
  dashed,
}: {
  color: string;
  label: string;
  value: number | string;
  dashed?: boolean;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={dashed ? { border: `1.5px dashed ${color}` } : { backgroundColor: color }}
      />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-mono font-medium tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

/** Caption under a chart explaining how the projection is computed. */
export function ForecastCaption({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-muted-foreground">{children}</p>;
}

/** Shared shell for custom chart tooltips. */
export function ForecastTooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {children}
    </div>
  );
}
