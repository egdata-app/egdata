import assert from "node:assert/strict";
import test from "node:test";
import { pickKeyImages, slimPrice, slimTags, toArray } from "../../src/lib/offer-projections.ts";
import { mergeFreebies } from "../../src/utils/merge-freebies.ts";
import type { AppliedRule, Price } from "../../src/types/price.ts";

function rule(overrides: Partial<AppliedRule> = {}): AppliedRule {
  return {
    id: "rule-1",
    name: "Promotion",
    namespace: "namespace",
    promotionStatus: "ACTIVE",
    startDate: "2026-06-30T15:00:00.000Z",
    endDate: "2026-07-07T15:00:00.000Z",
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
    ...overrides,
  };
}

function price(overrides: Partial<Price> = {}): Price {
  return {
    country: "US",
    region: "US",
    namespace: "namespace",
    offerId: "offer",
    updatedAt: "2026-06-30T15:00:00.000Z",
    appliedRules: [rule()],
    price: {
      currencyCode: "USD",
      discount: 320,
      discountPrice: 479,
      originalPrice: 799,
      basePayoutCurrencyCode: "USD",
      basePayoutPrice: 479,
      payoutCurrencyExchangeRate: 1,
    },
    ...overrides,
  };
}

test("pickKeyImages keeps the first match per preference list and dedupes types", () => {
  const images = [
    { type: "Thumbnail", url: "thumb", md5: "1" },
    { type: "OfferImageWide", url: "wide", md5: "2" },
    { type: "OfferImageTall", url: "tall", md5: "3" },
  ];

  const picked = pickKeyImages(images, [
    ["DieselGameBoxTall", "OfferImageTall"],
    ["DieselGameBoxWide", "OfferImageWide"],
    ["OfferImageWide"],
  ]);

  assert.deepEqual(picked, [
    { type: "OfferImageTall", url: "tall", md5: "3" },
    { type: "OfferImageWide", url: "wide", md5: "2" },
  ]);
});

test("pickKeyImages tolerates missing images and null lists", () => {
  assert.deepEqual(pickKeyImages(null, [["OfferImageWide"]]), []);
  assert.deepEqual(pickKeyImages([{ type: "Thumbnail", url: "t", md5: "m" }], [["Sale"]]), []);
});

test("slimPrice keeps the price block and only rule windows", () => {
  const slimmed = slimPrice(price());

  assert.ok(slimmed);
  assert.equal(slimmed.price.discountPrice, 479);
  assert.equal(slimmed.price.payoutCurrencyExchangeRate, 1);
  assert.equal(slimmed.appliedRules.length, 1);
  assert.deepEqual(Object.keys(slimmed.appliedRules[0]).sort(), ["endDate", "startDate"]);
});

test("slimPrice drops rules without a usable window", () => {
  const slimmed = slimPrice(
    price({
      appliedRules: [rule(), rule({ id: "rule-2", startDate: "", endDate: "" })],
    }),
  );

  assert.equal(slimmed?.appliedRules.length, 1);
  assert.equal(slimmed?.appliedRules[0].startDate, "2026-06-30T15:00:00.000Z");
});

test("slimPrice returns null for missing prices", () => {
  assert.equal(slimPrice(null), null);
  assert.equal(slimPrice(undefined), null);
});

test("slimTags keeps valid id/name pairs only", () => {
  assert.deepEqual(
    slimTags([{ id: "9547", name: "Windows" }, { id: "no-name" }, null, { name: "no-id" }]),
    [{ id: "9547", name: "Windows" }],
  );
  assert.deepEqual(slimTags(null), []);
});

test("toArray normalizes nullish list responses", () => {
  assert.deepEqual(toArray([1, 2]), [1, 2]);
  assert.deepEqual(toArray(null), []);
  assert.deepEqual(toArray(undefined), []);
});

test("mergeFreebies groups repeats and aggregates platforms", () => {
  const merged = mergeFreebies([
    {
      id: "offer-a",
      namespace: "ns",
      title: "Game",
      items: [{ releaseInfo: [{ platform: ["Windows"] }] }],
    },
    {
      id: "offer-a-mac",
      namespace: "ns",
      title: "Game",
      items: [{ releaseInfo: [{ platform: ["Mac", null] }] }],
    },
    {
      id: "offer-b",
      namespace: "ns",
      title: "Other",
      items: [{ releaseInfo: [{ platform: ["Android"] }] }],
    },
  ]);

  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.map((entry) => entry.title),
    ["Game", "Other"],
  );
  assert.deepEqual(merged[0].platforms, ["Windows", "Mac"]);
  assert.deepEqual(
    merged[0].offers.map((offer) => offer.id),
    ["offer-a", "offer-a-mac"],
  );
});
