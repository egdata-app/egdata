import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  FORECAST_COLORS,
  FORECAST_WINDOW_YEARS,
  ForecastCaption,
  ForecastTooltipShell,
  TooltipRow,
} from "@/components/charts/forecast";
import { httpClient } from "@/lib/http-client";
import { linearRegressionForecast } from "@/lib/linear-regression";
import { keepPreviousData } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "@/lib/paraglide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

interface YearlyChartPoint {
  year: number;
  /** Actual creations for a completed year */
  creations?: number;
  /** Year-to-date creations for the current (unfinished) year */
  ongoing?: number;
  /** Projected remainder stacked on top of YTD (current year) or full projection (next year) */
  prediction?: number;
  /** Projected total for the year (YTD + remainder), shown in the tooltip */
  projectedTotal?: number;
  /** ±1σ bounds for the projected total, shown in the tooltip */
  rangeLow?: number;
  rangeHigh?: number;
}

interface YearlyCreation {
  creations: number;
  year: number;
}

export const getCreationsByYear = async () =>
  httpClient.get<YearlyCreation[]>("/stats/creations/yearly");

export function CreationsByYear() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["creations-by-year"],
    queryFn: getCreationsByYear,
    placeholderData: keepPreviousData,
  });

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      creations: { label: t("stats.chart.creationsLabel"), color: "hsl(var(--chart-1))" },
      ongoing: { label: t("stats.chart.ytd"), color: FORECAST_COLORS.ongoing },
      prediction: { label: t("stats.chart.prediction"), color: FORECAST_COLORS.prediction },
    }),
    [t],
  );

  const chartData = useMemo<YearlyChartPoint[]>(() => {
    if (!data?.length) return [];

    const base = data.map(({ year, creations }) => ({ year, creations }));
    const lastYear = base[base.length - 1].year;
    const currentYear = new Date().getFullYear();
    const isCurrentYearOngoing = lastYear === currentYear;

    const completeRows = isCurrentYearOngoing ? base.slice(0, -1) : base;
    if (!completeRows.length) return [];

    // Fit the projection on a trailing window of completed years so old
    // regimes don't distort the trend.
    const regressionRows = completeRows.slice(-FORECAST_WINDOW_YEARS);
    const n = regressionRows.length;
    const forecast = linearRegressionForecast(
      regressionRows.map((_, i) => i),
      regressionRows.map((d) => d.creations),
    );

    const points: YearlyChartPoint[] = completeRows.map((row) => ({
      year: row.year,
      creations: row.creations,
    }));

    const forecastYear = (xIdx: number) => {
      const y = Math.max(0, forecast.predict(xIdx));
      const hw = forecast.halfWidth(xIdx);
      return {
        total: Math.round(y),
        low: Math.max(0, Math.round(y - hw)),
        high: Math.round(y + hw),
      };
    };

    if (isCurrentYearOngoing) {
      const ytd = base[base.length - 1].creations;
      const current = forecastYear(n);
      // The total can never be below what has already been created.
      const projectedTotal = Math.max(current.total, ytd);
      points.push({
        year: lastYear,
        ongoing: ytd,
        prediction: Math.max(0, projectedTotal - ytd),
        projectedTotal,
        rangeLow: Math.max(current.low, ytd),
        rangeHigh: Math.max(current.high, ytd),
      });

      const next = forecastYear(n + 1);
      points.push({
        year: lastYear + 1,
        prediction: next.total,
        projectedTotal: next.total,
        rangeLow: next.low,
        rangeHigh: next.high,
      });
    } else {
      const next = forecastYear(n);
      points.push({
        year: lastYear + 1,
        prediction: next.total,
        projectedTotal: next.total,
        rangeLow: next.low,
        rangeHigh: next.high,
      });
    }

    return points;
  }, [data]);

  if (isLoading && !data) return <div>Loading…</div>;
  if (!chartData.length) return null;

  return (
    <div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
        <BarChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="year" tickMargin={6} tickLine={false} axisLine={false} />

          <ChartTooltip
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const point = props.payload[0].payload as YearlyChartPoint;

              return (
                <ForecastTooltipShell>
                  <div className="font-medium">{point.year}</div>
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
                        label={t("stats.chart.ytd")}
                        value={point.ongoing}
                      />
                    )}
                    {point.projectedTotal != null && (
                      <>
                        <TooltipRow
                          dashed
                          color="var(--color-prediction)"
                          label={t("stats.chart.projectedTotal")}
                          value={point.projectedTotal}
                        />
                        {point.rangeLow != null && point.rangeHigh != null && (
                          <TooltipRow
                            dashed
                            color="var(--color-prediction)"
                            label={t("stats.chart.likelyRange")}
                            value={`${point.rangeLow.toLocaleString()}–${point.rangeHigh.toLocaleString()}`}
                          />
                        )}
                      </>
                    )}
                  </div>
                </ForecastTooltipShell>
              );
            }}
          />

          <Bar
            dataKey="creations"
            fill="var(--color-creations)"
            stackId="total"
            radius={[8, 8, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="ongoing"
            fill="var(--color-ongoing)"
            stackId="total"
            isAnimationActive={false}
          />
          <Bar
            dataKey="prediction"
            fill="var(--color-prediction)"
            fillOpacity={0.25}
            stroke="var(--color-prediction)"
            strokeDasharray="4 3"
            stackId="total"
            radius={[8, 8, 0, 0]}
            isAnimationActive={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
      <ForecastCaption>
        {t("stats.chart.captionYearly", { years: FORECAST_WINDOW_YEARS })}
      </ForecastCaption>
    </div>
  );
}
