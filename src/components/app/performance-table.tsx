import { ChartBar, Crown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import type { OfferPosition } from "@/types/collections";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import * as React from "react";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { DateRangePicker } from "./date-range-picker";
import { PerformancePositionsChart } from "../charts/performance/positions";
import { PerformanceEmptyState } from "./performance-empty-state";
import { CardStackIcon } from "@radix-ui/react-icons";
import { DateTime } from "luxon";
import { useLocale } from "@/hooks/use-locale";
import {
  changeDirection,
  computeChange,
  summarizePositions,
  toPositionValue,
} from "@/lib/performance";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/paraglide-react";

const tierConfig = [
  { key: "timesInTop1" as const, tier: 1 },
  { key: "timesInTop5" as const, tier: 5 },
  { key: "timesInTop10" as const, tier: 10 },
  { key: "timesInTop50" as const, tier: 50 },
  { key: "timesInTop100" as const, tier: 100 },
];

interface PerformanceCardProps {
  position: number;
  change: number;
  date: string;
  hasPrevious: boolean;
}

function PerformanceCard({ position, change, date, hasPrevious }: PerformanceCardProps) {
  const { locale, timezone } = useLocale();
  const { t } = useTranslation();
  const direction = changeDirection(change);
  const normalized = toPositionValue(position);
  const isOut = position === 0;
  const places = Math.abs(change);
  const changeLabel =
    direction === "none"
      ? t("components.performanceTable.noChange")
      : direction === "up"
        ? t("components.performanceTable.movedUp", { count: places })
        : t("components.performanceTable.movedDown", { count: places });
  const positionText = isOut
    ? t("components.performanceTable.offChart")
    : t("components.performanceTable.topPosition", { position });

  const changeIcon =
    direction === "up" ? (
      <TrendingUp className="size-3.5" />
    ) : direction === "down" ? (
      <TrendingDown className="size-3.5" />
    ) : (
      <Minus className="size-3.5" />
    );

  const changeTone =
    direction === "up"
      ? "text-emerald-500 bg-emerald-500/10"
      : direction === "down"
        ? "text-red-500 bg-red-500/10"
        : "text-muted-foreground bg-muted";

  const cardTone = isOut
    ? "from-muted/40 to-card"
    : direction === "up"
      ? "from-emerald-600/15 to-card"
      : direction === "down"
        ? "from-red-700/15 to-card"
        : "from-card to-card";

  const dateLabel = DateTime.fromISO(date)
    .setZone(timezone || "UTC")
    .setLocale(locale || "en-US")
    .toLocaleString({ day: "numeric", month: "short" });

  const changeBadge = hasPrevious ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="status"
          aria-label={changeLabel}
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            changeTone,
          )}
        >
          {changeIcon}
          {direction === "none" ? "—" : Math.abs(change)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{changeLabel}</TooltipContent>
    </Tooltip>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="status"
          aria-label={t("components.performanceTable.noPriorData")}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          <Minus className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{t("components.performanceTable.noPriorData")}</TooltipContent>
    </Tooltip>
  );

  return (
    <Card
      className={cn(
        "flex w-[140px] shrink-0 flex-col gap-2 bg-gradient-to-b p-4 transition-colors hover:border-border/80",
        cardTone,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{dateLabel}</span>
        {changeBadge}
      </div>

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "text-2xl font-bold leading-tight tabular-nums",
            isOut && "text-muted-foreground",
          )}
        >
          {positionText}
        </div>
        {isOut ? null : normalized <= 3 ? <Crown className="size-3.5 text-amber-500" /> : null}
      </div>
    </Card>
  );
}

function StatGrid({ data, loading }: { data: OfferPosition | undefined; loading?: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tierConfig.map(({ key, tier }) => {
        if (loading || !data) {
          return (
            <Card key={key} className="flex flex-col gap-1 p-3">
              <span className="text-sm text-muted-foreground">
                {t("components.performanceTable.topRank", { rank: tier })}
              </span>
              <div className="flex items-baseline gap-1">
                <Skeleton className="h-5 w-8" />
                <span className="text-sm text-muted-foreground">
                  {t("components.performanceTable.days", { count: 0 })}
                </span>
              </div>
            </Card>
          );
        }
        const value = data[key] ?? 0;
        const isZero = value === 0;
        return (
          <Card key={key} className={cn("flex flex-col gap-1 p-3", isZero && "opacity-50")}>
            <span className="text-sm text-muted-foreground">
              {t("components.performanceTable.topRank", { rank: tier })}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
              <span className="text-sm text-muted-foreground">
                {t("components.performanceTable.days", { count: value })}
              </span>
            </div>
            {tier <= 10 && value > 0 ? <Crown className="mt-0.5 size-3.5 text-amber-500" /> : null}
          </Card>
        );
      })}
    </div>
  );
}

function SummaryLine({ data, loading }: { data: OfferPosition | undefined; loading?: boolean }) {
  const { locale, timezone } = useLocale();
  const { t } = useTranslation();
  const summary = useMemo(() => summarizePositions(data?.positions), [data?.positions]);

  if (loading || !data || summary.tracked === 0) {
    return (
      <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {loading ? (
          <>
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-20" />
          </>
        ) : null}
      </div>
    );
  }

  const bestDateLabel = summary.bestDate
    ? DateTime.fromISO(summary.bestDate)
        .setZone(timezone || "UTC")
        .setLocale(locale || "en-US")
        .toLocaleString({ day: "numeric", month: "short" })
    : null;

  return (
    <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Crown className="size-3.5 text-amber-500" />
        {t("components.performanceTable.best")}
        <span className="font-medium text-foreground">
          {summary.best === 0 ? "—" : `#${summary.best}`}
        </span>
        {bestDateLabel ? <span className="text-muted-foreground">· {bestDateLabel}</span> : null}
      </span>
      <span className="inline-flex items-center gap-1">
        {t("components.performanceTable.tracked")}
        <span className="font-medium text-foreground">
          {t("components.performanceTable.trackedDays", { count: summary.tracked })}
        </span>
      </span>
    </div>
  );
}

