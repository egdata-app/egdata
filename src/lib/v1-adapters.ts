import type { V1Envelope } from "./http-client.ts";
import type { SinglePoll } from "@/types/polls";
import type { SingleOffer } from "@/types/single-offer";

export type V1CursorPaginationMeta = {
  pagination?: {
    hasMore?: boolean;
    nextCursor?: string | null;
  };
};

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

export function normalizeV1OfferElements(data: SingleOffer[] | null | undefined): {
  elements: SingleOffer[];
} {
  return {
    elements: Array.isArray(data) ? data : [],
  };
}
