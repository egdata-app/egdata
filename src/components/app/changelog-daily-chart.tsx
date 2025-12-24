import * as React from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChangelogStats } from "@/types/changelog";

const chartConfig = {
  views: {
    label: "Daily Changes",
  },
  changes: {
    label: "Daily Changes",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ChangelogDailyChart({ chartData }: { chartData: ChangelogStats["dailyChanges"] }) {
  // Fill the missing days from the beginning to the end
  const filledData = React.useMemo(() => {
    if (!chartData) return {};

    const filledData = {};
    const keys = Object.keys(chartData);
    const sortedKeys = keys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    if (sortedKeys.length === 0) return {};

    const startDate = new Date(sortedKeys[0]);
    const endDate = new Date(sortedKeys[sortedKeys.length - 1]);

    for (
      let currentDate = new Date(startDate);
      currentDate <= endDate;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      filledData[formattedDate] = chartData[formattedDate] || 0;
    }

    return filledData;
  }, [chartData]);

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Offer Changes</CardTitle>
          <CardDescription>Showing daily changes for the last year</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={Object.entries(filledData || {}).map(([key, value]) => ({
              date: key,
              changes: value,
            }))}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={true}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey={"changes"}
              stroke={"var(--color-changes)"}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
