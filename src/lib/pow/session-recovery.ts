import {
  CHALLENGE_PATH,
  MAX_DIFFICULTY_BITS,
  getApiErrorCode,
  parseChallengePayload,
  parseRetryAfterMs,
  parseSolutionResponse,
  type SplitProofChallenge,
  type SolutionResponse,
} from "./challenge.ts";
import type { ProofSolver } from "./browser-solver.ts";
import {
  createAbortError,
  isAbortLikeError,
  isProofOfWorkRecoveryError,
  ProofOfWorkRecoveryError,
} from "./errors.ts";
import {
  beginRecoveryOperation,
  clearRecoveryFailure,
  endRecoveryOperation,
  reportRecoveryFailure,
} from "./recovery-events.ts";
import { NONCE_PATTERN, verifyProofNonce } from "./sha256.ts";

export type SessionRecoveryRequest = {
  /** Session generation observed before the original request was sent. */
  startedGeneration: number;
  signal?: AbortSignal;
};

export type SessionRecoveryResult = {
  generation: number;
  expiresAt: number;
};

export interface SessionRecovery {
  getGeneration(): number;
  recover(request: SessionRecoveryRequest): Promise<SessionRecoveryResult>;
}

export type SessionRecoveryOptions = {
  apiOrigin: string;
  solver: ProofSolver;
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Overall budget for one handshake, including a replacement challenge. */
  recoveryTimeoutMs?: number;
  /** Per-network-call budget. */
  requestTimeoutMs?: number;
  /** Upper bound for one brute-force attempt, regardless of difficulty. */
  maxSolveMs?: number;
  /** Do not submit a proof in the last moment before challenge expiry. */
  expirySafetyMs?: number;
  maxDifficulty?: number;
};

type RecoveryOperation = {
  controller: AbortController;
  promise: Promise<SessionRecoveryResult>;
  subscribers: number;
  settled: boolean;
};

type HandshakePhase = "challenge" | "solution";

type JsonResponse = {
  body: unknown;
  retryAfterMs?: number;
  status: number;
};

const DEFAULT_RECOVERY_TIMEOUT_MS = 70_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_SOLVE_MS = 45_000;
const DEFAULT_EXPIRY_SAFETY_MS = 1_500;

/**
 * One browser-tab coordinator. It owns the single in-flight handshake, the
 * session generation counter and the memory-only session expiry. It is never
 * constructed on the server; see `HttpFetch`.
 */
export class SessionRecoveryCoordinator implements SessionRecovery {
  private readonly challengeUrl: string;
  private readonly solver: ProofSolver;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly recoveryTimeoutMs: number;
  private readonly requestTimeoutMs: number;
  private readonly maxSolveMs: number;
  private readonly expirySafetyMs: number;
  private readonly maxDifficulty: number;

  private generation = 0;
  private sessionExpiresAt = 0;
  private inflight: RecoveryOperation | null = null;

  constructor(options: SessionRecoveryOptions) {
    this.challengeUrl = resolveChallengeUrl(options.apiOrigin);
    this.solver = options.solver;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
    this.now = options.now ?? Date.now;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs ?? DEFAULT_RECOVERY_TIMEOUT_MS;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.maxSolveMs = options.maxSolveMs ?? DEFAULT_MAX_SOLVE_MS;
    this.expirySafetyMs = options.expirySafetyMs ?? DEFAULT_EXPIRY_SAFETY_MS;
    this.maxDifficulty = options.maxDifficulty ?? MAX_DIFFICULTY_BITS;
  }

  getGeneration(): number {
    return this.generation;
  }

  getSessionExpiresAt(): number {
    return this.sessionExpiresAt;
  }

  private hasSessionNewerThan(startedGeneration: number): boolean {
    return this.generation > startedGeneration && this.now() < this.sessionExpiresAt;
  }

  async recover(request: SessionRecoveryRequest): Promise<SessionRecoveryResult> {
    const { startedGeneration, signal } = request;

    if (signal?.aborted) {
      throw createAbortError();
    }

    if (this.hasSessionNewerThan(startedGeneration)) {
      return {
        generation: this.generation,
        expiresAt: this.sessionExpiresAt,
      };
    }

    const operation = this.inflight ?? this.startOperation();
    operation.subscribers += 1;

    try {
      await waitForOperation(operation, signal);
    } finally {
      operation.subscribers -= 1;

      if (operation.subscribers <= 0 && !operation.settled) {
        // No interested caller remains. Abort the handshake and worker, but
        // only after every other caller has detached.
        operation.controller.abort();

        if (this.inflight === operation) {
          this.inflight = null;
        }
      }
    }

    return {
      generation: this.generation,
      expiresAt: this.sessionExpiresAt,
    };
  }

