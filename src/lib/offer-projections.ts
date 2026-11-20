import type { AppliedRule, Price } from "@/types/price";
import type { KeyImage, Tag } from "@/types/single-offer";

/**
 * Projection helpers for React Query payloads that are serialized into the SSR
 * hydration state.
 *
 * API documents carry far more than most pages render (long descriptions, every
 * key image variant, promotion metadata, …). Query factories use these helpers
 * to cache only the fields their page actually reads, mirroring `getImage()`
 * and `getEffectivePrice()` so the rendered output is unchanged.
 */

/**
 * Picks the first matching image for every preference list, deduplicated.
 *
 * This mirrors `getImage()`: the first list wins, and the first type in that
 * list that exists on the offer is kept. Because `getImage()` only ever returns
 * one image per call, callers that render several variants (e.g. a card plus a
 * hover image) pass one preference list per variant.
 */
export function pickKeyImages(
  keyImages: KeyImage[] | null | undefined,
  preferenceLists: string[][],
): KeyImage[] {
  const picked: KeyImage[] = [];
  const pickedTypes = new Set<string>();

  for (const types of preferenceLists) {
    for (const type of types) {
      if (pickedTypes.has(type)) break;

      const match = (keyImages ?? []).find((image) => image?.type === type);
      if (match) {
        picked.push({ type: match.type, url: match.url, md5: match.md5 });
        pickedTypes.add(match.type);
        break;
      }
    }
  }

  return picked;
}

/**
 * `getEffectivePrice` only reads `startDate`/`endDate` from applied rules, so
 * the remaining promotion metadata can be dropped before caching.
 */
export function slimPrice(price: Price | null | undefined): Price | null {
  if (!price) return null;

  const appliedRules: AppliedRule[] = Array.isArray(price.appliedRules)
    ? price.appliedRules
        .filter((rule) => Boolean(rule?.startDate && rule?.endDate))
        .map((rule) => ({ startDate: rule.startDate, endDate: rule.endDate }) as AppliedRule)
    : [];

  return { ...price, appliedRules };
}

/**
 * Keeps only the identity and label of each tag. Tags are rendered as genre
 * names and platform icons, so ids and names are all a card needs.
 */
export function slimTags(tags: Array<Partial<Tag> | null | undefined> | null | undefined): Tag[] {
  if (!Array.isArray(tags)) return [];

  return tags.flatMap((tag) =>
    typeof tag?.id === "string" && typeof tag?.name === "string"
      ? [{ id: tag.id, name: tag.name }]
      : [],
  );
}

/** Collapses `null`/`undefined` list responses into an array. */
export function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
