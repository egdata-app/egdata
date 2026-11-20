import { httpClient, type V1Envelope } from "./http-client.ts";
import type { SinglePoll } from "@/types/polls";
import type { Aggregations, PriceStats, SearchV2Response } from "@/types/search-v2";
import type { SingleOffer } from "@/types/single-offer";
import type { SingleOfferWithPrice } from "@/types/single-offer-price";

export type V1PaginationMeta = {
  limit?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
  total?: number | null;
};

export type V1CursorPaginationMeta = {
  pagination?: V1PaginationMeta;
};

export type V1SearchFacetsMeta = {
  facets?: {
    priceStats?: PriceStats;
    price_stats?: PriceStats;
    [key: string]: unknown;
  };
  result?: {
    tookMs?: number;
    timedOut?: boolean;
  };
};

/**
 * Meta returned by `GET /v1/search/facets`, which answers with the aggregation
 * body as `data` instead of an envelope wrapping search results.
 */
export type V1SearchFacetSectionsMeta = {
  sections?: string[];
  result?: {
    tookMs?: number;
    timedOut?: boolean;
  };
};

export type V1SearchMeta = V1CursorPaginationMeta & V1SearchFacetsMeta;

export type SearchFacetSection =
  | "offerType"
  | "tags"
  | "technologies"
  | "developer"
  | "publisher"
  | "seller"
  | "price";

const EMPTY_PRICE_STATS: PriceStats = { count: 0, min: 0, max: 0, avg: 0, sum: 0 };
const EMPTY_TECHNOLOGY_AGGREGATION: Aggregations["technologies"] = {
  doc_count_error_upper_bound: 0,
  sum_other_doc_count: 0,
  buckets: [],
};

const CURSOR_STORAGE_PREFIX = "egdata:v1-cursors:";
const memoryCursorCache = new Map<string, Array<string | undefined>>();

