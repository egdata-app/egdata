import { Line } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Fragment, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { linearRegression } from "@/lib/linear-regression";
import { CartesianGrid, LineChart, ReferenceLine, XAxis } from "recharts";
import { Separator } from "@/components/ui/separator";

export const getReleasesByMonth = async () =>
  httpClient.get<MonthlyRelease[]>("/stats/releases/monthly");

export interface MonthlyRelease {
  releases: number;
  year: number;
  month: number;
}

interface MonthlyChartPoint {
  /** ISO date of the first day of the month (kept only for tooltip) */
  date: string;
  /** Unix‑ms timestamp used for the X axis */
  ts: number;
  releases?: number;
  ongoing?: number;
  prediction?: number;
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

const monthlyChartConfig: ChartConfig = {
  releases: { label: "Releases", color: "hsl(var(--chart-1))" },
  ongoing: { label: "Ongoing", color: "oklch(0.6 0.118 184.704)" },
  prediction: { label: "Prediction", color: "var(--chart-3)" },
} as const;

const toMonthlyBase = (data: MonthlyRelease[]) =>
  data.map(({ year, month, releases }) => {
    const date = new Date(year, month - 1, 1);
    return {
      date: date.toISOString(),
      ts: date.getTime(),
      releases,
    };
  });

export function ReleasesByMonth() {
  const { data, isLoading } = useQuery({
    queryKey: ["releases-by-month"],
    queryFn: getReleasesByMonth,
    placeholderData: keepPreviousData,
  });

  const chartData = useMemo<MonthlyChartPoint[]>(() => {
    if (!data?.length) return [];

    const base = toMonthlyBase(data);
    const lastIdx = base.length - 1;
    const lastDate = new Date(base[lastIdx].date);
    const now = new Date();

    const isOngoingMonth =
      lastDate.getFullYear() === now.getFullYear() && lastDate.getMonth() === now.getMonth();

    const regressionRows = isOngoingMonth ? base.slice(0, -1) : base;
    const x = regressionRows.map((_, i) => i);
    const y = regressionRows.map((d) => d.releases);
    const { slope, intercept } = linearRegression(x, y);

    const predictedOngoing = Math.max(0, Math.round(slope * regressionRows.length + intercept));
    const predictedNext = Math.max(0, Math.round(slope * (regressionRows.length + 1) + intercept));

    const prevIdxs = [lastIdx - 2, lastIdx - 1].filter((idx) => idx >= 0);

    const points: MonthlyChartPoint[] = base.map((row, i) => {
      const isOngoing = isOngoingMonth && (prevIdxs.includes(i) || i === lastIdx);
      return {
        ...row,
        releases: !isOngoingMonth || i < base.length - 1 ? row.releases : undefined,
        ongoing: isOngoing ? row.releases : undefined,
        prediction: i === regressionRows.length - 1 ? row.releases : undefined,
      };
    });

    if (isOngoingMonth) {
      points[points.length - 1].prediction = predictedOngoing;
    }

    const nextMonth = new Date(base[base.length - 1].date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    points.push({
      date: nextMonth.toISOString(),
      ts: nextMonth.getTime(),
      prediction: predictedNext,
    });

    return points;
  }, [data]);

  if (isLoading && !data) return <div>Loading…</div>;
  if (!chartData.length) return null;

  return (
    <ChartContainer config={monthlyChartConfig} className="aspect-auto h-[250px] w-full">
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
            const dateStr = props.payload[0].payload.date;
            const eventLabels = getImportantEventLabels(dateStr);

            return (
              // @ts-expect-error
              <ChartTooltipContent
                {...props}
                className="w-auto max-w-[500px]"
                nameKey="date"
                labelFormatter={(_label, payload) => {
                  const date = new Date(payload[0].payload.date);
                  return (
                    <div className="flex flex-col gap-1">
                      {eventLabels.map((label) => (
                        <Fragment key={label}>
                          <div key={label} className="text-xs font-mono">
                            {label}
                          </div>
                          <Separator />
                        </Fragment>
                      ))}
                      <div>
                        {date.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  );
                }}
              />
            );
          }}
        />

        <Line
          dataKey="releases"
          type="monotone"
          stroke="var(--color-releases)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="ongoing"
          type="monotone"
          stroke="var(--color-releases)"
          strokeWidth={2}
          strokeDasharray="3 3"
          dot={false}
        />
        <Line
          dataKey="prediction"
          type="monotone"
          stroke="var(--color-prediction)"
          strokeWidth={1.5}
          strokeDasharray="6 6"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}

function getImportantEventLabels(dateStr: string): string[] {
  const date = new Date(dateStr);
  const events = importantDates.filter(
    (d) => d.date.getFullYear() === date.getFullYear() && d.date.getMonth() === date.getMonth(),
  );
  return events.map((e) => e.label);
}
