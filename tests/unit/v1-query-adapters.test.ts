import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchAllV1CursorPages,
  normalizeV1OfferElements,
  unwrapV1Poll,
} from "../../src/lib/v1-adapters.ts";
import type { SinglePoll } from "../../src/types/polls.ts";
import type { SingleOffer } from "../../src/types/single-offer.ts";

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
