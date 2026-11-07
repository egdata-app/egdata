/**
 * Tiny observable store for the global recovery notice. It carries no
 * challenge, nonce, token, fingerprint or risk information.
 */
export type RecoveryEventState = {
  active: number;
  failureId: number;
  failureKind?: "challenge" | "tarpit";
};

const INITIAL_STATE: RecoveryEventState = { active: 0, failureId: 0 };
const SERVER_STATE: RecoveryEventState = INITIAL_STATE;

let state: RecoveryEventState = INITIAL_STATE;
let nextFailureId = 0;
const listeners = new Set<() => void>();

function publish(next: RecoveryEventState): void {
  state = next;

  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // UI observers must never break a recovery operation.
    }
  }
}

export function subscribeToRecoveryEvents(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getRecoveryEventSnapshot(): RecoveryEventState {
  return state;
}

export function getRecoveryEventServerSnapshot(): RecoveryEventState {
  return SERVER_STATE;
}

export function beginRecoveryOperation(): void {
  publish({ ...state, active: state.active + 1 });
}

export function endRecoveryOperation(): void {
  publish({ ...state, active: Math.max(0, state.active - 1) });
}

export function reportRecoveryFailure(failureKind: "challenge" | "tarpit" = "challenge"): void {
  nextFailureId += 1;
  publish({ ...state, failureId: nextFailureId, failureKind });
}

export function clearRecoveryFailure(): void {
  if (state.failureId === 0) {
    return;
  }

  publish({ ...state, failureId: 0, failureKind: undefined });
}