function PerformanceSkeleton() {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-[140px] shrink-0" />
        ))}
      </div>
    </div>
  );
}

export function PerformanceTable({
  data,
  onChange,
  tops,
  defaultCollection,
  isLoading = false,
}: {
  data: OfferPosition | undefined;
  onChange: (value: string) => void;
  tops: Record<string, number>;
  defaultCollection: string;
  isLoading?: boolean;
}) {
  const { timezone } = useLocale();
  const { t } = useTranslation();
  const [timeframe, setTimeframe] = useState<{ from: Date; to: Date | undefined }>({
    from: DateTime.now()
      .setZone(timezone || "UTC")
      .minus({ days: 7 })
      .toJSDate(),
    to: DateTime.now()
      .setZone(timezone || "UTC")
      .toJSDate(),
  });
  const [view, setView] = useState<"cards" | "chart">("cards");
  const [hasUserSetTimeframe, setHasUserSetTimeframe] = useState(false);

  useEffect(() => {
    if (!data?.positions?.length || hasUserSetTimeframe) return;

    const dates = data.positions.map((pos) =>
      DateTime.fromISO(pos.date).setZone(timezone || "UTC"),
    );
    const minDate = DateTime.min(...dates);
    const maxDate = DateTime.max(...dates);
    if (!minDate || !maxDate) return;

    setTimeframe({ from: minDate.toJSDate(), to: maxDate.toJSDate() });
  }, [data?.positions, timezone, hasUserSetTimeframe]);

  const filteredPositions = useMemo(() => {
    if (!data?.positions) return [];

    return data.positions
      .filter((pos) => {
        const date = DateTime.fromISO(pos.date).setZone(timezone || "UTC");
        const fromDateTime = DateTime.fromJSDate(timeframe.from).setZone(timezone || "UTC");
        const toDateTime = timeframe.to
          ? DateTime.fromJSDate(timeframe.to).setZone(timezone || "UTC")
          : DateTime.now().setZone(timezone || "UTC");

        return date >= fromDateTime.startOf("day") && date <= toDateTime.endOf("day");
      })
      .sort((a, b) => DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis());
  }, [data?.positions, timeframe, timezone]);

  const collectionLabels: Record<string, string> = {
    "top-sellers": t("components.performanceTable.collections.topSellers"),
    "most-played": t("components.performanceTable.collections.mostPlayed"),
    "top-wishlisted": t("components.performanceTable.collections.topWishlisted"),
    "top-new-releases": t("components.performanceTable.collections.topNewReleases"),
    "most-popular": t("components.performanceTable.collections.mostPopular"),
    "top-player-reviewed": t("components.performanceTable.collections.topPlayerReviewed"),
    "top-demos": t("components.performanceTable.collections.topDemos"),
    "top-free-to-play": t("components.performanceTable.collections.topFreeToPlay"),
    "top-add-ons": t("components.performanceTable.collections.topAddOns"),
  };
  const activeCollectionLabel =
    collectionLabels[defaultCollection] ?? t("components.performanceTable.title");
  const hasData = !!data;
  const hasInRange = filteredPositions.length > 0;

  return (
    <div className="w-full rounded-lg border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              {t("components.performanceTable.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{activeCollectionLabel}</p>
            <SummaryLine data={data} loading={isLoading} />
          </div>

          <div className="flex items-center gap-2">
            <DateRangePicker
              handleChange={({ from, to }) => {
                setTimeframe({ from, to });
                setHasUserSetTimeframe(true);
              }}
            />
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => {
                if (value) setView(value as "cards" | "chart");
              }}
              variant="outline"
              size="sm"
              className="rounded-md border bg-muted/40 p-0.5"
            >
              <ToggleGroupItem
                value="cards"
                aria-label={t("components.performanceTable.cardsView")}
              >
                <CardStackIcon className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="chart"
                aria-label={t("components.performanceTable.chartView")}
              >
                <ChartBar className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <Tabs defaultValue={defaultCollection} className="w-full" onValueChange={onChange}>
          <ScrollArea className="w-full">
            <TabsList className="bg-muted text-muted-foreground">
              {Object.entries(tops).map(([key]) => (
                <TabsTrigger key={key} value={key}>
                  {collectionLabels[key] ?? key}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <div className="mt-4 space-y-4">
            {isLoading ? (
              <PerformanceSkeleton />
            ) : !hasData ? (
              <PerformanceEmptyState variant="no-data" />
            ) : !hasInRange ? (
              <PerformanceEmptyState variant="no-range" />
            ) : view === "cards" ? (
              <ScrollArea className="w-full">
                <div className="flex w-max gap-3 pb-3">
                  {filteredPositions.map((pos, idx, array) => {
                    const hasPrevious = idx < array.length - 1;
                    const change = hasPrevious
                      ? computeChange(pos.position, array[idx + 1].position)
                      : 0;
                    return (
                      <PerformanceCard
                        key={pos._id}
                        position={pos.position}
                        change={change}
                        date={pos.date}
                        hasPrevious={hasPrevious}
                      />
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : timeframe.to ? (
              <PerformancePositionsChart
                positions={filteredPositions}
                timeframe={{ from: timeframe.from, to: timeframe.to }}
              />
            ) : null}

            <StatGrid data={data} loading={isLoading} />
          </div>
        </Tabs>
      </div>
    </div>
  );
}