  private startOperation(): RecoveryOperation {
    const controller = new AbortController();
    const operation: RecoveryOperation = {
      controller,
      promise: undefined as unknown as Promise<SessionRecoveryResult>,
      subscribers: 0,
      settled: false,
    };

    beginRecoveryOperation();

    operation.promise = this.run(controller.signal)
      .then((result) => {
        clearRecoveryFailure();
        return result;
      })
      .catch((error: unknown) => {
        if (!isAbortLikeError(error)) {
          reportRecoveryFailure();
        }
        throw error;
      })
      .finally(() => {
        operation.settled = true;
        endRecoveryOperation();

        if (this.inflight === operation) {
          this.inflight = null;
        }
      });

    // Callers race this promise with their own cancellation. When the last
    // caller detaches, nobody may be left to observe the rejection.
    operation.promise.catch(() => {});

    this.inflight = operation;
    return operation;
  }

  private async run(signal: AbortSignal): Promise<SessionRecoveryResult> {
    const deadline = this.now() + this.recoveryTimeoutMs;
    let challenge = await this.fetchChallenge(signal, deadline);
    let replacementUsed = false;

    for (;;) {
      this.assertDeadline(deadline);

      const nonce = await this.solve(challenge, signal, deadline);
      const solution = await this.submit(challenge.challenge, nonce, signal, deadline);

      if (solution.kind === "token") {
        this.generation += 1;
        this.sessionExpiresAt = solution.token.expiresAt;

        return {
          generation: this.generation,
          expiresAt: this.sessionExpiresAt,
        };
      }

      if (replacementUsed) {
        throw new ProofOfWorkRecoveryError("replacement-exhausted");
      }

      replacementUsed = true;

      if (solution.kind === "replacement") {
        challenge = solution.challenge;
      } else {
        // The server asked for a challenge again instead of returning the
        // replacement payload directly. Fetch exactly one replacement.
        challenge = await this.fetchChallenge(signal, deadline);
      }

      if (this.now() >= challenge.expiresAt) {
        throw new ProofOfWorkRecoveryError("challenge-expired");
      }
    }
  }

  private assertDeadline(deadline: number): void {
    if (this.now() >= deadline) {
      throw new ProofOfWorkRecoveryError("timeout");
    }
  }

  private remainingBudget(deadline: number): number {
    const remaining = deadline - this.now();

    if (remaining <= 0) {
      throw new ProofOfWorkRecoveryError("timeout");
    }

    return remaining;
  }

  private requestTimeout(deadline: number): number {
    return Math.max(1, Math.min(this.requestTimeoutMs, this.remainingBudget(deadline)));
  }

  private solveDeadline(challenge: SplitProofChallenge, deadline: number): number {
    const latestByExpiry = challenge.expiresAt - this.expirySafetyMs;
    const latestBySolveBudget = this.now() + this.maxSolveMs;
    const latest = Math.min(deadline, latestByExpiry, latestBySolveBudget);

    if (latest <= this.now()) {
      throw new ProofOfWorkRecoveryError("challenge-expired");
    }

    return latest;
  }

  private async solve(
    challenge: SplitProofChallenge,
    signal: AbortSignal,
    deadline: number,
  ): Promise<string> {
    const solveDeadline = this.solveDeadline(challenge, deadline);

    let nonce: string;

    try {
      nonce = await this.solver({
        challenge: challenge.challenge,
        difficulty: challenge.difficulty,
        deadline: solveDeadline,
        signal,
      });
    } catch (error) {
      if (isAbortLikeError(error) || isProofOfWorkRecoveryError(error)) {
        throw error;
      }

      throw new ProofOfWorkRecoveryError("solve-failed", undefined, {
        cause: error,
      });
    }

    if (
      !NONCE_PATTERN.test(nonce) ||
      !verifyProofNonce(challenge.challenge, nonce, challenge.difficulty)
    ) {
      throw new ProofOfWorkRecoveryError("solve-failed");
    }

    return nonce;
  }

