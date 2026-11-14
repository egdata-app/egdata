import { findProofNonce } from "./sha256.ts";
import type { PowSolveRequest, PowSolveResponse } from "./protocol.ts";

/**
 * Pure entry point for one worker job. Kept separate from the worker script so
 * it can be tested without browser globals.
 */
export function solvePowRequest(
  request: PowSolveRequest,
  now: () => number = Date.now,
): PowSolveResponse {
  try {
    const nonce = findProofNonce({
      challenge: request.challenge,
      difficulty: request.difficulty,
      deadline: request.deadline,
      now,
    });

    if (nonce === null) {
      return { type: "timeout" };
    }

    return { type: "solved", nonce };
  } catch {
    return { type: "error", message: "Proof-of-work solver failed" };
  }
}
