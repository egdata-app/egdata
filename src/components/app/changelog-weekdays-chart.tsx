import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChangelogStats } from "@/types/changelog";

const chartConfig = {
  desktop: {
    label: "Total Changes",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const numberToWeekday = (number: number) => {
  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return weekdays[number];
};

export function ChangelogWeekdaysChart({
  chartData,
}: {
  chartData: ChangelogStats["weekdayChanges"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Changes by Weekday</CardTitle>
        <CardDescription>Accumulated changes by weekday</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={Object.entries(chartData || {}).map(([key, value]) => ({
              weekday: numberToWeekday(Number(key)),
              desktop: value,
            }))}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="weekday"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={8}>
              <LabelList position="top" offset={12} className="fill-foreground" fontSize={12} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {chartData && Object.keys(chartData).length > 0 ? (
          <>
            {(() => {
              // Find the key (day) with the maximum value (changes)
              const maxDay = Object.keys(chartData).reduce((max, day) =>
                chartData[day] > chartData[max] ? day : max,
              );

              // Find the key (day) with the second highest value
              const secondMaxDay = Object.keys(chartData)
                .filter((day) => day !== maxDay) // Exclude the max day
                .reduce(
                  (secondMax, day) =>
                    chartData[day] > (chartData[secondMax as unknown as string] || 0)
                      ? day
                      : secondMax,
                  null,
                );

              const maxChanges = chartData[maxDay];
              const secondMaxChanges = secondMaxDay ? chartData[secondMaxDay] : 0;

              // Calculate percentage change
              const percentageChange = secondMaxChanges
                ? (((maxChanges - secondMaxChanges) / secondMaxChanges) * 100).toFixed(2)
                : 100;

              const weekday = numberToWeekday(Number(maxDay)); // Convert day key to weekday name

              return (
                <>
                  <div className="flex gap-2 font-medium leading-none">
                    {weekday} is the day with the most changes <TrendingUp className="h-4 w-4" />
                  </div>
                  {secondMaxChanges > 0 && (
                    <span className="leading-none text-muted-foreground">
                      {(percentageChange as number) > 0 ? "+" : ""}
                      {percentageChange}% compared to the next day with the most changes
                    </span>
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <div>No data available to display.</div>
        )}
      </CardFooter>
    </Card>
  );
}
