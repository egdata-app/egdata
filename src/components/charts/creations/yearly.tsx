import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { httpClient } from "@/lib/http-client";
import { linearRegression } from "@/lib/linear-regression";
import { keepPreviousData } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

interface YearlyChartPoint {
  year: number;
  creations?: number;
  ongoing?: number;
  prediction?: number;
}

interface YearlyCreation {
  creations: number;
  year: number;
}

export const getCreationsByYear = async () =>
  httpClient.get<YearlyCreation[]>("/stats/creations/yearly");

const yearlyChartConfig: ChartConfig = {
  creations: { label: "Creations", color: "hsl(var(--chart-1))" },
  ongoing: { label: "YTD", color: "oklch(0.6 0.118 184.704)" },
  prediction: { label: "Prediction", color: "oklch(0.398 0.07 227.392)" },
} as const;

export function CreationsByYear() {
  const { data, isLoading } = useQuery({
    queryKey: ["creations-by-year"],
    queryFn: getCreationsByYear,
    placeholderData: keepPreviousData,
  });

  const chartData = useMemo<YearlyChartPoint[]>(() => {
    if (!data?.length) return [];

    const base = data.map(({ year, creations }) => ({ year, creations }));
    const lastIdx = base.length - 1;
    const lastYear = base[lastIdx].year;
    const currentYear = new Date().getFullYear();
    const isCurrentYearOngoing = lastYear === currentYear;

    const regressionRows = isCurrentYearOngoing ? base.slice(0, -1) : base;
    const x = regressionRows.map((_, i) => i);
    const y = regressionRows.map((d) => d.creations);
    const { slope, intercept } = linearRegression(x, y);

    const forecastCurrentTotal = isCurrentYearOngoing
      ? Math.max(0, Math.round(slope * regressionRows.length + intercept))
      : undefined;
    const forecastNextYearTotal = Math.max(
      0,
      Math.round(slope * (regressionRows.length + 1) + intercept),
    );

    const points: YearlyChartPoint[] = base.map((row, i) => {
      if (isCurrentYearOngoing && i === lastIdx) {
        const ongoing = row.creations;
        const remainderPrediction = Math.max(0, (forecastCurrentTotal ?? 0) - ongoing);
        return {
          year: row.year,
          creations: 0,
          ongoing,
          prediction: remainderPrediction,
        };
      }

      return {
        year: row.year,
        creations: row.creations,
        ongoing: 0,
        prediction: 0,
      };
    });

    points.push({
      year: lastYear + 1,
      creations: 0,
      ongoing: 0,
      prediction: forecastNextYearTotal,
    });

    return points;
  }, [data]);

  if (isLoading && !data) return <div>Loading…</div>;
  if (!chartData.length) return null;

  return (
    <ChartContainer config={yearlyChartConfig} className="aspect-auto h-[300px] w-full">
      <BarChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="year" tickMargin={6} tickLine={false} axisLine={false} />

        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[140px]"
              nameKey="year"
              labelFormatter={(year: number) => year.toString()}
            />
          }
        />

        <Bar
          dataKey="creations"
          fill="var(--color-creations)"
          isAnimationActive={false}
          stackId="creations"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="ongoing"
          fill="var(--color-ongoing)"
          isAnimationActive={false}
          stackId="creations"
        />
        <Bar
          dataKey="prediction"
          fill="var(--color-prediction)"
          fillOpacity={0.6}
          isAnimationActive={false}
          stackId="creations"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
