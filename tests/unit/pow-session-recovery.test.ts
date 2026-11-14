import assert from "node:assert/strict";
import test from "node:test";
import { ProofOfWorkRecoveryError } from "../../src/lib/pow/errors.ts";
import { SessionRecoveryCoordinator } from "../../src/lib/pow/session-recovery.ts";
import {
  API_ORIGIN,
  CHALLENGE_URL,
  TEST_CHALLENGE,
  TEST_CHALLENGE_2,
  TEST_NONCE,
  TEST_NONCE_2,
  challengeBody,
  createSolver,
  jsonResponse,
  scriptedFetch,
  tokenBody,
} from "./pow-test-helpers.ts";

const NOW = 1_800_000_000_000;

function assertRecoveryError(error: unknown, reason: string, status?: number): boolean {
  assert.ok(error instanceof ProofOfWorkRecoveryError);
  assert.equal(error.reason, reason);
  if (status !== undefined) {
    assert.equal(error.status, status);
  }
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayedResponse(
  ms: number,
  response: Response,
  signal: AbortSignal | null | undefined,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => resolve(response), ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

test("performs one trusted, credentialed handshake and records a session generation", async () => {
  const { fetchImpl, calls } = scriptedFetch((_call, index) =>
    index === 0 ? jsonResponse(challengeBody(NOW)) : jsonResponse(tokenBody(NOW)),
  );
  const { solver } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  const result = await coordinator.recover({ startedGeneration: 0 });

  assert.deepEqual(result, { generation: 1, expiresAt: NOW + 600_000 });
  assert.equal(coordinator.getGeneration(), 1);
  assert.equal(calls.length, 2);

  for (const call of calls) {
    assert.equal(call.input, CHALLENGE_URL);
    assert.equal(call.init.method, "POST");
    assert.equal(call.init.credentials, "include");
  }

  assert.equal(calls[0].init.body, "{}");
  assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
    challenge: TEST_CHALLENGE,
    nonce: TEST_NONCE,
  });
});

test("twenty simultaneous challenged callers share one handshake and one solve", async () => {
  const { fetchImpl, calls } = scriptedFetch(async (_call, index) => {
    if (index === 0) {
      await delay(25);
    }

    return index === 0 ? jsonResponse(challengeBody(NOW)) : jsonResponse(tokenBody(NOW));
  });
  const { solver, calls: solverCalls } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  const results = await Promise.all(
    Array.from({ length: 20 }, () => coordinator.recover({ startedGeneration: 0 })),
  );

  assert.equal(calls.length, 2);
  assert.equal(solverCalls.length, 1);
  assert.equal(coordinator.getGeneration(), 1);

  for (const result of results) {
    assert.equal(result.generation, 1);
  }
});

test("a late challenge response reuses a session established since the request began", async () => {
  const { fetchImpl, calls } = scriptedFetch((_call, index) =>
    index % 2 === 0 ? jsonResponse(challengeBody(NOW)) : jsonResponse(tokenBody(NOW)),
  );
  const { solver } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  await coordinator.recover({ startedGeneration: 0 });
  assert.equal(calls.length, 2);

  // This request began before the session existed; its late challenge must
  // reuse the new session instead of starting another handshake.
  const late = await coordinator.recover({ startedGeneration: 0 });
  assert.equal(late.generation, 1);
  assert.equal(calls.length, 2);

  // A request that began with the current generation has no newer session to
  // reuse, so it may renew after being challenged.
  await coordinator.recover({ startedGeneration: 1 });
  assert.equal(calls.length, 4);
  assert.equal(coordinator.getGeneration(), 2);
});

test("handles exactly one replacement challenge returned in place of a token", async () => {
  const { fetchImpl, calls } = scriptedFetch((_call, index) => {
    switch (index) {
      case 0:
        return jsonResponse(challengeBody(NOW));
      case 1:
        return jsonResponse(challengeBody(NOW, { challenge: TEST_CHALLENGE_2 }));
      default:
        return jsonResponse(tokenBody(NOW));
    }
  });
  const { solver, calls: solverCalls } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  const result = await coordinator.recover({ startedGeneration: 0 });

  assert.equal(result.generation, 1);
  assert.equal(solverCalls.length, 2);
  assert.equal(solverCalls[0].challenge, TEST_CHALLENGE);
  assert.equal(solverCalls[1].challenge, TEST_CHALLENGE_2);
  assert.deepEqual(JSON.parse(String(calls[2].init.body)), {
    challenge: TEST_CHALLENGE_2,
    nonce: TEST_NONCE_2,
  });
});

