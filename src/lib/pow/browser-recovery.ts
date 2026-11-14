import { createWorkerProofSolver } from "./browser-solver.ts";
import { SessionRecoveryCoordinator } from "./session-recovery.ts";
import type { SessionRecovery } from "./session-recovery.ts";

/**
 * Browser-only factory. Imported lazily from `http-client` after the first
 * exact challenge envelope, so normal page loads do not even load the worker
 * code or touch browser worker globals.
 */
export function createBrowserSessionRecovery(apiOrigin: string): SessionRecovery {
  return new SessionRecoveryCoordinator({
    apiOrigin,
    solver: createWorkerProofSolver(),
  });
}
