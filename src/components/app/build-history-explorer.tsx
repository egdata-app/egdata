import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocale } from "@/hooks/use-locale";
import {
  clusterTimelinePoints,
  generateTimelineTicks,
  getTimelineDirection,
  normalizeBuildTimeline,
  type TimelinePoint,
} from "@/lib/build-history-timeline";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/paraglide-react";
import type { BuildHistoryEntry, ManifestStatus } from "@/types/builds";
import {
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  GitCompareArrowsIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { DateTime } from "luxon";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";

interface BuildHistoryExplorerProps {
  builds: BuildHistoryEntry[];
  currentId: string;
  baselineId?: string;
  onSelectCurrent: (id: string) => void;
  onSelectBaseline: (id: string) => void;
  onSwap: () => void;
}

export function buildHealthBadgeClass(status: ManifestStatus) {
  return status === "verified"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : status === "legacy_unverified"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
      : "border-destructive/40 bg-destructive/10 text-destructive";
}

function getDateTime(
  value: string | null,
  timezone: string | undefined,
  locale: string | undefined,
) {
  if (!value) return null;
  const date = DateTime.fromISO(value)
    .setZone(timezone || "UTC")
    .setLocale(locale || "en-US");
  return date.isValid ? date : null;
}

function formatObservedDate(
  value: string | null,
  timezone: string | undefined,
  locale: string | undefined,
  full = false,
) {
  const date = getDateTime(value, timezone, locale);
  if (!date) return null;
  return date.toLocaleString(
    full ? { ...DateTime.DATETIME_MED_WITH_SECONDS, timeZoneName: "short" } : DateTime.DATETIME_MED,
  );
}

function HealthBadge({ status }: { status: ManifestStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn("shrink-0", buildHealthBadgeClass(status))}>
      {t(`builds.health.${status}`)}
    </Badge>
  );
}

