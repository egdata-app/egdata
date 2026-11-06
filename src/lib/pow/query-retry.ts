import { isProofOfWorkRecoveryError } from "./errors.ts";

export const DEFAULT_QUERY_RETRY_COUNT = 3;

/**
 * Outer query retries must never restart a PoW cycle. The typed recovery error
 * is terminal for the request that produced it; the UI offers one explicit
 * manual retry instead.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isProofOfWorkRecoveryError(error)) {
    return false;
  }

  return failureCount < DEFAULT_QUERY_RETRY_COUNT;
}

export function shouldRetryQueryWithLimit(limit: number) {
  return (failureCount: number, error: unknown): boolean => {
    if (isProofOfWorkRecoveryError(error)) {
      return false;
    }

    return failureCount < limit;
  };
}
