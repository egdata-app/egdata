import type { OfferPosition, Position } from "@/types/collections";

export const OUT_OF_TOP = 100;

export function toPositionValue(position: number): number {
  return position === 0 ? OUT_OF_TOP : position;
}

export function positionLabel(position: number): string {
  return position === 0 ? "Off chart" : `Top ${position}`;
}

export function computeChange(current: number, previous: number): number {
  return toPositionValue(current) - toPositionValue(previous);
}

export type ChangeDirection = "up" | "down" | "none";

export function changeDirection(change: number): ChangeDirection {
  if (change < 0) return "up";
  if (change > 0) return "down";
  return "none";
}

export function changeAriaLabel(change: number): string {
  const direction = changeDirection(change);
  if (direction === "none") return "No change";
  const places = Math.abs(change);
  return direction === "up" ? `Moved up ${places} places` : `Moved down ${places} places`;
}

export interface PerformanceSummary {
  best: number;
  bestDate: string | null;
  streak: number;
  tracked: number;
}

export function summarizePositions(positions: Position[] | undefined): PerformanceSummary {
  if (!positions || positions.length === 0) {
    return { best: 0, bestDate: null, streak: 0, tracked: 0 };
  }

  const valid = positions.filter((p) => p.position > 0);
  const best = valid.length > 0 ? Math.min(...valid.map((p) => p.position)) : 0;
  const bestEntry = valid.find((p) => p.position === best) ?? null;

  const tracked = positions.length;

  const streak = valid.reduce((acc, p) => (p.position <= 100 ? acc + 1 : acc), 0);

  return {
    best,
    bestDate: bestEntry?.date ?? null,
    streak,
    tracked,
  };
}

export function bestCollectionKey(
  tops: Record<string, number> | null | undefined,
  fallback: string,
): string {
  if (!tops || Object.keys(tops).length === 0) return fallback;
  return Object.keys(tops).reduce(
    (acc, key) => (tops[key] < tops[acc] ? key : acc),
    Object.keys(tops)[0],
  );
}

export type { OfferPosition };
