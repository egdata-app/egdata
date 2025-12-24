import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChangelogStats } from "@/types/changelog";

const chartConfig = {
  changes: {
    label: "changes",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
  label: {
    color: "hsl(var(--background))",
  },
} satisfies ChartConfig;

export function ChangelogFieldsChart({ chartData }: { chartData: ChangelogStats["changeFields"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Changes by Field</CardTitle>
        <CardDescription>Changes grouped by it's changed field</CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={Object.entries(chartData || {}).map(([key, value]) => ({
              month: key,
              changes: value,
            }))}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="month"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              hide
            />
            <XAxis dataKey="changes" type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Bar dataKey="changes" layout="vertical" fill="var(--color-changes)" radius={4}>
              <LabelList
                dataKey="month"
                position="insideLeft"
                offset={8}
                className="fill-white font-mono"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
