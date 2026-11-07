/**
 * Shared error and envelope types for the on-demand proof-of-work recovery.
 *
 * Nothing in this module may log or persist a challenge, nonce, proof or
 * session token. Values are opaque and only ever live in memory.
 */

export const SESSION_CHALLENGE_REQUIRED = "SESSION_CHALLENGE_REQUIRED";

/** A high-risk response is terminal for this attempt; it never starts PoW. */
export class AbuseTarpitError extends Error {
  readonly name = "AbuseTarpitError";
  readonly code = "ABUSE_TARPIT";
  readonly status = 204;
  readonly recoverable = true;

  constructor() {
    super("Requests are temporarily limited. Please wait a little and try again.");
  }
}

export function isAbuseTarpitError(value: unknown): value is AbuseTarpitError {
  if (value instanceof AbuseTarpitError) return true;
  if (!value || typeof value !== "object") return false;
  const candidate = value as { name?: unknown; code?: unknown };
  return candidate.name === "AbuseTarpitError" && candidate.code === "ABUSE_TARPIT";
}

export type ProofOfWorkRecoveryReason =
  | "ssr-unsupported"
  | "not-replayable"
  | "challenged-again"
  | "challenge-fetch-failed"
  | "challenge-response-invalid"
  | "challenge-expired"
  | "difficulty-invalid"
  | "solve-timeout"
  | "solve-failed"
  | "solution-rejected"
  | "replacement-exhausted"
  | "service-unavailable"
  | "rate-limited"
  | "timeout"
  | "recovery-failed";

export type ProofOfWorkRecoveryErrorOptions = {
  cause?: unknown;
  status?: number;
  retryAfterMs?: number;
};

/**
 * Typed, bounded failure raised instead of returning a challenge envelope to
 * REST/GraphQL callers. It deliberately contains no challenge or token data.
 */
export class ProofOfWorkRecoveryError extends Error {
  readonly code = SESSION_CHALLENGE_REQUIRED;
  readonly name = "ProofOfWorkRecoveryError";
  readonly recoverable = true;
  readonly reason: ProofOfWorkRecoveryReason;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(
    reason: ProofOfWorkRecoveryReason,
    message = "We couldn't complete the security check for this request.",
    options: ProofOfWorkRecoveryErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.reason = reason;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
  }
}

export function isProofOfWorkRecoveryError(value: unknown): value is ProofOfWorkRecoveryError {
  if (value instanceof ProofOfWorkRecoveryError) {
    return true;
  }

  // SSR/hydration serializers may flatten the Error instance. Keep the typed
  // behavior for the two stable, non-sensitive markers.
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { name?: unknown; code?: unknown };

  return (
    candidate.name === "ProofOfWorkRecoveryError" && candidate.code === SESSION_CHALLENGE_REQUIRED
  );
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Detects the exact HTTP-200 challenge envelope. It intentionally does not
 * accept lookalikes (for example a high-risk mitigation response with an empty
 * `elements` array) or GraphQL errors that happen to mention a challenge.
 */
export function isSessionChallengeEnvelope(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const error = value.error;

  return isRecord(error) && error.code === SESSION_CHALLENGE_REQUIRED;
}

/** The envelope's URL is informational only; it is never followed. */
export function getChallengeEnvelopeUrl(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.error)) {
    return undefined;
  }

  return typeof value.error.challengeUrl === "string" ? value.error.challengeUrl : undefined;
}

export function createAbortError(): Error {
  if (typeof DOMException === "function") {
    return new DOMException("The operation was aborted.", "AbortError");
  }

  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

export function isAbortLikeError(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { name?: unknown; code?: unknown };

  return candidate.name === "AbortError" || candidate.code === "ERR_CANCELED";
}
