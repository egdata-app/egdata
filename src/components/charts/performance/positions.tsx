import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";
import { computeChange } from "@/lib/performance";
import { PerformanceEmptyState } from "@/components/app/performance-empty-state";

interface Position {
  date: string;
  position: number;
  _id: string;
}

interface PerformancePositionsChartProps {
  positions: Position[];
  timeframe: { from: Date; to: Date };
}

const chartConfig: ChartConfig = {
  position: { label: "Position", color: "hsl(var(--chart-1))" },
};

const referenceTiers = [1, 5, 10, 50, 100];

function niceUpperBound(max: number): number {
  if (max <= 1) return 1;
  if (max <= 5) return 5;
  if (max <= 10) return 10;
  if (max <= 20) return 20;
  if (max <= 50) return 50;
  return 100;
}

export function PerformancePositionsChart({
  positions,
  timeframe,
}: PerformancePositionsChartProps) {
  const { timezone } = useLocale();

  const chartData = useMemo(() => {
    if (!positions?.length) return [];

    const fromDateTime = DateTime.fromJSDate(timeframe.from).setZone(timezone || "UTC");
    const toDateTime = DateTime.fromJSDate(timeframe.to).setZone(timezone || "UTC");

    const sorted = positions
      .filter((pos) => {
        const date = DateTime.fromISO(pos.date).setZone(timezone || "UTC");
        return date >= fromDateTime && date <= toDateTime;
      })
      .sort((a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis());

    return sorted.map((pos, idx) => {
      const normalized = pos.position === 0 ? 100 : pos.position;
      const previous = idx > 0 ? sorted[idx - 1] : null;
      const change = previous ? computeChange(pos.position, previous.position) : 0;
      return {
        ...pos,
        position: normalized,
        change,
        dateLabel: DateTime.fromISO(pos.date)
          .setZone(timezone || "UTC")
          .setLocale("en-GB")
          .toLocaleString({ day: "numeric", month: "short" }),
      };
    });
  }, [positions, timeframe, timezone]);

  if (!chartData.length) {
    return <PerformanceEmptyState variant="no-range" />;
  }

  const maxPosition = Math.max(...chartData.map((d) => d.position));
  const upperBound = niceUpperBound(maxPosition);
  const activeTiers = referenceTiers.filter((t) => t <= upperBound);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      <AreaChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
        <defs>
          <linearGradient id="fillPosition" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-position)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-position)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="dateLabel" tickMargin={6} tickLine={false} axisLine={false} />
        <YAxis
          domain={[1, upperBound]}
          reversed
          tickCount={Math.min(upperBound, 10)}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        {activeTiers.map((tier) => (
          <ReferenceLine
            key={tier}
            y={tier}
            stroke="hsl(var(--border))"
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
          />
        ))}
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[160px]"
              nameKey="dateLabel"
              labelFormatter={(label: string) => label}
              formatter={(value, _name, item) => {
                const change = (item.payload as { change?: number }).change;
                const posLabel = `Position #${value}`;
                if (!change || change === 0) return posLabel;
                const direction = change < 0 ? "up" : "down";
                const arrow = direction === "up" ? "↑" : "↓";
                return (
                  <span className="flex items-center justify-between gap-2">
                    <span>{posLabel}</span>
                    <span className={direction === "up" ? "text-emerald-500" : "text-red-500"}>
                      {arrow}
                      {Math.abs(change)}
                    </span>
                  </span>
                );
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="position"
          stroke="var(--color-position)"
          strokeWidth={2}
          fill="url(#fillPosition)"
          dot={{ r: 3 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