test("handles a replacement challenge envelope without following its URL", async () => {
  const { fetchImpl, calls } = scriptedFetch((_call, index) => {
    switch (index) {
      case 0:
        return jsonResponse(challengeBody(NOW));
      case 1:
        return jsonResponse({
          error: {
            code: "SESSION_CHALLENGE_REQUIRED",
            challengeUrl: "https://attacker.example/steal",
          },
        });
      case 2:
        return jsonResponse(challengeBody(NOW, { challenge: TEST_CHALLENGE_2 }));
      default:
        return jsonResponse(tokenBody(NOW));
    }
  });
  const { solver, calls: solverCalls } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  await coordinator.recover({ startedGeneration: 0 });

  assert.equal(solverCalls.length, 2);
  assert.equal(calls.length, 4);

  for (const call of calls) {
    assert.equal(call.input, CHALLENGE_URL);
    assert.equal(call.input.includes("attacker.example"), false);
  }
});

test("never solves a third challenge after the one allowed replacement", async () => {
  const { fetchImpl, calls } = scriptedFetch((_call, index) => {
    if (index === 0) {
      return jsonResponse(challengeBody(NOW));
    }

    return jsonResponse(
      challengeBody(NOW, {
        challenge: index === 1 ? TEST_CHALLENGE_2 : TEST_CHALLENGE,
      }),
    );
  });
  const { solver, calls: solverCalls } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  await assert.rejects(coordinator.recover({ startedGeneration: 0 }), (error) =>
    assertRecoveryError(error, "replacement-exhausted"),
  );

  assert.equal(solverCalls.length, 2);
  assert.equal(calls.length, 3);
  assert.equal(coordinator.getGeneration(), 0);
});

test("rejects expired, malformed and unsupported challenge responses before solving", async () => {
  const cases: Array<{
    body: Record<string, unknown>;
    reason: string;
  }> = [
    {
      body: challengeBody(NOW, { expiresAt: NOW - 1 }),
      reason: "challenge-expired",
    },
    {
      body: challengeBody(NOW, { algorithm: "SHA-1" }),
      reason: "challenge-response-invalid",
    },
    {
      body: challengeBody(NOW, { difficulty: 0 }),
      reason: "difficulty-invalid",
    },
    {
      body: challengeBody(NOW, { difficulty: 33 }),
      reason: "difficulty-invalid",
    },
    {
      body: { challenge: "", difficulty: 16, algorithm: "SHA-256", expiresAt: NOW + 60_000 },
      reason: "challenge-response-invalid",
    },
  ];

  for (const item of cases) {
    const { fetchImpl, calls } = scriptedFetch(() => jsonResponse(item.body));
    const { solver, calls: solverCalls } = createSolver();
    const coordinator = new SessionRecoveryCoordinator({
      apiOrigin: API_ORIGIN,
      fetchImpl,
      solver,
      now: () => NOW,
    });

    await assert.rejects(coordinator.recover({ startedGeneration: 0 }), (error) =>
      assertRecoveryError(error, item.reason),
    );

    assert.equal(calls.length, 1);
    assert.equal(solverCalls.length, 0);
  }
});

test("rejects an empty challenge response without starting a solve", async () => {
  const { fetchImpl, calls } = scriptedFetch(() => new Response("", { status: 200 }));
  const { solver, calls: solverCalls } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  await assert.rejects(coordinator.recover({ startedGeneration: 0 }), (error) =>
    assertRecoveryError(error, "challenge-response-invalid"),
  );

  assert.equal(calls.length, 1);
  assert.equal(solverCalls.length, 0);
});

test("bounded failures: 400, 503 and 429 never loop or solve", async () => {
  const cases: Array<{
    response: () => Response;
    reason: string;
    status: number;
    retryAfterMs?: number;
  }> = [
    {
      response: () => jsonResponse({ error: { code: "INVALID_CHALLENGE" } }, 400),
      reason: "challenge-fetch-failed",
      status: 400,
    },
    {
      response: () => jsonResponse({ error: { code: "ANTI_ABUSE_DISABLED" } }, 503),
      reason: "service-unavailable",
      status: 503,
    },
    {
      response: () =>
        jsonResponse({ error: { code: "RATE_LIMITED" } }, 429, {
          "retry-after": "2",
        }),
      reason: "rate-limited",
      status: 429,
      retryAfterMs: 2_000,
    },
  ];

  for (const item of cases) {
    const { fetchImpl, calls } = scriptedFetch(() => item.response());
    const { solver, calls: solverCalls } = createSolver();
    const coordinator = new SessionRecoveryCoordinator({
      apiOrigin: API_ORIGIN,
      fetchImpl,
      solver,
      now: () => NOW,
    });

    await assert.rejects(coordinator.recover({ startedGeneration: 0 }), (error) => {
      assertRecoveryError(error, item.reason, item.status);
      if (item.retryAfterMs !== undefined) {
        assert.equal((error as ProofOfWorkRecoveryError).retryAfterMs, item.retryAfterMs);
      }
      return true;
    });

    assert.equal(calls.length, 1);
    assert.equal(solverCalls.length, 0);
  }
});

