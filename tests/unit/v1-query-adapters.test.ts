import assert from "node:assert/strict";
import test from "node:test";
import {
  clearV1CursorCache,
  fetchAllV1CursorPages,
  fetchV1CursorPageAt,
  getV1PaginationTotal,
  getV1TotalPages,
  normalizeV1OfferElements,
  normalizeV1SearchResponse,
  toV1SearchParams,
  unwrapV1Poll,
} from "../../src/lib/v1-adapters.ts";
import type { SinglePoll } from "../../src/types/polls.ts";
import type { SingleOffer } from "../../src/types/single-offer.ts";
import type { SingleOfferWithPrice } from "../../src/types/single-offer-price.ts";

function makeOffer(id: string): SingleOffer {
  return { id, title: `Offer ${id}` } as SingleOffer;
}

test("fetchAllV1CursorPages follows v1 cursor pagination until hasMore is false", async () => {
  const cursorsSeen: Array<string | undefined> = [];

  const result = await fetchAllV1CursorPages(async (cursor) => {
    cursorsSeen.push(cursor);
    if (!cursor) {
      return {
        data: [makeOffer("1"), makeOffer("2")],
        meta: { pagination: { hasMore: true, nextCursor: "cursor-2" } },
      };
    }
    return {
      data: [makeOffer("3")],
      meta: { pagination: { hasMore: false, nextCursor: null } },
    };
  });

  assert.deepEqual(cursorsSeen, [undefined, "cursor-2"]);
  assert.deepEqual(
    result.map((item) => item.id),
    ["1", "2", "3"],
  );
});

test("fetchAllV1CursorPages stops if nextCursor repeats and supports flat arrays", async () => {
  let calls = 0;
  const repeated = await fetchAllV1CursorPages(async () => {
    calls += 1;
    return {
      data: [makeOffer(`p${calls}`)],
      meta: { pagination: { hasMore: true, nextCursor: "same-cursor" } },
    };
  });

  assert.equal(calls, 2);
  assert.deepEqual(
    repeated.map((item) => item.id),
    ["p1", "p2"],
  );

  const flat = await fetchAllV1CursorPages(async () => [makeOffer("legacy")]);
  assert.deepEqual(
    flat.map((item) => item.id),
    ["legacy"],
  );
});

test("unwrapV1Poll extracts nested poll object and tolerates null or direct payloads", () => {
  const poll: SinglePoll = {
    _id: "poll-1",
    averageRating: 4.6,
    pollResult: [],
  };

  assert.deepEqual(unwrapV1Poll({ poll }), poll);
  assert.equal(unwrapV1Poll({ poll: null }), null);
  assert.deepEqual(unwrapV1Poll(poll), poll);
  assert.equal(unwrapV1Poll(null), null);
});

test("normalizeV1OfferElements wraps arrays and defaults invalid responses to empty", () => {
  assert.deepEqual(
    normalizeV1OfferElements([makeOffer("a")]).elements.map((o) => o.id),
    ["a"],
  );
  assert.deepEqual(normalizeV1OfferElements(null), { elements: [] });
  assert.deepEqual(normalizeV1OfferElements(undefined), { elements: [] });
});

test("fetchV1CursorPageAt caches visited cursors and walks forward on cold jumps", async () => {
  const scopeKey = "unit-test-scope";
  clearV1CursorCache(scopeKey);
  const cursorsSeen: Array<string | undefined> = [];

  const fetchPage = async (cursor?: string) => {
    cursorsSeen.push(cursor);
    if (!cursor) {
      return {
        data: [makeOffer("1")],
        meta: { pagination: { limit: 1, hasMore: true, nextCursor: "c2", total: 3 } },
      };
    }
    if (cursor === "c2") {
      return {
        data: [makeOffer("2")],
        meta: { pagination: { limit: 1, hasMore: true, nextCursor: "c3", total: 3 } },
      };
    }
    return {
      data: [makeOffer("3")],
      meta: { pagination: { limit: 1, hasMore: false, nextCursor: null, total: 3 } },
    };
  };

  // Cold jump to page 3 walks pages 1 -> 2 -> 3
  const page3 = await fetchV1CursorPageAt(fetchPage, 3, scopeKey);
  assert.equal(page3.resolvedPage, 3);
  assert.equal(page3.hasMore, false);
  assert.equal(page3.total, 3);
  assert.deepEqual(cursorsSeen, [undefined, "c2", "c3"]);

  // Revisiting page 2 uses the cached cursor directly in 1 call
  cursorsSeen.length = 0;
  const page2 = await fetchV1CursorPageAt(fetchPage, 2, scopeKey);
  assert.equal(page2.resolvedPage, 2);
  assert.equal(page2.hasMore, true);
  assert.deepEqual(cursorsSeen, ["c2"]);
  clearV1CursorCache(scopeKey);
});

