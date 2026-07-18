import assert from "node:assert/strict";
import test from "node:test";
import {
  getEffectivePrice,
  getEffectivePriceHistory,
  hasEffectiveDiscount,
} from "../../src/lib/effective-price.ts";
import type { AppliedRule, Price } from "../../src/types/price.ts";

function rule(startDate: string, endDate: string): AppliedRule {
  return {
    id: `${startDate}-${endDate}`,
    name: "Promotion",
    namespace: "namespace",
    promotionStatus: "ACTIVE",
    startDate,
    endDate,
    saleType: "REGULAR",
    regionIds: ["US"],
    discountSetting: {
      discountType: "PERCENTAGE",
      discountValue: null,
      discountPercentage: 60,
    },
    promotionSetting: {
      promotionType: "SIMPLE",
      discountOffers: [{ offerId: "offer" }],
    },
  };
}

function price({
  updatedAt = "2026-06-30T15:18:55.000Z",
  appliedRules = [rule("2026-06-30T15:00:00.000Z", "2026-07-07T15:00:00.000Z")],
  discount = 320,
  discountPrice = 479,
  originalPrice = 799,
  exchangeRate = 1,
  basePayoutPrice = 479,
}: Partial<{
  updatedAt: string;
  appliedRules: AppliedRule[];
  discount: number;
  discountPrice: number;
  originalPrice: number;
  exchangeRate: number;
  basePayoutPrice: number;
}> = {}): Price {
  return {
    country: "US",
    region: "US",
    namespace: "namespace",
    offerId: "offer",
    updatedAt,
    appliedRules,
    price: {
      currencyCode: "USD",
      discount,
      discountPrice,
      originalPrice,
      basePayoutCurrencyCode: "USD",
      basePayoutPrice,
      payoutCurrencyExchangeRate: exchangeRate,
    },
  };
}

test("keeps a discount during an active promotion window", () => {
  const source = price();
  assert.equal(getEffectivePrice(source, "2026-07-01T00:00:00.000Z"), source);
  assert.equal(hasEffectiveDiscount(source, "2026-07-01T00:00:00.000Z"), true);
});

test("uses the regular price when every promotion has ended without mutating the source", () => {
  const source = price({ exchangeRate: 0.5, basePayoutPrice: 240 });
  const effective = getEffectivePrice(source, "2026-07-18T00:00:00.000Z");

  assert.notEqual(effective, source);
  assert.equal(effective?.price.discount, 0);
  assert.equal(effective?.price.discountPrice, 799);
  assert.equal(effective?.price.basePayoutPrice, 400);
  assert.deepEqual(effective?.appliedRules, []);
  assert.equal(source.price.discountPrice, 479);
  assert.equal(source.appliedRules.length, 1);
});

test("treats the exact promotion end as expired", () => {
  const source = price();
  assert.equal(hasEffectiveDiscount(source, "2026-07-07T14:59:59.999Z"), true);
  assert.equal(hasEffectiveDiscount(source, "2026-07-07T15:00:00.000Z"), false);
});

test("uses the regular price before a future promotion starts", () => {
  const source = price({
    appliedRules: [rule("2026-07-20T15:00:00.000Z", "2026-07-27T15:00:00.000Z")],
  });
  assert.equal(hasEffectiveDiscount(source, "2026-07-18T00:00:00.000Z"), false);
});

test("keeps an overlapping discount while any promotion remains active", () => {
  const source = price({
    appliedRules: [
      rule("2026-06-30T15:00:00.000Z", "2026-07-07T15:00:00.000Z"),
      rule("2026-07-05T15:00:00.000Z", "2026-07-20T15:00:00.000Z"),
    ],
  });
  const effective = getEffectivePrice(source, "2026-07-18T00:00:00.000Z");
  assert.equal(hasEffectiveDiscount(source, "2026-07-18T00:00:00.000Z"), true);
  assert.equal(effective?.appliedRules.length, 1);
  assert.equal(effective?.appliedRules[0].endDate, "2026-07-20T15:00:00.000Z");
});

test("trusts discounted API records with absent or malformed promotion windows", () => {
  const noRules = price({ appliedRules: [] });
  const invalidRule = price({ appliedRules: [rule("invalid", "2026-07-07T15:00:00.000Z")] });

  assert.equal(getEffectivePrice(noRules, "2026-07-18T00:00:00.000Z"), noRules);
  assert.equal(getEffectivePrice(invalidRule, "2026-07-18T00:00:00.000Z"), invalidRule);
});

test("preserves historical sale points and infers the return to regular price", () => {
  const regular = price({
    updatedAt: "2026-05-29T16:53:12.000Z",
    appliedRules: [],
    discount: 0,
    discountPrice: 799,
    basePayoutPrice: 799,
  });
  const sale = price();
  const history = getEffectivePriceHistory([sale, regular], "2026-07-18T00:00:00.000Z");

  assert.deepEqual(
    history.map(({ price: entry, inferred }) => ({
      updatedAt: entry.updatedAt,
      discountPrice: entry.price.discountPrice,
      inferred,
    })),
    [
      {
        updatedAt: "2026-05-29T16:53:12.000Z",
        discountPrice: 799,
        inferred: false,
      },
      {
        updatedAt: "2026-06-30T15:18:55.000Z",
        discountPrice: 479,
        inferred: false,
      },
      {
        updatedAt: "2026-07-07T15:00:00.000Z",
        discountPrice: 799,
        inferred: true,
      },
    ],
  );
});

test("does not infer a history point while the latest sale is active", () => {
  const history = getEffectivePriceHistory([price()], "2026-07-01T00:00:00.000Z");
  assert.equal(history.length, 1);
  assert.equal(history[0].inferred, false);
});

test("uses the last end time for overlapping promotion rules", () => {
  const sale = price({
    appliedRules: [
      rule("2026-06-30T15:00:00.000Z", "2026-07-05T15:00:00.000Z"),
      rule("2026-06-30T15:00:00.000Z", "2026-07-07T15:00:00.000Z"),
    ],
  });
  const history = getEffectivePriceHistory([sale], "2026-07-18T00:00:00.000Z");
  assert.equal(history.at(-1)?.price.updatedAt, "2026-07-07T15:00:00.000Z");
});
