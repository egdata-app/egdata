import assert from "node:assert/strict";
import test from "node:test";
import {
  clusterTimelinePoints,
  generateTimelineTicks,
  getTimelineDirection,
  normalizeBuildTimeline,
} from "../../src/lib/build-history-timeline.ts";

const build = (id: string, firstSeenAt: string | null) => ({ id, firstSeenAt });

test("normalizes builds chronologically and separates invalid dates", () => {
  const timeline = normalizeBuildTimeline([
    build("later", "2026-07-03T00:00:00.000Z"),
    build("missing", null),
    build("earlier", "2026-07-01T00:00:00.000Z"),
    build("invalid", "not-a-date"),
    build("middle", "2026-07-02T00:00:00.000Z"),
  ]);

  assert.deepEqual(
    timeline.points.map((point) => point.build.id),
    ["earlier", "middle", "later"],
  );
  assert.deepEqual(
    timeline.points.map((point) => point.position),
    [0, 50, 100],
  );
  assert.deepEqual(
    timeline.undated.map((entry) => entry.id),
    ["missing", "invalid"],
  );
});

test("keeps equal timestamps together at the timeline midpoint", () => {
  const timeline = normalizeBuildTimeline([
    build("one", "2026-07-01T10:00:00.000Z"),
    build("two", "2026-07-01T10:00:00.000Z"),
  ]);

  assert.deepEqual(
    timeline.points.map((point) => point.position),
    [50, 50],
  );
});

test("generates a bounded set of adaptive ticks including both endpoints", () => {
  const start = Date.parse("2026-07-01T00:00:00.000Z");
  const end = Date.parse("2026-07-08T00:00:00.000Z");
  const ticks = generateTimelineTicks(start, end);

  assert.equal(ticks[0], start);
  assert.equal(ticks.at(-1), end);
  assert.ok(ticks.length >= 4 && ticks.length <= 8);
});

test("keeps short and very long ranges within the four-to-eight tick budget", () => {
  const shortStart = Date.parse("2026-07-01T00:00:00.000Z");
  const shortEnd = Date.parse("2026-07-01T00:05:00.000Z");
  const longStart = Date.parse("2010-01-01T00:00:00.000Z");
  const longEnd = Date.parse("2026-07-01T00:00:00.000Z");

  for (const ticks of [
    generateTimelineTicks(shortStart, shortEnd),
    generateTimelineTicks(longStart, longEnd),
  ]) {
    assert.ok(ticks.length >= 4 && ticks.length <= 8);
    assert.ok(ticks.every((tick, index) => index === 0 || tick > ticks[index - 1]));
  }
});

test("clusters dense markers while leaving distant markers separate", () => {
  const timeline = normalizeBuildTimeline([
    build("one", "2026-07-01T00:00:00.000Z"),
    build("two", "2026-07-01T01:00:00.000Z"),
    build("three", "2026-07-03T00:00:00.000Z"),
  ]);
  const clusters = clusterTimelinePoints(timeline.points, 600, 28);

  assert.equal(clusters.length, 2);
  assert.deepEqual(
    clusters.map((cluster) => cluster.points.map((point) => point.build.id)),
    [["one", "two"], ["three"]],
  );
});

test("reports forward, backward, same, and unknown comparison directions", () => {
  assert.equal(getTimelineDirection(1, 2), "forward");
  assert.equal(getTimelineDirection(2, 1), "backward");
  assert.equal(getTimelineDirection(1, 1), "same");
  assert.equal(getTimelineDirection(null, 1), "unknown");
});
