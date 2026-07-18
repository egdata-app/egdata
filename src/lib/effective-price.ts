import type { AppliedRule, Price } from "@/types/price";
import type { SingleOfferWithPrice } from "@/types/single-offer-price";

export interface EffectivePriceHistoryEntry {
  price: Price;
  inferred: boolean;
}

const toTimestamp = (value: Date | string | number) =>
  value instanceof Date ? value.getTime() : new Date(value).getTime();

const isDiscounted = (price: Price) =>
  price.price.discount > 0 || price.price.discountPrice < price.price.originalPrice;

const getRuleWindow = (rule: AppliedRule) => {
  const start = Date.parse(rule.startDate);
  const end = Date.parse(rule.endDate);

  return Number.isFinite(start) && Number.isFinite(end) && start < end ? { start, end } : null;
};

const isRuleActiveAt = (rule: AppliedRule, timestamp: number) => {
  const window = getRuleWindow(rule);
  return window ? window.start <= timestamp && timestamp < window.end : false;
};

function regularPrice(price: Price): Price {
  const exchangeRate = price.price.payoutCurrencyExchangeRate;
  const inferredBasePayoutPrice = Math.round(price.price.originalPrice * exchangeRate);

  return {
    ...price,
    appliedRules: [],
    price: {
      ...price.price,
      discount: 0,
      discountPrice: price.price.originalPrice,
      basePayoutPrice:
        Number.isFinite(inferredBasePayoutPrice) && exchangeRate > 0
          ? inferredBasePayoutPrice
          : price.price.basePayoutPrice,
    },
  };
}

/**
 * Resolves a price intended to represent the current price. Historical callers
 * should pass the record timestamp instead of the current time.
 */
export function getEffectivePrice(
  price: Price | null | undefined,
  at: Date | string | number = new Date(),
): Price | null | undefined {
  if (
    !price ||
    !isDiscounted(price) ||
    !Array.isArray(price.appliedRules) ||
    price.appliedRules.length === 0
  ) {
    return price;
  }

  const timestamp = toTimestamp(at);
  if (!Number.isFinite(timestamp)) {
    return price;
  }

  const windows = price.appliedRules.map(getRuleWindow);
  if (windows.some((window) => window === null)) {
    return price;
  }

  const activeRules = price.appliedRules.filter((rule) => isRuleActiveAt(rule, timestamp));
  if (activeRules.length > 0) {
    return activeRules.length === price.appliedRules.length
      ? price
      : { ...price, appliedRules: activeRules };
  }

  return regularPrice(price);
}

export function hasEffectiveDiscount(
  price: Price | null | undefined,
  at: Date | string | number = new Date(),
) {
  const effectivePrice = getEffectivePrice(price, at);
  return effectivePrice
    ? effectivePrice.price.discountPrice < effectivePrice.price.originalPrice
    : false;
}

export function getCurrentHistoricalLowOffers(
  offers: SingleOfferWithPrice[],
  at: Date | string | number = new Date(),
) {
  return offers.filter((offer) => hasEffectiveDiscount(offer.price, at));
}

/**
 * Preserves stored history, but adds the missing return-to-regular-price point
 * when the last recorded sale has conclusively ended.
 */
export function getEffectivePriceHistory(
  history: Price[],
  at: Date | string | number = new Date(),
): EffectivePriceHistoryEntry[] {
  const now = toTimestamp(at);
  const sorted = [...history].sort(
    (left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt),
  );
  const entries = sorted.map((price) => ({
    price: getEffectivePrice(price, price.updatedAt) ?? price,
    inferred: false,
  }));
  const latest = sorted.at(-1);

  if (!latest || !Number.isFinite(now) || !isDiscounted(latest)) {
    return entries;
  }

  const observedAt = Date.parse(latest.updatedAt);
  const windows = latest.appliedRules.map((rule) => ({ rule, window: getRuleWindow(rule) }));
  if (
    !Number.isFinite(observedAt) ||
    windows.length === 0 ||
    windows.some(({ window }) => !window)
  ) {
    return entries;
  }

  const activeAtObservation = windows.filter(({ rule }) => isRuleActiveAt(rule, observedAt));
  if (activeAtObservation.length === 0) {
    return entries;
  }

  const transitionAt = Math.max(
    ...activeAtObservation.map(({ window }) => (window as { end: number }).end),
  );
  if (transitionAt > now) {
    return entries;
  }

  const effectiveNow = getEffectivePrice(latest, now);
  if (!effectiveNow || isDiscounted(effectiveNow)) {
    return entries;
  }

  entries.push({
    price: {
      ...effectiveNow,
      updatedAt: new Date(transitionAt).toISOString(),
    },
    inferred: true,
  });

  return entries;
}
