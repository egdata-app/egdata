import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import type { ProofSolver, ProofSolverInput } from "../../src/lib/pow/browser-solver.ts";
import { findProofNonce } from "../../src/lib/pow/sha256.ts";
import type { SessionRecovery } from "../../src/lib/pow/session-recovery.ts";

export const API_ORIGIN = "https://api.egdata.app";
export const CHALLENGE_URL = `${API_ORIGIN}/auth/challenge`;

export const TEST_CHALLENGE = "unit-test-challenge";
export const TEST_CHALLENGE_2 = "unit-test-challenge-2";

export const TEST_NONCE = findProofNonce({
  challenge: TEST_CHALLENGE,
  difficulty: 16,
  deadline: Date.now() + 30_000,
});

export const TEST_NONCE_2 = findProofNonce({
  challenge: TEST_CHALLENGE_2,
  difficulty: 16,
  deadline: Date.now() + 30_000,
});

if (!TEST_NONCE || !TEST_NONCE_2) {
  throw new Error("Failed to precompute test proof nonces");
}

export type FetchCall = {
  input: string;
  init: RequestInit;
};

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

export function challengeBody(
  now: number,
  overrides: Partial<{
    challenge: string;
    difficulty: number;
    algorithm: string;
    expiresAt: number;
  }> = {},
) {
  return {
    challenge: TEST_CHALLENGE,
    difficulty: 16,
    algorithm: "SHA-256",
    expiresAt: now + 60_000,
    ...overrides,
  };
}

export function tokenBody(
  now: number,
  overrides: Partial<{ token: string; expiresAt: number }> = {},
) {
  return {
    token: "opaque-session-token",
    expiresAt: now + 600_000,
    ...overrides,
  };
}

export function scriptedFetch(
  handler: (call: FetchCall, index: number) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];

  const fetchImpl = async (
    input: string | URL | Request,
    init: RequestInit = {},
  ): Promise<Response> => {
    const call: FetchCall = {
      input:
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      init,
    };

    calls.push(call);

    return handler(call, calls.length - 1);
  };

  return { fetchImpl: fetchImpl as typeof fetch, calls };
}

export function createSolver(): {
  solver: ProofSolver;
  calls: ProofSolverInput[];
} {
  const calls: ProofSolverInput[] = [];

  const solver: ProofSolver = async (input) => {
    calls.push(input);

    if (input.challenge === TEST_CHALLENGE && input.difficulty === 16) {
      return TEST_NONCE as string;
    }

    if (input.challenge === TEST_CHALLENGE_2 && input.difficulty === 16) {
      return TEST_NONCE_2 as string;
    }

    const nonce = findProofNonce({
      challenge: input.challenge,
      difficulty: input.difficulty,
      deadline: Math.min(input.deadline, Date.now() + 20_000),
    });

    if (!nonce) {
      throw new Error("test solver exhausted its deadline");
    }

    return nonce;
  };

  return { solver, calls };
}

export function createRecoverySpy(): {
  recovery: SessionRecovery;
  starts: number[];
} {
  let generation = 0;
  const starts: number[] = [];

  const recovery: SessionRecovery = {
    getGeneration: () => generation,
    recover: async ({ startedGeneration }) => {
      starts.push(startedGeneration);
      generation = Math.max(generation, startedGeneration + 1);

      return {
        generation,
        expiresAt: Date.now() + 600_000,
      };
    },
  };

  return { recovery, starts };
}

export type AdapterReply = {
  data: unknown;
  status?: number;
  headers?: Record<string, string>;
};

export function createAdapter(
  handler: (
    config: InternalAxiosRequestConfig,
    index: number,
  ) => AdapterReply | Promise<AdapterReply>,
): { adapter: AxiosAdapter; configs: InternalAxiosRequestConfig[] } {
  const configs: InternalAxiosRequestConfig[] = [];

  const adapter: AxiosAdapter = async (config) => {
    configs.push(config);
    const reply = await handler(config, configs.length - 1);
    const response = {
      data: reply.data,
      status: reply.status ?? 200,
      statusText: "OK",
      headers: reply.headers ?? {},
      config,
    };

    if (response.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${response.status}`,
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        response,
      );
    }

    return response;
  };

  return { adapter, configs };
}
