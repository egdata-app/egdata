export interface TimelineSource {
  id: string;
  firstSeenAt: string | null;
}

export interface TimelinePoint<T extends TimelineSource> {
  build: T;
  timestamp: number;
  position: number;
}

export interface NormalizedBuildTimeline<T extends TimelineSource> {
  points: TimelinePoint<T>[];
  undated: T[];
  start: number | null;
  end: number | null;
}

export interface TimelineCluster<T extends TimelineSource> {
  id: string;
  points: TimelinePoint<T>[];
  position: number;
}

export type TimelineDirection = "forward" | "backward" | "same" | "unknown";

const TICK_STEPS = [
  60 * 60 * 1000,
  3 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
  90 * 24 * 60 * 60 * 1000,
  180 * 24 * 60 * 60 * 1000,
  365 * 24 * 60 * 60 * 1000,
] as const;

export function normalizeBuildTimeline<T extends TimelineSource>(
  builds: T[],
): NormalizedBuildTimeline<T> {
  const points: Array<Omit<TimelinePoint<T>, "position">> = [];
  const undated: T[] = [];

  for (const build of builds) {
    if (!build.firstSeenAt) {
      undated.push(build);
      continue;
    }

    const timestamp = Date.parse(build.firstSeenAt);
    if (!Number.isFinite(timestamp)) {
      undated.push(build);
      continue;
    }

    points.push({ build, timestamp });
  }

  points.sort(
    (left, right) =>
      left.timestamp - right.timestamp || left.build.id.localeCompare(right.build.id),
  );
  const start = points[0]?.timestamp ?? null;
  const end = points.at(-1)?.timestamp ?? null;
  const span = start !== null && end !== null ? end - start : 0;

  return {
    points: points.map((point) => ({
      ...point,
      position: span > 0 && start !== null ? ((point.timestamp - start) / span) * 100 : 50,
    })),
    undated,
    start,
    end,
  };
}

export function generateTimelineTicks(start: number | null, end: number | null): number[] {
  if (start === null || end === null) return [];
  if (start === end) return [start];

  const span = end - start;
  const step =
    TICK_STEPS.find((candidate) => span / candidate <= 7) ??
    Math.ceil(span / (7 * TICK_STEPS.at(-1)!)) * TICK_STEPS.at(-1)!;
  const ticks = [start];
  const firstAligned = Math.ceil(start / step) * step;

  for (let value = firstAligned; value < end; value += step) {
    if (value > start) ticks.push(value);
  }

  ticks.push(end);
  if (ticks.length >= 4 && ticks.length <= 8) return ticks;

  const count = ticks.length < 4 ? 4 : 8;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? end : start + Math.round((span * index) / (count - 1)),
  );
}

export function clusterTimelinePoints<T extends TimelineSource>(
  points: TimelinePoint<T>[],
  width: number,
  minimumGap = 28,
): TimelineCluster<T>[] {
  if (!points.length) return [];

  const safeWidth = Math.max(width, minimumGap);
  const clusters: TimelineCluster<T>[] = [];
  let current: TimelinePoint<T>[] = [];

  const flush = () => {
    if (!current.length) return;
    const position = current.reduce((total, point) => total + point.position, 0) / current.length;
    clusters.push({
      id: current.map((point) => point.build.id).join(":"),
      points: current,
      position,
    });
    current = [];
  };

  for (const point of points) {
    const previous = current.at(-1);
    const distance = previous
      ? (Math.abs(point.position - previous.position) / 100) * safeWidth
      : Number.POSITIVE_INFINITY;

    if (previous && distance >= minimumGap) flush();
    current.push(point);
  }

  flush();
  return clusters;
}

export function getTimelineDirection(
  baselineTimestamp: number | null | undefined,
  currentTimestamp: number | null | undefined,
): TimelineDirection {
  if (baselineTimestamp === null || baselineTimestamp === undefined) return "unknown";
  if (currentTimestamp === null || currentTimestamp === undefined) return "unknown";
  if (baselineTimestamp === currentTimestamp) return "same";
  return baselineTimestamp < currentTimestamp ? "forward" : "backward";
}
