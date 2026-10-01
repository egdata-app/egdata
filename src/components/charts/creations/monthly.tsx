import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  FORECAST_COLORS,
  FORECAST_WINDOW_MONTHS,
  ForecastCaption,
  ForecastTooltipShell,
  TooltipRow,
} from "@/components/charts/forecast";
import { Fragment, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "@/lib/paraglide-react";
import { httpClient } from "@/lib/http-client";
import { linearRegressionForecast } from "@/lib/linear-regression";
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
} from "recharts";
import { Separator } from "@/components/ui/separator";

export const getCreationsByMonth = async () =>
  httpClient.get<MonthlyCreation[]>("/stats/creations/monthly");

export interface MonthlyCreation {
  creations: number;
  year: number;
  month: number;
}

interface MonthlyChartPoint {
  /** ISO date of the first day of the month (kept only for tooltip) */
  date: string;
  /** Unix‑ms timestamp used for the X axis */
  ts: number;
  /** Actual creations for a completed month */
  creations?: number;
  /** Creations so far in the current (unfinished) month */
  ongoing?: number;
  /** Projected value (anchor at last completed month, then forecast) */
  prediction?: number;
  /** Stacked-area band: transparent base up to the lower bound */
  bandBase?: number;
  /** Stacked-area band: visible ±1σ range on top of the base */
  bandRange?: number;
}

const importantDates = [
  {
    date: new Date("2023-11-01"),
    label: "Now on Epic",
  },
  {
    date: new Date("2023-10-01"),
    label: "Epic First Run",
  },
  {
    date: new Date("2025-05-01"),
    label: "100% Revenue Share Program",
  },
  {
    date: new Date("2025-01-01"),
    label: "Launch Everywhere",
  },
  {
    date: new Date("2025-01-01"),
    label: "EGS Mobile 3rd Party",
  },
  {
    date: new Date("2023-03-01"),
    label: "Self Publish Tool (PC)",
  },
];

const toMonthlyBase = (data: MonthlyCreation[]) =>
  data.map(({ year, month, creations }) => {
    const date = new Date(year, month - 1, 1);
    return {
      date: date.toISOString(),
      ts: date.getTime(),
      creations,
    };
  });