function EndpointPicker({
  kind,
  value,
  builds,
  currentId,
  onSelect,
}: {
  kind: "current" | "baseline";
  value?: string;
  builds: BuildHistoryEntry[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { locale, timezone } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = builds.find((build) => build.id === value);
  const options = useMemo(
    () =>
      [...builds].sort((left, right) => {
        const parsedLeftDate = left.firstSeenAt ? Date.parse(left.firstSeenAt) : Number.NaN;
        const parsedRightDate = right.firstSeenAt ? Date.parse(right.firstSeenAt) : Number.NaN;
        const leftDate = Number.isFinite(parsedLeftDate)
          ? parsedLeftDate
          : Number.NEGATIVE_INFINITY;
        const rightDate = Number.isFinite(parsedRightDate)
          ? parsedRightDate
          : Number.NEGATIVE_INFINITY;
        return rightDate - leftDate;
      }),
    [builds],
  );
  const label =
    kind === "current" ? t("builds.comparison.current") : t("builds.comparison.compareAgainst");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto min-h-20 w-full justify-start gap-3 px-3 py-2 text-left",
            kind === "current"
              ? "border-cyan-500/45 bg-cyan-500/5 hover:bg-cyan-500/10"
              : "border-blue-500/45 bg-blue-500/5 hover:bg-blue-500/10",
          )}
          data-testid={kind === "current" ? "current-build-select" : "previous-build-select"}
        >
          <span
            aria-hidden
            className={cn(
              "size-2.5 shrink-0 rounded-full ring-4",
              kind === "current" ? "bg-cyan-400 ring-cyan-400/10" : "bg-blue-400 ring-blue-400/10",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="mt-1 block truncate font-mono text-sm">
              {selected?.buildVersion ?? t("builds.comparison.noPrevious")}
            </span>
            <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
              {selected
                ? (formatObservedDate(selected.firstSeenAt, timezone, locale) ??
                  t("builds.timeline.dateUnavailable"))
                : t("builds.timeline.selectBuild")}
            </span>
          </span>
          {selected && <HealthBadge status={selected.manifest.status} />}
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(34rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder={t("builds.timeline.searchBuilds")} />
          <CommandList>
            <CommandEmpty>{t("builds.timeline.noBuilds")}</CommandEmpty>
            {options.map((build) => {
              const disabled = kind === "baseline" && (build.id === currentId || !build.comparable);
              const observed =
                formatObservedDate(build.firstSeenAt, timezone, locale, true) ??
                t("builds.timeline.dateUnavailable");
              return (
                <CommandItem
                  key={build.id}
                  value={`${build.buildVersion} ${observed} ${build.manifest.status}`}
                  disabled={disabled}
                  onSelect={() => {
                    if (disabled) return;
                    onSelect(build.id);
                    setOpen(false);
                  }}
                  className="gap-3 py-2"
                >
                  <CheckIcon
                    className={cn(
                      "size-4 shrink-0",
                      build.id === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-xs">{build.buildVersion}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {observed}
                    </span>
                    {disabled && build.id !== currentId && (
                      <span className="mt-0.5 block text-[11px] text-destructive">
                        {t("builds.timeline.notComparable")}
                      </span>
                    )}
                  </span>
                  <HealthBadge status={build.manifest.status} />
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function BuildActions({
  build,
  currentId,
  baselineId,
  onSelectCurrent,
  onSelectBaseline,
  children,
}: {
  build: BuildHistoryEntry;
  currentId: string;
  baselineId?: string;
  onSelectCurrent: (id: string) => void;
  onSelectBaseline: (id: string) => void;
  children: ReactElement;
}) {
  const { t } = useTranslation();
  const { locale, timezone } = useLocale();
  const [open, setOpen] = useState(false);
  const observed =
    formatObservedDate(build.firstSeenAt, timezone, locale, true) ??
    t("builds.timeline.dateUnavailable");
  const canCompare = build.comparable && build.id !== currentId;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))]" align="center">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-medium">{build.buildVersion}</p>
          <p className="mt-1 text-xs text-muted-foreground">{observed}</p>
          <div className="mt-3">
            <HealthBadge status={build.manifest.status} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canCompare || build.id === baselineId}
            onClick={() => {
              onSelectBaseline(build.id);
              setOpen(false);
            }}
          >
            <GitCompareArrowsIcon />
            {t("builds.timeline.useAsBaseline")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={build.id === currentId}
            onClick={() => {
              onSelectCurrent(build.id);
              setOpen(false);
            }}
          >
            <EyeIcon />
            {t("builds.timeline.viewAsCurrent")}
          </Button>
        </div>
        {!canCompare && build.id !== currentId && (
          <p className="mt-3 text-xs text-destructive">{t("builds.timeline.notComparable")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ClusterActions({
  points,
  currentId,
  baselineId,
  onSelectCurrent,
  onSelectBaseline,
  children,
}: {
  points: TimelinePoint<BuildHistoryEntry>[];
  currentId: string;
  baselineId?: string;
  onSelectCurrent: (id: string) => void;
  onSelectBaseline: (id: string) => void;
  children: ReactElement;
}) {
  const { t } = useTranslation();
  const { locale, timezone } = useLocale();
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[min(34rem,calc(100vw-2rem))] p-2" align="center">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("builds.timeline.clusteredBuilds", { count: points.length })}
        </p>
        <div className="max-h-72 divide-y divide-border/60 overflow-y-auto">
          {[...points].reverse().map(({ build }) => {
            const observed =
              formatObservedDate(build.firstSeenAt, timezone, locale, true) ??
              t("builds.timeline.dateUnavailable");
            return (
              <div key={build.id} className="flex items-center gap-2 px-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs">{build.buildVersion}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {observed}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("builds.timeline.useAsBaseline")}
                  disabled={!build.comparable || build.id === currentId || build.id === baselineId}
                  onClick={() => onSelectBaseline(build.id)}
                >
                  <GitCompareArrowsIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("builds.timeline.viewAsCurrent")}
                  disabled={build.id === currentId}
                  onClick={() => onSelectCurrent(build.id)}
                >
                  <EyeIcon />
                </Button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SelectedLabel({
  build,
  kind,
  position,
  top,
}: {
  build: BuildHistoryEntry;
  kind: "current" | "baseline";
  position: number;
  top: number;
}) {
  const { t } = useTranslation();
  const { locale, timezone } = useLocale();
  return (
    <div
      className={cn(
        "absolute z-10 w-44 -translate-x-1/2 rounded-md border bg-background/95 px-2.5 py-2 shadow-lg backdrop-blur",
        kind === "current" ? "border-cyan-400/70" : "border-blue-400/70",
      )}
      style={{ left: `${position}%`, top }}
      data-testid={`${kind}-timeline-label`}
    >
      <span
        className={cn(
          "block text-[10px] font-semibold uppercase tracking-wide",
          kind === "current" ? "text-cyan-300" : "text-blue-300",
        )}
      >
        {kind === "current" ? t("builds.comparison.current") : t("builds.timeline.baseline")}
      </span>
      <span className="mt-0.5 block truncate font-mono text-xs">{build.buildVersion}</span>
      <span className="mt-1 block truncate text-[10px] text-muted-foreground">
        {formatObservedDate(build.firstSeenAt, timezone, locale) ??
          t("builds.timeline.dateUnavailable")}
      </span>
    </div>
  );
}

function DesktopTimeline({
  builds,
  currentId,
  baselineId,
  onSelectCurrent,
  onSelectBaseline,
}: Omit<BuildHistoryExplorerProps, "onSwap">) {
  const { t } = useTranslation();
  const { locale, timezone } = useLocale();
  const rulerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const timeline = useMemo(() => normalizeBuildTimeline(builds), [builds]);
  const ticks = useMemo(
    () => generateTimelineTicks(timeline.start, timeline.end),
    [timeline.end, timeline.start],
  );
  const clusters = useMemo(
    () => clusterTimelinePoints(timeline.points, width, 28),
    [timeline.points, width],
  );
  const current = builds.find((build) => build.id === currentId);
  const baseline = builds.find((build) => build.id === baselineId);
  const currentPoint = timeline.points.find((point) => point.build.id === currentId);
  const baselinePoint = timeline.points.find((point) => point.build.id === baselineId);
  const place = (position: number) => Math.min(92, Math.max(8, 4 + position * 0.92));
  const currentPosition = currentPoint ? place(currentPoint.position) : null;
  const baselinePosition = baselinePoint ? place(baselinePoint.position) : null;
  const overlap =
    currentPosition !== null &&
    baselinePosition !== null &&
    Math.abs(currentPosition - baselinePosition) < 20;
  const direction = getTimelineDirection(baselinePoint?.timestamp, currentPoint?.timestamp);

  useEffect(() => {
    const element = rulerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const span = timeline.start !== null && timeline.end !== null ? timeline.end - timeline.start : 0;
  const tickMinimumGap = (96 / Math.max(width, 1)) * 100;
  const positionedTicks = ticks.map((tick) => ({
    tick,
    position: place(
      span > 0 && timeline.start !== null ? ((tick - timeline.start) / span) * 100 : 50,
    ),
  }));
  const visibleTicks: typeof positionedTicks = [];
  for (const positionedTick of positionedTicks) {
    const previous = visibleTicks.at(-1);
    const isLast = positionedTick === positionedTicks.at(-1);
    if (!previous || positionedTick.position - previous.position >= tickMinimumGap) {
      visibleTicks.push(positionedTick);
    } else if (isLast) {
      if (visibleTicks.length > 1) visibleTicks.pop();
      visibleTicks.push(positionedTick);
    }
  }

  return (
    <div className="hidden md:block" data-testid="desktop-build-timeline">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ArrowLeftIcon className="size-3.5" /> {t("builds.timeline.earlier")}
        </span>
        <span className="inline-flex items-center gap-1">
          {t("builds.timeline.later")} <ArrowRightIcon className="size-3.5" />
        </span>
      </div>
      <div
        ref={rulerRef}
        className="relative h-64 w-full overflow-hidden rounded-md bg-background/35"
      >
        {visibleTicks.map(({ tick, position }) => {
          const date = DateTime.fromMillis(tick)
            .setZone(timezone || "UTC")
            .setLocale(locale || "en-US");
          return (
            <div
              key={tick}
              className="absolute top-0 h-[168px] -translate-x-1/2 border-l border-border/45"
              style={{ left: `${position}%` }}
            >
              <span className="absolute left-0 top-2 w-28 -translate-x-1/2 text-center text-[10px] text-muted-foreground">
                {date.toLocaleString(
                  span <= 2 * 24 * 60 * 60 * 1000 ? DateTime.DATETIME_SHORT : DateTime.DATE_MED,
                )}
              </span>
            </div>
          );
        })}

        {baseline && baselinePosition !== null && (
          <SelectedLabel
            build={baseline}
            kind="baseline"
            position={baselinePosition}
            top={overlap ? 44 : 72}
          />
        )}
        {current && currentPosition !== null && (
          <SelectedLabel
            build={current}
            kind="current"
            position={currentPosition}
            top={overlap ? 96 : 72}
          />
        )}

        <div className="absolute left-[4%] right-[4%] top-[168px] h-px bg-border" aria-hidden />
        {currentPosition !== null && baselinePosition !== null && (
          <div
            className="absolute top-[167px] h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400"
            style={{
              left: `${Math.min(currentPosition, baselinePosition)}%`,
              width: `${Math.abs(currentPosition - baselinePosition)}%`,
            }}
            aria-hidden
          />
        )}

        {clusters.map((cluster) => {
          const selected = cluster.points.filter(
            ({ build }) => build.id === currentId || build.id === baselineId,
          );
          const remaining = cluster.points.filter(
            ({ build }) => build.id !== currentId && build.id !== baselineId,
          );
          return (
            <div key={cluster.id}>
              {selected.map(({ build, position }, index) => {
                const isCurrent = build.id === currentId;
                return (
                  <BuildActions
                    key={build.id}
                    build={build}
                    currentId={currentId}
                    baselineId={baselineId}
                    onSelectCurrent={onSelectCurrent}
                    onSelectBaseline={onSelectBaseline}
                  >
                    <button
                      type="button"
                      className={cn(
                        "absolute top-[160px] z-20 size-[17px] -translate-x-1/2 rounded-full border-2 border-background shadow-[0_0_0_2px] transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isCurrent ? "bg-cyan-400 text-cyan-400" : "bg-blue-400 text-blue-400",
                      )}
                      style={{ left: `calc(${place(position)}% + ${index * 6}px)` }}
                      aria-label={`${build.buildVersion}, ${isCurrent ? t("builds.comparison.current") : t("builds.timeline.baseline")}`}
                      aria-current={isCurrent ? "true" : undefined}
                      data-build-id={build.id}
                    />
                  </BuildActions>
                );
              })}
              {remaining.length > 0 &&
                (remaining.length === 1 ? (
                  <BuildActions
                    build={remaining[0].build}
                    currentId={currentId}
                    baselineId={baselineId}
                    onSelectCurrent={onSelectCurrent}
                    onSelectBaseline={onSelectBaseline}
                  >
                    <button
                      type="button"
                      className="absolute top-[162px] z-10 size-3 -translate-x-1/2 rounded-full border-2 border-background bg-muted-foreground shadow-[0_0_0_1px_hsl(var(--border))] transition-transform hover:scale-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ left: `${place(remaining[0].position)}%` }}
                      aria-label={`${remaining[0].build.buildVersion}, ${formatObservedDate(remaining[0].build.firstSeenAt, timezone, locale, true) ?? t("builds.timeline.dateUnavailable")}`}
                      data-build-id={remaining[0].build.id}
                    />
                  </BuildActions>
                ) : (
                  <ClusterActions
                    points={remaining}
                    currentId={currentId}
                    baselineId={baselineId}
                    onSelectCurrent={onSelectCurrent}
                    onSelectBaseline={onSelectBaseline}
                  >
                    <button
                      type="button"
                      className="absolute top-[154px] z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold shadow-md transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{ left: `${place(cluster.position)}%` }}
                      aria-label={t("builds.timeline.clusteredBuilds", { count: remaining.length })}
                      data-testid="build-timeline-cluster"
                    >
                      {remaining.length}
                    </button>
                  </ClusterActions>
                ))}
            </div>
          );
        })}

        {currentPosition !== null && baselinePosition !== null && (
          <div
            className="absolute top-[202px] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border/70 bg-background/85 px-3 py-1 text-[11px] text-muted-foreground"
            style={{ left: `${(currentPosition + baselinePosition) / 2}%` }}
          >
            {direction !== "backward" ? (
              <ArrowRightIcon className="size-3.5 text-cyan-300" />
            ) : (
              <ArrowLeftIcon className="size-3.5 text-cyan-300" />
            )}
            {t("builds.timeline.comparisonDirection")}
          </div>
        )}
      </div>
      {timeline.undated.length > 0 && (
        <ClusterActions
          points={timeline.undated.map((build) => ({ build, position: 0, timestamp: 0 }))}
          currentId={currentId}
          baselineId={baselineId}
          onSelectCurrent={onSelectCurrent}
          onSelectBaseline={onSelectBaseline}
        >
          <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground">
            <CalendarClockIcon />
            {t("builds.timeline.undatedBuilds", { count: timeline.undated.length })}
          </Button>
        </ClusterActions>
      )}
    </div>
  );
}

function MobileTrail({
  builds,
  currentId,
  baselineId,
  onSelectCurrent,
  onSelectBaseline,
}: Omit<BuildHistoryExplorerProps, "onSwap">) {
  const { t } = useTranslation();
  const { locale, timezone } = useLocale();
  const groups = useMemo(() => {
    const sorted = [...builds].sort((left, right) => {
      const leftDate = left.firstSeenAt ? Date.parse(left.firstSeenAt) : Number.NEGATIVE_INFINITY;
      const rightDate = right.firstSeenAt
        ? Date.parse(right.firstSeenAt)
        : Number.NEGATIVE_INFINITY;
      return rightDate - leftDate;
    });
    const result = new Map<string, BuildHistoryEntry[]>();
    for (const build of sorted) {
      const date = getDateTime(build.firstSeenAt, timezone, locale);
      const key = date?.toISODate() ?? "undated";
      result.set(key, [...(result.get(key) ?? []), build]);
    }
    return [...result.entries()];
  }, [builds, locale, timezone]);

  return (
    <div className="md:hidden" data-testid="mobile-build-trail">
      <div className="relative space-y-4 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-border">
        {groups.map(([key, entries]) => (
          <section key={key} className="relative pl-6">
            <span
              aria-hidden
              className="absolute left-0 top-2 size-3.5 rounded-full border-2 border-background bg-muted-foreground ring-1 ring-border"
            />
            <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
              {key === "undated"
                ? t("builds.timeline.dateUnavailable")
                : getDateTime(entries[0].firstSeenAt, timezone, locale)?.toLocaleString(
                    DateTime.DATE_MED_WITH_WEEKDAY,
                  )}
            </h3>
            <div className="divide-y divide-border/60 overflow-hidden rounded-md border border-border/60 bg-background/35">
              {entries.map((build) => {
                const isCurrent = build.id === currentId;
                const isBaseline = build.id === baselineId;
                const time = getDateTime(build.firstSeenAt, timezone, locale)?.toLocaleString({
                  ...DateTime.TIME_WITH_SECONDS,
                  timeZoneName: "short",
                });
                return (
                  <BuildActions
                    key={build.id}
                    build={build}
                    currentId={currentId}
                    baselineId={baselineId}
                    onSelectCurrent={onSelectCurrent}
                    onSelectBaseline={onSelectBaseline}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        isCurrent && "bg-cyan-500/5",
                        isBaseline && "bg-blue-500/5",
                      )}
                      data-build-id={build.id}
                      aria-current={isCurrent ? "true" : undefined}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs">
                          {build.buildVersion}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {time ?? t("builds.timeline.dateUnavailable")}
                        </span>
                      </span>
                      {(isCurrent || isBaseline) && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 text-[9px]",
                            isCurrent
                              ? "border-cyan-500/50 text-cyan-300"
                              : "border-blue-500/50 text-blue-300",
                          )}
                        >
                          {isCurrent
                            ? t("builds.comparison.current")
                            : t("builds.timeline.baseline")}
                        </Badge>
                      )}
                      <MoreHorizontalIcon className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  </BuildActions>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function BuildHistoryExplorer({
  builds,
  currentId,
  baselineId,
  onSelectCurrent,
  onSelectBaseline,
  onSwap,
}: BuildHistoryExplorerProps) {
  const { t } = useTranslation();

  if (!builds.length) return null;

  return (
    <section
      aria-label={t("builds.timeline.title")}
      data-testid="build-timeline"
      className="overflow-hidden rounded-lg border border-border/60 bg-card/40 p-4 shadow-sm md:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t("builds.timeline.title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("builds.timeline.description")}</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <CalendarClockIcon className="size-3.5" />
          {t("builds.timeline.observed")}
        </Badge>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <EndpointPicker
          kind="baseline"
          value={baselineId}
          builds={builds}
          currentId={currentId}
          onSelect={onSelectBaseline}
        />
        <Button
          variant="outline"
          size="icon"
          className="mx-auto size-9 rotate-90 md:rotate-0"
          disabled={!baselineId}
          aria-label={t("builds.comparison.swap")}
          onClick={onSwap}
        >
          <ArrowLeftRightIcon />
        </Button>
        <EndpointPicker
          kind="current"
          value={currentId}
          builds={builds}
          currentId={currentId}
          onSelect={onSelectCurrent}
        />
      </div>

      <DesktopTimeline
        builds={builds}
        currentId={currentId}
        baselineId={baselineId}
        onSelectCurrent={onSelectCurrent}
        onSelectBaseline={onSelectBaseline}
      />
      <MobileTrail
        builds={builds}
        currentId={currentId}
        baselineId={baselineId}
        onSelectCurrent={onSelectCurrent}
        onSelectBaseline={onSelectBaseline}
      />
    </section>
  );
}