function readCursorCache(scopeKey: string): Array<string | undefined> {
  const inMemory = memoryCursorCache.get(scopeKey);
  if (inMemory) {
    return [...inMemory];
  }

  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(`${CURSOR_STORAGE_PREFIX}${scopeKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<string | null>;
        if (Array.isArray(parsed)) {
          const restored = parsed.map((entry) => (typeof entry === "string" ? entry : undefined));
          memoryCursorCache.set(scopeKey, restored);
          return [...restored];
        }
      }
    } catch {
      // Ignore storage errors (SSR, quota, private mode).
    }
  }

  return [undefined];
}

function writeCursorCache(scopeKey: string, cursors: Array<string | undefined>): void {
  const normalized = [undefined, ...cursors.slice(1)];
  memoryCursorCache.set(scopeKey, normalized);

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        `${CURSOR_STORAGE_PREFIX}${scopeKey}`,
        JSON.stringify(normalized.map((entry) => entry ?? null)),
      );
    } catch {
      // Ignore storage errors.
    }
  }
}

export function clearV1CursorCache(scopeKey?: string): void {
  if (!scopeKey) {
    memoryCursorCache.clear();
    return;
  }
  memoryCursorCache.delete(scopeKey);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(`${CURSOR_STORAGE_PREFIX}${scopeKey}`);
    } catch {
      // Ignore storage errors.
    }
  }
}

export function getV1PaginationTotal(
  pagination: V1PaginationMeta | undefined,
  fallback = 0,
): number {
  return typeof pagination?.total === "number" && Number.isFinite(pagination.total)
    ? pagination.total
    : fallback;
}

export function getV1TotalPages(
  pagination: V1PaginationMeta | undefined,
  fallbackLimit: number,
): number | null {
  if (typeof pagination?.total !== "number" || !Number.isFinite(pagination.total)) {
    return null;
  }
  const limit =
    typeof pagination.limit === "number" && pagination.limit > 0 ? pagination.limit : fallbackLimit;
  return Math.max(1, Math.ceil(pagination.total / limit));
}

function syncCursorBoundary(
  cursors: Array<string | undefined>,
  pageNumber: number,
  cursorUsed: string | undefined,
  hasMore: boolean,
  nextCursor: string | null,
  scopeKey: string,
): void {
  if (hasMore && (!nextCursor || (cursorUsed !== undefined && nextCursor === cursorUsed))) {
    throw new Error("Pagination cursor did not advance while more results remain.");
  }

  if (!hasMore) {
    if (cursors.length > pageNumber) {
      cursors.length = pageNumber;
      writeCursorCache(scopeKey, cursors);
    }
    return;
  }

  if (nextCursor && cursors[pageNumber] !== nextCursor) {
    // Discard stale downstream boundaries whenever an earlier page boundary shifts.
    cursors.length = pageNumber + 1;
    cursors[pageNumber] = nextCursor;
    writeCursorCache(scopeKey, cursors);
  }
}

/**
 * Fetches page `targetPage` (1-based) of a v1 cursor-paginated endpoint.
 * Reuses cached cursors for previously visited pages (across Next/Previous and reloads),
 * and walks forward from the deepest known cursor when jumping ahead on a cold load.
 */
export async function fetchV1CursorPageAt<T, M extends V1CursorPaginationMeta>(
  fetchPage: (cursor?: string) => Promise<V1Envelope<T, M>>,
  targetPage: number,
  scopeKey: string,
): Promise<{
  envelope: V1Envelope<T, M>;
  resolvedPage: number;
  hasMore: boolean;
  nextCursor: string | null;
  total: number | null;
}> {
  const normalizedTarget = Math.max(1, Math.floor(targetPage));
  const cursors = readCursorCache(scopeKey);

  // If we already know the cursor for the requested page (or it's page 1), fetch directly.
  if (normalizedTarget === 1 || typeof cursors[normalizedTarget - 1] === "string") {
    const cursor = normalizedTarget === 1 ? undefined : cursors[normalizedTarget - 1];
    const envelope = await fetchPage(cursor);
    const pagination = envelope?.meta?.pagination;
    const hasMore = Boolean(pagination?.hasMore);
    const nextCursor = pagination?.nextCursor ?? null;

    syncCursorBoundary(cursors, normalizedTarget, cursor, hasMore, nextCursor, scopeKey);

    return {
      envelope,
      resolvedPage: normalizedTarget,
      hasMore,
      nextCursor,
      total: typeof pagination?.total === "number" ? pagination.total : null,
    };
  }

  // Otherwise, walk forward from the deepest known page until we reach `normalizedTarget` or run out.
  let currentPage = 1;
  for (let idx = Math.min(cursors.length - 1, normalizedTarget - 1); idx >= 1; idx -= 1) {
    if (typeof cursors[idx] === "string") {
      currentPage = idx + 1;
      break;
    }
  }

  let latestEnvelope: V1Envelope<T, M> | undefined;
  while (currentPage <= normalizedTarget) {
    const cursor = currentPage === 1 ? undefined : cursors[currentPage - 1];
    const envelope = await fetchPage(cursor);
    latestEnvelope = envelope;
    const pagination = envelope?.meta?.pagination;
    const hasMore = Boolean(pagination?.hasMore);
    const nextCursor = pagination?.nextCursor ?? null;

    syncCursorBoundary(cursors, currentPage, cursor, hasMore, nextCursor, scopeKey);

    if (currentPage === normalizedTarget || !hasMore || !nextCursor) {
      return {
        envelope,
        resolvedPage: currentPage,
        hasMore,
        nextCursor,
        total: typeof pagination?.total === "number" ? pagination.total : null,
      };
    }

    currentPage += 1;
  }

  // Unreachable because loop always runs at least once for normalizedTarget >= 1.
  const pagination = latestEnvelope?.meta?.pagination;
  return {
    envelope: latestEnvelope as V1Envelope<T, M>,
    resolvedPage: currentPage,
    hasMore: Boolean(pagination?.hasMore),
    nextCursor: pagination?.nextCursor ?? null,
    total: typeof pagination?.total === "number" ? pagination.total : null,
  };
}

export type V1SearchQueryInput = {
  title?: string;
  offerType?: string;
  tags?: string[];
  categories?: string[];
  customAttributes?: string[];
  technologies?: string[];
  seller?: string;
  developerDisplayName?: string;
  publisherDisplayName?: string;
  refundType?: string;
  isCodeRedemptionOnly?: boolean;
  excludeBlockchain?: boolean;
  onSale?: boolean;
  pastGiveaways?: boolean;
  isLowestPrice?: boolean;
  isLowestPriceEver?: boolean;
  price?: {
    min?: number;
    max?: number;
  };
  sortBy?: string;
  sortDir?: "asc" | "desc";
  facets?: "full" | "minimal" | "none";
  fields?: "full" | "card";
  limit?: number;
  country?: string;
  locale?: string;
  cursor?: string;
};

/**
 * Converts search filter state into flat query params accepted by `GET /v1/search`.
 */
export function toV1SearchParams(
  query: V1SearchQueryInput,
  overrides?: {
    country?: string;
    cursor?: string;
    facets?: "full" | "minimal" | "none";
    fields?: "full" | "card";
  },
): Record<string, string | number | boolean | undefined> {
  const csv = (values?: string[]) => (values && values.length > 0 ? values.join(",") : undefined);
  const country = overrides?.country ?? query.country;
  const cursor = overrides?.cursor ?? query.cursor;
  const facets = overrides?.facets ?? query.facets;
  const fields = overrides?.fields ?? query.fields;

  return {
    title: query.title?.trim() || undefined,
    offerType: query.offerType || undefined,
    tags: csv(query.tags),
    categories: csv(query.categories),
    customAttributes: csv(query.customAttributes),
    technologies: csv(query.technologies),
    seller: query.seller || undefined,
    developerDisplayName: query.developerDisplayName || undefined,
    publisherDisplayName: query.publisherDisplayName || undefined,
    refundType: query.refundType || undefined,
    isCodeRedemptionOnly: query.isCodeRedemptionOnly ? true : undefined,
    excludeBlockchain: query.excludeBlockchain ? true : undefined,
    onSale: query.onSale !== undefined ? query.onSale : undefined,
    pastGiveaways: query.pastGiveaways ? true : undefined,
    isLowestPrice: query.isLowestPrice ? true : undefined,
    isLowestPriceEver: query.isLowestPriceEver ? true : undefined,
    priceMin: query.price?.min,
    priceMax: query.price?.max,
    sortBy: query.sortBy || undefined,
    sortDir: query.sortDir || undefined,
    facets,
    fields,
    country,
    locale: query.locale || undefined,
    limit: query.limit,
    cursor,
  };
}

export type NormalizedV1SearchResponse = SearchV2Response & {
  hasMore: boolean;
  nextCursor: string | null;
  totalPages: number | null;
};

/**
 * Converts search filter state into flat query params accepted by `GET /v1/search/facets`.
 * The facets endpoint rejects pagination params, so they are dropped.
 */
export function toV1SearchFacetParams(
  query: V1SearchQueryInput,
  overrides: { country?: string; sections: SearchFacetSection[] },
): Record<string, string | number | boolean | undefined> {
  const params = toV1SearchParams(query, { country: overrides.country });
  delete params.limit;
  delete params.cursor;
  delete params.fields;
  params.facets = overrides.sections.join(",");
  return params;
}

export type NormalizedV1SearchFacets = {
  aggregations: Aggregations;
  sections: SearchFacetSection[];
  result: { tookMs: number; timedOut: boolean };
};

export function normalizeV1SearchFacetsResponse(
  envelope: V1Envelope<Record<string, unknown>, V1SearchFacetSectionsMeta> | null | undefined,
  sections: SearchFacetSection[],
): NormalizedV1SearchFacets {
  const raw =
    envelope?.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)
      ? envelope.data
      : {};
  const priceStats = (raw.priceStats ?? raw.price_stats) as PriceStats | undefined;
  const aggregations: Aggregations = {
    ...(raw as Record<string, Aggregations[string]>),
    price_stats:
      priceStats && typeof priceStats.min === "number" && typeof priceStats.max === "number"
        ? priceStats
        : EMPTY_PRICE_STATS,
    technologies:
      (raw.technologies as Aggregations["technologies"] | undefined) ??
      EMPTY_TECHNOLOGY_AGGREGATION,
  };
  return {
    aggregations,
    sections,
    result: {
      tookMs: envelope?.meta?.result?.tookMs ?? 0,
      timedOut: Boolean(envelope?.meta?.result?.timedOut),
    },
  };
}

export function normalizeV1SearchResponse(
  envelope: V1Envelope<SingleOfferWithPrice[], V1SearchMeta> | null | undefined,
  page: number,
  fallbackLimit: number,
): NormalizedV1SearchResponse {
  const offers = Array.isArray(envelope?.data) ? envelope.data : [];
  const pagination = envelope?.meta?.pagination;
  const rawFacets = envelope?.meta?.facets ?? {};
  const priceStats = rawFacets.priceStats ??
    rawFacets.price_stats ?? { count: 0, min: 0, max: 0, avg: 0, sum: 0 };
  const aggregations: Aggregations = {
    ...(rawFacets as Record<string, Aggregations[string]>),
    price_stats: priceStats,
    technologies: (rawFacets.technologies as Aggregations["technologies"]) ?? {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
  };
  const limit =
    typeof pagination?.limit === "number" && pagination.limit > 0
      ? pagination.limit
      : fallbackLimit;
  const total = getV1PaginationTotal(pagination, offers.length);

  return {
    total,
    offers,
    page,
    limit,
    aggregations,
    meta: {
      ms: envelope?.meta?.result?.tookMs ?? 0,
      timed_out: Boolean(envelope?.meta?.result?.timedOut),
      cached: false,
    },
    hasMore: Boolean(pagination?.hasMore),
    nextCursor: pagination?.nextCursor ?? null,
    totalPages: getV1TotalPages(pagination, limit),
  };
}

/**
 * Collects every page of a v1 cursor-paginated endpoint into a flat array.
 * Stops cleanly when `hasMore` is false, `nextCursor` is missing, or the cursor repeats.
 */
export async function fetchAllV1CursorPages<T>(
  fetchPage: (cursor?: string) => Promise<V1Envelope<T[], V1CursorPaginationMeta> | T[]>,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;

  while (true) {
    const envelope = await fetchPage(cursor);

    if (Array.isArray(envelope)) {
      items.push(...envelope);
      break;
    }

    if (Array.isArray(envelope?.data)) {
      items.push(...envelope.data);
    }

    const nextCursor = envelope?.meta?.pagination?.nextCursor;
    if (!envelope?.meta?.pagination?.hasMore || !nextCursor || nextCursor === cursor) {
      break;
    }

    cursor = nextCursor;
  }

  return items;
}

/**
 * Unwraps `/v1/offers/{id}/polls`, which returns `{ poll }` instead of a bare `SinglePoll`.
 */
export function unwrapV1Poll(
  response: SinglePoll | { poll: SinglePoll | null } | null | undefined,
): SinglePoll | null {
  if (!response) {
    return null;
  }

  if (typeof response === "object" && "poll" in response) {
    return response.poll ?? null;
  }

  return response;
}

export type V1SandboxPaginatedResult<T> = {
  elements: T[];
  page: number;
  limit: number;
  count: number;
  hasMore: boolean;
  total: number | null;
};

export async function fetchV1SandboxSectionPage<T>(
  id: string,
  section: "assets" | "builds" | "items",
  pageNumber: number,
  limit: number,
  filters: Array<{ id: string; value: unknown }>,
): Promise<V1SandboxPaginatedResult<T>> {
  const filterParams: Record<string, string> = {};
  for (const filter of filters) {
    if (Array.isArray(filter.value)) {
      if (filter.value.length > 0) filterParams[filter.id] = filter.value.join(",");
    } else if (filter.value !== undefined && filter.value !== null && filter.value !== "") {
      filterParams[filter.id] = String(filter.value);
    }
  }
  const { envelope, resolvedPage, hasMore, total } = await fetchV1CursorPageAt<
    T[],
    V1CursorPaginationMeta
  >(
    (cursor) =>
      httpClient.v1GetEnvelope<T[], V1CursorPaginationMeta>(`/sandboxes/${id}/${section}`, {
        params: { cursor, limit, ...filterParams },
      }),
    pageNumber,
    `sandbox-${section}:${id}:${limit}:${JSON.stringify(filterParams)}`,
  );
  const elements = Array.isArray(envelope?.data) ? envelope.data : [];
  return {
    elements,
    page: resolvedPage,
    limit: envelope?.meta?.pagination?.limit ?? limit,
    count: total ?? elements.length,
    hasMore,
    total,
  };
}

export function normalizeV1OfferElements(data: SingleOffer[] | null | undefined): {
  elements: SingleOffer[];
} {
  return {
    elements: Array.isArray(data) ? data : [],
  };
}
