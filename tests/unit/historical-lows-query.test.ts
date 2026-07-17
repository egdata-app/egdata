import assert from "node:assert/strict";
import test from "node:test";
import { historicalLowsQueryKey, historicalLowsSearch } from "../../src/lib/historical-lows.ts";

test("requests positive-priced historical lows ordered by the selected region's price update", () => {
  assert.deepEqual(historicalLowsSearch, {
    isLowestPriceEver: true,
    price: { min: 1 },
    sortBy: "priceUpdatedAt",
    sortDir: "desc",
    page: 1,
    limit: 25,
  });
  assert.equal("offerType" in historicalLowsSearch, false);
});

test("keys historical-low results by the visitor pricing country", () => {
  assert.deepEqual(historicalLowsQueryKey("ES"), ["historical-lows", { country: "ES" }]);
});