test("toV1SearchParams and normalizeV1SearchResponse translate search state and v1 facets", () => {
  const params = toV1SearchParams(
    {
      title: "  alan wake  ",
      tags: ["123", "456"],
      technologies: ["Unreal"],
      price: { min: 100, max: 5000 },
      onSale: true,
      sortBy: "price",
      sortDir: "asc",
      limit: 28,
    },
    { country: "ES", cursor: "cur-1", facets: "full" },
  );

  assert.deepEqual(params, {
    title: "alan wake",
    offerType: undefined,
    tags: "123,456",
    categories: undefined,
    customAttributes: undefined,
    technologies: "Unreal",
    seller: undefined,
    developerDisplayName: undefined,
    publisherDisplayName: undefined,
    refundType: undefined,
    isCodeRedemptionOnly: undefined,
    excludeBlockchain: undefined,
    onSale: true,
    pastGiveaways: undefined,
    isLowestPrice: undefined,
    isLowestPriceEver: undefined,
    priceMin: 100,
    priceMax: 5000,
    sortBy: "price",
    sortDir: "asc",
    facets: "full",
    country: "ES",
    locale: undefined,
    limit: 28,
    cursor: "cur-1",
  });

  const normalized = normalizeV1SearchResponse(
    {
      data: [{ id: "offer-1" } as SingleOfferWithPrice],
      meta: {
        pagination: { limit: 28, hasMore: true, nextCursor: "c2", total: 57 },
        facets: {
          priceStats: { count: 57, min: 0, max: 6999, avg: 1999, sum: 100000 },
          technologies: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
        },
        result: { tookMs: 12, timedOut: false },
      },
    },
    1,
    28,
  );

  assert.equal(normalized.total, 57);
  assert.equal(normalized.totalPages, 3);
  assert.equal(normalized.hasMore, true);
  assert.equal(normalized.nextCursor, "c2");
  assert.equal(normalized.aggregations.price_stats.max, 6999);
  assert.equal(normalized.meta.ms, 12);
});

test("getV1PaginationTotal and getV1TotalPages handle null totals gracefully", () => {
  assert.equal(getV1PaginationTotal({ total: null }, 5), 5);
  assert.equal(getV1PaginationTotal({ total: 42 }, 5), 42);
  assert.equal(getV1TotalPages({ total: null, limit: 20 }, 20), null);
  assert.equal(getV1TotalPages({ total: 41, limit: 20 }, 20), 3);
});

test("fetchV1CursorPageAt invalidates downstream cursors when a boundary shifts or terminates", async () => {
  const scopeKey = "unit-test-boundary-shift";
  clearV1CursorCache(scopeKey);
  let phase = 1;

  const fetchPage = async (cursor?: string) => {
    if (phase === 1) {
      if (!cursor) {
        return {
          data: [makeOffer("A")],
          meta: { pagination: { limit: 1, hasMore: true, nextCursor: "cur-A", total: 3 } },
        };
      }
      if (cursor === "cur-A") {
        return {
          data: [makeOffer("B")],
          meta: { pagination: { limit: 1, hasMore: true, nextCursor: "cur-B", total: 3 } },
        };
      }
      return {
        data: [makeOffer("C")],
        meta: { pagination: { limit: 1, hasMore: false, nextCursor: null, total: 3 } },
      };
    }

    // Phase 2: dataset shifted so page 1 boundary changes to cur-0
    if (!cursor) {
      return {
        data: [makeOffer("0")],
        meta: { pagination: { limit: 1, hasMore: true, nextCursor: "cur-0", total: 3 } },
      };
    }
    if (cursor === "cur-0") {
      return {
        data: [makeOffer("A")],
        meta: { pagination: { limit: 1, hasMore: false, nextCursor: null, total: 2 } },
      };
    }
    throw new Error(`Unexpected stale cursor: ${cursor}`);
  };

  await fetchV1CursorPageAt(fetchPage, 3, scopeKey);

  // Refresh page 1 with a new boundary; stale cursor cur-B must be discarded.
  phase = 2;
  await fetchV1CursorPageAt(fetchPage, 1, scopeKey);
  const page3AfterShift = await fetchV1CursorPageAt(fetchPage, 3, scopeKey);
  assert.equal(page3AfterShift.resolvedPage, 2);
  assert.equal(page3AfterShift.envelope.data[0]?.id, "A");
  assert.equal(page3AfterShift.hasMore, false);
  clearV1CursorCache(scopeKey);
});

test("fetchV1CursorPageAt rejects non-advancing cursor responses", async () => {
  const scopeKey = "unit-test-stuck-cursor";
  clearV1CursorCache(scopeKey);

  await assert.rejects(
    () =>
      fetchV1CursorPageAt(
        async (cursor) => ({
          data: [makeOffer("1")],
          meta: {
            pagination: {
              limit: 1,
              hasMore: true,
              nextCursor: cursor ?? "c1",
              total: null,
            },
          },
        }),
        2,
        scopeKey,
      ),
    /did not advance/i,
  );

  clearV1CursorCache(scopeKey);
});
