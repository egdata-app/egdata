import { Pie, PieChart, Sector } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChangelogStats } from "@/types/changelog";

const chartConfig = {
  types: {
    label: "Types",
  },
  update: {
    label: "Update",
    color: "hsl(var(--chart-1))",
  },
  delete: {
    label: "Delete",
    color: "hsl(var(--chart-2))",
  },
  insert: {
    label: "Insert",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function ChangelogTypesChart({ chartData }: { chartData: ChangelogStats["changeTypes"] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Types of Changes</CardTitle>
        <CardDescription>Quantity of changes by type</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[325px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={Object.entries(chartData || {}).map(([key, value]) => ({
                browser: key,
                types: value,
                fill: `var(--color-${key})`,
              }))}
              dataKey="types"
              nameKey="browser"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={0}
              activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                <Sector {...props} outerRadius={outerRadius + 10} />
              )}
            />
            <ChartLegend
              content={<ChartLegendContent nameKey="browser" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
