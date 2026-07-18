import assert from "node:assert/strict";
import test from "node:test";
import { historicalLowsQueryKey, historicalLowsSearch } from "../../src/lib/historical-lows.ts";
import { getCurrentHistoricalLowOffers } from "../../src/lib/effective-price.ts";
import type { Price } from "../../src/types/price.ts";
import type { SingleOfferWithPrice } from "../../src/types/single-offer-price.ts";

function offerWithPrice(price: Price): SingleOfferWithPrice {
  return { id: price.offerId, price } as SingleOfferWithPrice;
}

function discountedPrice(id: string, endDate: string): Price {
  return {
    country: "US",
    region: "US",
    namespace: "namespace",
    offerId: id,
    updatedAt: "2026-07-01T00:00:00.000Z",
    price: {
      currencyCode: "USD",
      discount: 500,
      discountPrice: 500,
      originalPrice: 1000,
      basePayoutCurrencyCode: "USD",
      basePayoutPrice: 500,
      payoutCurrencyExchangeRate: 1,
    },
    appliedRules: [
      {
        id: "sale",
        name: "Sale",
        namespace: "namespace",
        promotionStatus: "ACTIVE",
        startDate: "2026-07-01T00:00:00.000Z",
        endDate,
        saleType: "REGULAR",
        regionIds: ["US"],
        discountSetting: {
          discountType: "PERCENTAGE",
          discountValue: null,
          discountPercentage: 50,
        },
        promotionSetting: {
          promotionType: "SIMPLE",
          discountOffers: [{ offerId: id }],
        },
      },
    ],
  };
}

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

test("keeps active historical lows and removes offers whose sale has expired", () => {
  const offers = [
    offerWithPrice(discountedPrice("expired", "2026-07-07T00:00:00.000Z")),
    offerWithPrice(discountedPrice("active", "2026-07-20T00:00:00.000Z")),
  ];

  assert.deepEqual(
    getCurrentHistoricalLowOffers(offers, "2026-07-18T00:00:00.000Z").map(({ id }) => id),
    ["active"],
  );
});
