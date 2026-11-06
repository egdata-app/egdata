import { createAbortError, isAbortLikeError, ProofOfWorkRecoveryError } from "./errors.ts";
import { NONCE_PATTERN, verifyProofNonce } from "./sha256.ts";

export type ProofSolverInput = {
  challenge: string;
  difficulty: number;
  /** Absolute Unix time in milliseconds. */
  deadline: number;
  signal?: AbortSignal;
};

export type ProofSolver = (input: ProofSolverInput) => Promise<string>;

export type WorkerEndpoint = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage: (message: unknown) => void;
  terminate: () => void;
};

export type WorkerFactory = () => WorkerEndpoint;

export function createBrowserWorker(): WorkerEndpoint {
  return new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
    name: "egdata-pow",
  }) as unknown as WorkerEndpoint;
}

/**
 * Runs one solve in a fresh dedicated worker and always terminates it on
 * completion, timeout, worker failure or cancellation.
 */
export function createWorkerProofSolver(
  factory: WorkerFactory = createBrowserWorker,
  now: () => number = Date.now,
): ProofSolver {
  return (input) =>
    new Promise<string>((resolve, reject) => {
      if (input.signal?.aborted) {
        reject(createAbortError());
        return;
      }

      let settled = false;
      let worker: WorkerEndpoint | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }

        input.signal?.removeEventListener("abort", onAbort);

        if (worker) {
          worker.onmessage = null;
          worker.onerror = null;
          worker.onmessageerror = null;
          worker.terminate();
          worker = null;
        }
      };

      const fail = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      };

      const succeed = (nonce: string) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(nonce);
      };

      const onAbort = () => {
        fail(createAbortError());
      };

      input.signal?.addEventListener("abort", onAbort, { once: true });

      if (input.signal?.aborted) {
        onAbort();
        return;
      }

      const remaining = input.deadline - now();

      if (remaining <= 0) {
        fail(new ProofOfWorkRecoveryError("solve-timeout"));
        return;
      }

      timer = setTimeout(() => {
        fail(new ProofOfWorkRecoveryError("solve-timeout"));
      }, remaining);

      try {
        worker = factory();
      } catch (error) {
        fail(
          new ProofOfWorkRecoveryError("solve-failed", undefined, {
            cause: error,
          }),
        );
        return;
      }

      const activeWorker = worker;

      activeWorker.onmessage = (event: MessageEvent<unknown>) => {
        const message = event.data as { type?: unknown; nonce?: unknown } | null;

        if (!message || typeof message !== "object") {
          fail(new ProofOfWorkRecoveryError("solve-failed"));
          return;
        }

        if (message.type === "timeout") {
          fail(new ProofOfWorkRecoveryError("solve-timeout"));
          return;
        }

        if (message.type === "error") {
          fail(new ProofOfWorkRecoveryError("solve-failed"));
          return;
        }

        if (
          message.type !== "solved" ||
          typeof message.nonce !== "string" ||
          !NONCE_PATTERN.test(message.nonce)
        ) {
          fail(new ProofOfWorkRecoveryError("solve-failed"));
          return;
        }

        // Never trust a worker result blindly; a single verification hash is
        // cheap and keeps an invalid proof from being submitted.
        if (!verifyProofNonce(input.challenge, message.nonce, input.difficulty)) {
          fail(new ProofOfWorkRecoveryError("solve-failed"));
          return;
        }

        succeed(message.nonce);
      };

      activeWorker.onerror = (event: ErrorEvent) => {
        event.preventDefault?.();
        fail(
          new ProofOfWorkRecoveryError("solve-failed", undefined, {
            cause: event.error,
          }),
        );
      };

      activeWorker.onmessageerror = () => {
        fail(new ProofOfWorkRecoveryError("solve-failed"));
      };

      try {
        activeWorker.postMessage({
          type: "solve",
          challenge: input.challenge,
          difficulty: input.difficulty,
          deadline: input.deadline,
        });
      } catch (error) {
        fail(
          new ProofOfWorkRecoveryError("solve-failed", undefined, {
            cause: isAbortLikeError(error) ? undefined : error,
          }),
        );
      }
    });
}
