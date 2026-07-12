import assert from "node:assert/strict";
import test from "node:test";
import { getBuyLink, getRedeemableOffers } from "../../src/lib/build-buy-link.ts";
import type { GiveawayOffer } from "../../src/types/giveaways.ts";

function createGiveaway({
  id,
  namespace,
  startDate,
  endDate,
}: {
  id: string;
  namespace: string;
  startDate: string;
  endDate: string;
}): GiveawayOffer {
  return {
    id,
    namespace,
    giveaway: {
      _id: id,
      id,
      namespace,
      startDate,
      endDate,
      historical: [],
    },
  } as GiveawayOffer;
}

test("builds an Epic purchase URL for one offer", () => {
  const url = new URL(
    getBuyLink({
      offers: [{ id: "offer-one", namespace: "namespace-one" }],
      locale: "es-ES",
    }),
  );

  assert.equal(url.origin, "https://store.epicgames.com");
  assert.equal(url.pathname, "/purchase");
  assert.equal(url.searchParams.get("showNavigation"), "true");
  assert.equal(url.searchParams.get("highlightColor"), "0078f2");
  assert.equal(url.searchParams.get("lang"), "es-ES");
  assert.deepEqual(url.searchParams.getAll("offers"), ["1-namespace-one-offer-one--"]);
});

test("adds one purchase parameter for each offer", () => {
  const url = new URL(
    getBuyLink({
      offers: [
        { id: "offer-one", namespace: "namespace-one" },
        { id: "offer-two", namespace: "namespace-two" },
      ],
      locale: "en-US",
    }),
  );

  assert.deepEqual(url.searchParams.getAll("offers"), [
    "1-namespace-one-offer-one--",
    "1-namespace-two-offer-two--",
  ]);
});

test("selects active PC offers and excludes upcoming, expired, and mobile offers", () => {
  const now = new Date("2026-07-12T12:00:00.000Z");
  const activePc = createGiveaway({
    id: "active-pc",
    namespace: "pc",
    startDate: "2026-07-12T12:00:00.000Z",
    endDate: "2026-07-13T12:00:00.000Z",
  });
  const upcomingPc = createGiveaway({
    id: "upcoming-pc",
    namespace: "pc",
    startDate: "2026-07-12T12:00:00.001Z",
    endDate: "2026-07-13T12:00:00.000Z",
  });
  const expiredPc = createGiveaway({
    id: "expired-pc",
    namespace: "pc",
    startDate: "2026-07-11T12:00:00.000Z",
    endDate: "2026-07-12T12:00:00.000Z",
  });
  const activeMobile = createGiveaway({
    id: "active-mobile",
    namespace: "mobile",
    startDate: "2026-07-11T12:00:00.000Z",
    endDate: "2026-07-13T12:00:00.000Z",
  });

  const selected = getRedeemableOffers({
    giveaways: [{ ...activePc, offers: [activePc, upcomingPc] }, expiredPc, activeMobile],
    mobileOffers: [activeMobile],
    now,
  });

  assert.deepEqual(
    selected.map((offer) => offer.id),
    ["active-pc"],
  );
});
