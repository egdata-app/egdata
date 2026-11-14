import {
  getChallengeEnvelopeUrl,
  isSessionChallengeEnvelope,
  ProofOfWorkRecoveryError,
} from "./errors.ts";

export const CHALLENGE_PATH = "/auth/challenge";
export const CHALLENGE_ALGORITHM = "SHA-256";
export const MIN_DIFFICULTY_BITS = 1;
export const MAX_DIFFICULTY_BITS = 32;
export const MAX_CHALLENGE_LENGTH = 8_192;
export const MAX_TOKEN_LENGTH = 8_192;

export type SplitProofChallenge = {
  challenge: string;
  difficulty: number;
  algorithm: typeof CHALLENGE_ALGORITHM;
  expiresAt: number;
};

export type ProofToken = {
  token: string;
  expiresAt: number;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function getApiErrorCode(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const error = value.error;

  if (isRecord(error) && typeof error.code === "string") {
    return error.code;
  }

  return typeof value.code === "string" ? value.code : undefined;
}

/** Returns the informational URL without ever using it as a request target. */
export function getEnvelopeChallengeUrl(value: unknown): string | undefined {
  return getChallengeEnvelopeUrl(value);
}

export function parseChallengePayload(
  value: unknown,
  now: number,
  maxDifficulty = MAX_DIFFICULTY_BITS,
): SplitProofChallenge {
  if (!isRecord(value)) {
    throw new ProofOfWorkRecoveryError("challenge-response-invalid");
  }

  const challenge = value.challenge;
  const difficulty = value.difficulty;
  const algorithm = value.algorithm;
  const expiresAt = value.expiresAt;

  if (
    typeof challenge !== "string" ||
    challenge.length === 0 ||
    challenge.length > MAX_CHALLENGE_LENGTH
  ) {
    throw new ProofOfWorkRecoveryError("challenge-response-invalid");
  }

  if (
    typeof difficulty !== "number" ||
    !Number.isInteger(difficulty) ||
    difficulty < MIN_DIFFICULTY_BITS ||
    difficulty > maxDifficulty
  ) {
    throw new ProofOfWorkRecoveryError("difficulty-invalid");
  }

  if (algorithm !== CHALLENGE_ALGORITHM) {
    throw new ProofOfWorkRecoveryError("challenge-response-invalid");
  }

  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= now) {
    throw new ProofOfWorkRecoveryError("challenge-expired");
  }

  return {
    challenge,
    difficulty,
    algorithm,
    expiresAt,
  };
}

export function parseTokenPayload(value: unknown, now: number): ProofToken {
  if (!isRecord(value)) {
    throw new ProofOfWorkRecoveryError("solution-rejected");
  }

  const token = value.token;
  const expiresAt = value.expiresAt;

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH ||
    typeof expiresAt !== "number" ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now
  ) {
    throw new ProofOfWorkRecoveryError("solution-rejected");
  }

  return { token, expiresAt };
}

export type SolutionResponse =
  | { kind: "token"; token: ProofToken }
  | { kind: "replacement"; challenge: SplitProofChallenge }
  | { kind: "challenge-envelope" };

export function parseSolutionResponse(
  value: unknown,
  now: number,
  maxDifficulty = MAX_DIFFICULTY_BITS,
): SolutionResponse {
  if (isSessionChallengeEnvelope(value)) {
    return { kind: "challenge-envelope" };
  }

  if (isRecord(value) && "token" in value) {
    return { kind: "token", token: parseTokenPayload(value, now) };
  }

  if (isRecord(value) && "challenge" in value) {
    return {
      kind: "replacement",
      challenge: parseChallengePayload(value, now, maxDifficulty),
    };
  }

  throw new ProofOfWorkRecoveryError("solution-rejected");
}

export function parseRetryAfterMs(value: string | null, now: number): number | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);

    if (!Number.isFinite(seconds)) {
      return undefined;
    }

    return Math.max(0, Math.ceil(seconds * 1_000));
  }

  const date = Date.parse(trimmed);

  if (Number.isNaN(date)) {
    return undefined;
  }

  return Math.max(0, date - now);
}