  private async fetchChallenge(
    signal: AbortSignal,
    deadline: number,
  ): Promise<SplitProofChallenge> {
    const response = await this.postJson({}, signal, deadline, "challenge");

    return parseChallengePayload(response.body, this.now(), this.maxDifficulty);
  }

  private async submit(
    challenge: string,
    nonce: string,
    signal: AbortSignal,
    deadline: number,
  ): Promise<SolutionResponse> {
    const response = await this.postJson({ challenge, nonce }, signal, deadline, "solution");

    return parseSolutionResponse(response.body, this.now(), this.maxDifficulty);
  }

  private async postJson(
    body: Record<string, string>,
    outerSignal: AbortSignal,
    deadline: number,
    phase: HandshakePhase,
  ): Promise<JsonResponse> {
    if (outerSignal.aborted) {
      throw createAbortError();
    }

    const controller = new AbortController();
    const timeoutMs = this.requestTimeout(deadline);
    let timedOut = false;
    let abortedByCaller = false;

    const onOuterAbort = () => {
      abortedByCaller = true;
      controller.abort();
    };

    outerSignal.addEventListener("abort", onOuterAbort, { once: true });

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      let response: Response;

      try {
        response = await this.fetchImpl(this.challengeUrl, {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          cache: "no-store",
          redirect: "error",
          signal: controller.signal,
        });
      } catch (error) {
        if (abortedByCaller) {
          throw createAbortError();
        }

        if (timedOut) {
          throw new ProofOfWorkRecoveryError("timeout", undefined, {
            cause: error,
          });
        }

        throw new ProofOfWorkRecoveryError(
          phase === "challenge" ? "challenge-fetch-failed" : "recovery-failed",
          undefined,
          { cause: error },
        );
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"), this.now());

      let text: string;

      try {
        text = await response.text();
      } catch (error) {
        if (abortedByCaller) {
          throw createAbortError();
        }

        if (timedOut) {
          throw new ProofOfWorkRecoveryError("timeout", undefined, {
            cause: error,
          });
        }

        throw new ProofOfWorkRecoveryError("recovery-failed", undefined, {
          cause: error,
          status: response.status,
        });
      }

      let parsed: unknown;

      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = undefined;
        }
      }

      if (response.status === 429) {
        throw new ProofOfWorkRecoveryError("rate-limited", undefined, {
          status: 429,
          retryAfterMs,
        });
      }

      if (response.status === 503) {
        throw new ProofOfWorkRecoveryError(
          getApiErrorCode(parsed) === "ANTI_ABUSE_DISABLED"
            ? "service-unavailable"
            : "recovery-failed",
          undefined,
          { status: 503, retryAfterMs },
        );
      }

      if (response.status === 400) {
        throw new ProofOfWorkRecoveryError(
          phase === "challenge" ? "challenge-fetch-failed" : "solution-rejected",
          undefined,
          { status: 400, retryAfterMs },
        );
      }

      if (!response.ok) {
        throw new ProofOfWorkRecoveryError("recovery-failed", undefined, {
          status: response.status,
          retryAfterMs,
        });
      }

      if (!text || parsed === undefined) {
        throw new ProofOfWorkRecoveryError(
          phase === "challenge" ? "challenge-response-invalid" : "solution-rejected",
          undefined,
          { status: response.status },
        );
      }

      return {
        body: parsed,
        retryAfterMs,
        status: response.status,
      };
    } finally {
      clearTimeout(timer);
      outerSignal.removeEventListener("abort", onOuterAbort);
    }
  }
}

function waitForOperation(operation: RecoveryOperation, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return operation.promise.then(() => undefined);
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(createAbortError());
    };

    signal.addEventListener("abort", onAbort, { once: true });

    if (signal.aborted) {
      onAbort();
      return;
    }

    operation.promise.then(
      () => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve();
      },
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
}

function resolveChallengeUrl(apiOrigin: string): string {
  let url: URL;

  try {
    url = new URL(CHALLENGE_PATH, apiOrigin);
  } catch (error) {
    throw new ProofOfWorkRecoveryError("challenge-fetch-failed", undefined, {
      cause: error,
    });
  }

  const loopback =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1";

  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
  ) {
    throw new ProofOfWorkRecoveryError("challenge-fetch-failed");
  }

  return url.toString();
}
