/** Messages exchanged with the dedicated proof-of-work worker. */
export type PowSolveRequest = {
  type: "solve";
  challenge: string;
  difficulty: number;
  /** Absolute Unix time in milliseconds after which the worker must stop. */
  deadline: number;
};

export type PowSolveResponse =
  | { type: "solved"; nonce: string }
  | { type: "timeout" }
  | { type: "error"; message: string };

export function isPowSolveRequest(value: unknown): value is PowSolveRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PowSolveRequest>;

  return (
    candidate.type === "solve" &&
    typeof candidate.challenge === "string" &&
    Number.isInteger(candidate.difficulty) &&
    typeof candidate.deadline === "number" &&
    Number.isFinite(candidate.deadline)
  );
}