test("rejects malformed or already-expired token responses", async () => {
  const responses = [
    {},
    { token: "", expiresAt: NOW + 60_000 },
    { token: "opaque", expiresAt: NOW - 1 },
    { token: "opaque" },
  ];

  for (const tokenResponse of responses) {
    const { fetchImpl, calls } = scriptedFetch((_call, index) =>
      index === 0 ? jsonResponse(challengeBody(NOW)) : jsonResponse(tokenResponse),
    );
    const { solver } = createSolver();
    const coordinator = new SessionRecoveryCoordinator({
      apiOrigin: API_ORIGIN,
      fetchImpl,
      solver,
      now: () => NOW,
    });

    await assert.rejects(coordinator.recover({ startedGeneration: 0 }), (error) =>
      assertRecoveryError(error, "solution-rejected"),
    );

    assert.equal(calls.length, 2);
    assert.equal(coordinator.getGeneration(), 0);
  }
});

test("worker failure is surfaced as a typed bounded error", async () => {
  const { fetchImpl, calls } = scriptedFetch(() => jsonResponse(challengeBody(NOW)));
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver: async () => {
      throw new Error("worker crashed");
    },
    now: () => NOW,
  });

  await assert.rejects(coordinator.recover({ startedGeneration: 0 }), (error) =>
    assertRecoveryError(error, "solve-failed"),
  );

  assert.equal(calls.length, 1);
});

test("one canceled caller does not cancel recovery needed by another caller", async () => {
  const { fetchImpl, calls } = scriptedFetch(async (_call, index) => {
    if (index === 0) {
      await delay(40);
    }

    return index === 0 ? jsonResponse(challengeBody(NOW)) : jsonResponse(tokenBody(NOW));
  });
  const { solver, calls: solverCalls } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  const firstController = new AbortController();
  const secondController = new AbortController();
  const first = coordinator.recover({
    startedGeneration: 0,
    signal: firstController.signal,
  });
  const second = coordinator.recover({
    startedGeneration: 0,
    signal: secondController.signal,
  });

  await delay(5);
  firstController.abort();

  await assert.rejects(first, (error) => {
    assert.equal((error as Error).name, "AbortError");
    return true;
  });

  const result = await second;

  assert.equal(result.generation, 1);
  assert.equal(calls.length, 2);
  assert.equal(solverCalls.length, 1);
});

test("canceling every caller aborts the handshake and never submits a proof", async () => {
  const { fetchImpl, calls } = scriptedFetch((call) =>
    delayedResponse(50, jsonResponse(challengeBody(NOW)), call.init.signal),
  );
  const { solver, calls: solverCalls } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });

  const controller = new AbortController();
  const recovery = coordinator.recover({
    startedGeneration: 0,
    signal: controller.signal,
  });

  await delay(5);
  controller.abort();

  await assert.rejects(recovery, (error) => {
    assert.equal((error as Error).name, "AbortError");
    return true;
  });

  assert.equal(calls.length, 1);
  assert.equal(solverCalls.length, 0);
});

test("the overall recovery deadline bounds a stalled challenge fetch", async () => {
  const { fetchImpl } = scriptedFetch((call) =>
    delayedResponse(100, jsonResponse(challengeBody(NOW)), call.init.signal),
  );
  const { solver } = createSolver();
  const coordinator = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
    recoveryTimeoutMs: 10,
  });

  await assert.rejects(coordinator.recover({ startedGeneration: 0 }), (error) =>
    assertRecoveryError(error, "timeout"),
  );
});

test("rejects a non-HTTPS non-loopback API origin", () => {
  assert.throws(
    () =>
      new SessionRecoveryCoordinator({
        apiOrigin: "http://api.egdata.app",
        fetchImpl: async () => jsonResponse({}),
        solver: async () => "x",
      }),
    (error) => assertRecoveryError(error, "challenge-fetch-failed"),
  );
});