export function CreationsByMonth() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["creations-by-month"],
    queryFn: getCreationsByMonth,
    placeholderData: keepPreviousData,
  });

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      creations: { label: t("stats.chart.creationsLabel"), color: "hsl(var(--chart-1))" },
      ongoing: { label: t("stats.chart.ongoing"), color: FORECAST_COLORS.ongoing },
      prediction: { label: t("stats.chart.prediction"), color: FORECAST_COLORS.prediction },
    }),
    [t],
  );

  const chartData = useMemo<MonthlyChartPoint[]>(() => {
    if (!data?.length) return [];

    const base = toMonthlyBase(data);
    const lastDate = new Date(base[base.length - 1].date);
    const now = new Date();

    const isOngoingMonth =
      lastDate.getFullYear() === now.getFullYear() && lastDate.getMonth() === now.getMonth();

    const completeRows = isOngoingMonth ? base.slice(0, -1) : base;
    if (!completeRows.length) return [];

    // Fit the projection on a trailing window of completed months so old
    // regimes (pre self-publish, pre mobile, …) don't distort the trend.
    const regressionRows = completeRows.slice(-FORECAST_WINDOW_MONTHS);
    const n = regressionRows.length;
    const forecast = linearRegressionForecast(
      regressionRows.map((_, i) => i),
      regressionRows.map((d) => d.creations),
    );

    const points: MonthlyChartPoint[] = completeRows.map((row) => ({
      date: row.date,
      ts: row.ts,
      creations: row.creations,
    }));

    // Anchor the projection at the last completed month so the dashed line
    // and the uncertainty band grow out of real data.
    const anchor = points[points.length - 1];
    anchor.prediction = anchor.creations;
    anchor.bandBase = anchor.creations ?? 0;
    anchor.bandRange = 0;

    const forecastPoint = (xIdx: number, date: Date): MonthlyChartPoint => {
      const y = Math.max(0, forecast.predict(xIdx));
      const hw = forecast.halfWidth(xIdx);
      const low = Math.max(0, Math.round(y - hw));
      const high = Math.round(y + hw);
      return {
        date: date.toISOString(),
        ts: date.getTime(),
        prediction: Math.round(y),
        bandBase: low,
        bandRange: high - low,
      };
    };

    if (isOngoingMonth) {
      const ongoingRow = base[base.length - 1];
      points.push({
        ...forecastPoint(n, new Date(ongoingRow.date)),
        ongoing: ongoingRow.creations,
      });

      const nextMonth = new Date(ongoingRow.date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      points.push(forecastPoint(n + 1, nextMonth));
    } else {
      const nextMonth = new Date(completeRows[completeRows.length - 1].date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      points.push(forecastPoint(n, nextMonth));
    }

    return points;
  }, [data]);

  if (isLoading && !data) return <div>Loading…</div>;
  if (!chartData.length) return null;

  const anchorTs = chartData.find((p) => p.prediction != null)?.ts;
  const forecastEndTs = chartData[chartData.length - 1].ts;
  const hasOngoing = chartData.some((p) => p.ongoing != null);

  return (
    <div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
        <LineChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickMargin={8}
            minTickGap={32}
            tickLine={false}
            axisLine={false}
            tickFormatter={(ms: number) =>
              new Date(ms).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })
            }
          />

          {anchorTs != null && (
            <ReferenceArea
              x1={anchorTs}
              x2={forecastEndTs}
              fill="var(--color-prediction)"
              fillOpacity={0.07}
              strokeOpacity={0}
              label={{
                value: t("stats.chart.forecastZone"),
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--color-prediction)",
              }}
            />
          )}

          {importantDates.map(({ date, label }) => (
            <ReferenceLine
              key={date.getTime() + label}
              x={date.getTime()}
              stroke="var(--color-ongoing)"
              strokeDasharray="3 3"
            />
          ))}

          <ChartTooltip
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const point = props.payload[0].payload as MonthlyChartPoint;
              const date = new Date(point.date);
              const eventLabels = getImportantEventLabels(point.date);

              return (
                <ForecastTooltipShell>
                  {eventLabels.map((label) => (
                    <Fragment key={label}>
                      <div className="text-xs font-mono">{label}</div>
                      <Separator />
                    </Fragment>
                  ))}
                  <div className="font-medium">
                    {date.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="grid gap-1">
                    {point.creations != null && (
                      <TooltipRow
                        color="var(--color-creations)"
                        label={t("stats.chart.creationsLabel")}
                        value={point.creations}
                      />
                    )}
                    {point.ongoing != null && (
                      <TooltipRow
                        color="var(--color-ongoing)"
                        label={t("stats.chart.ongoingSoFar")}
                        value={point.ongoing}
                      />
                    )}
                    {point.prediction != null && point.creations == null && (
                      <>
                        <TooltipRow
                          dashed
                          color="var(--color-prediction)"
                          label={t("stats.chart.prediction")}
                          value={point.prediction}
                        />
                        {point.bandRange != null && point.bandRange > 0 && (
                          <TooltipRow
                            dashed
                            color="var(--color-prediction)"
                            label={t("stats.chart.likelyRange")}
                            value={`${(point.bandBase ?? 0).toLocaleString()}–${(
                              (point.bandBase ?? 0) + point.bandRange
                            ).toLocaleString()}`}
                          />
                        )}
                      </>
                    )}
                  </div>
                </ForecastTooltipShell>
              );
            }}
          />

          {/* ±1σ band around the projection (stacked: transparent base + visible range) */}
          <Area
            type="linear"
            dataKey="bandBase"
            stackId="band"
            stroke="none"
            fill="transparent"
            isAnimationActive={false}
            legendType="none"
          />
          <Area
            type="linear"
            dataKey="bandRange"
            stackId="band"
            stroke="none"
            fill="var(--color-prediction)"
            fillOpacity={0.18}
            isAnimationActive={false}
            legendType="none"
          />

          <Line
            dataKey="creations"
            type="monotone"
            stroke="var(--color-creations)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="ongoing"
            type="monotone"
            stroke="var(--color-ongoing)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--color-ongoing)", strokeWidth: 0 }}
            legendType={hasOngoing ? "line" : "none"}
          />
          <Line
            dataKey="prediction"
            type="linear"
            stroke="var(--color-prediction)"
            strokeWidth={1.5}
            strokeDasharray="6 6"
            dot={{ r: 3, fill: "var(--color-prediction)", strokeWidth: 0 }}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
      <ForecastCaption>
        {t("stats.chart.captionMonthly", { months: FORECAST_WINDOW_MONTHS })}
      </ForecastCaption>
    </div>
  );
}

function getImportantEventLabels(dateStr: string): string[] {
  const date = new Date(dateStr);
  const events = importantDates.filter(
    (d) => d.date.getFullYear() === date.getFullYear() && d.date.getMonth() === date.getMonth(),
  );
  return events.map((e) => e.label);
}
