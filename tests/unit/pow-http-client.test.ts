import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
import { parse } from "graphql";
import { HttpFetch } from "../../src/lib/http-client.ts";
import { graphqlRequest } from "../../src/lib/graphql-request.ts";
import { ProofOfWorkRecoveryError, isProofOfWorkRecoveryError } from "../../src/lib/pow/errors.ts";
import { shouldRetryQuery } from "../../src/lib/pow/query-retry.ts";
import type { SessionRecovery } from "../../src/lib/pow/session-recovery.ts";
import { SessionRecoveryCoordinator } from "../../src/lib/pow/session-recovery.ts";
import {
  API_ORIGIN,
  TEST_CHALLENGE,
  challengeBody,
  createAdapter,
  createRecoverySpy,
  createSolver,
  jsonResponse,
  scriptedFetch,
  tokenBody,
} from "./pow-test-helpers.ts";

const CHALLENGE_ENVELOPE = {
  error: {
    code: "SESSION_CHALLENGE_REQUIRED",
    challengeUrl: "/auth/challenge",
  },
};

function createClient(recovery: SessionRecovery) {
  return new HttpFetch(
    API_ORIGIN,
    { timeout: 1_000, withCredentials: true },
    { mode: "browser", recovery },
  );
}

test("normal REST traffic makes no challenge call and starts no recovery", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter(() => ({ data: { id: "offer-1" } }));
  client.axiosInstance.defaults.adapter = adapter;

  const data = await client.get<{ id: string }>("/offers/offer-1", {
    params: { country: "US" },
  });

  assert.deepEqual(data, { id: "offer-1" });
  assert.equal(configs.length, 1);
  assert.equal(starts.length, 0);
});

test("intercepts a REST HTTP-200 challenge envelope and replays the request once", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter((_config, index) =>
    index === 0 ? { data: CHALLENGE_ENVELOPE } : { data: { id: "offer-1" } },
  );
  client.axiosInstance.defaults.adapter = adapter;

  const data = await client.post<{ id: string }>(
    "/reviews",
    { rating: 5, body: "great" },
    { params: { country: "ES" }, headers: { "x-egdata-test": "kept" } },
  );

  assert.deepEqual(data, { id: "offer-1" });
  assert.equal(configs.length, 2);
  assert.equal(starts.length, 1);

  for (const config of configs) {
    assert.equal(config.method, "post");
    assert.equal(config.url, "/reviews");
    assert.equal(config.baseURL, API_ORIGIN);
    assert.deepEqual(config.params, { country: "ES" });
    assert.equal(config.headers.get("x-egdata-test"), "kept");
  }

  assert.equal(configs[0].data, configs[1].data);
  assert.deepEqual(JSON.parse(String(configs[1].data)), {
    rating: 5,
    body: "great",
  });
});

test("intercepts a GraphQL HTTP-200 challenge envelope before parsing", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter((_config, index) =>
    index === 0 ? { data: CHALLENGE_ENVELOPE } : { data: { data: { viewer: { id: "viewer-1" } } } },
  );
  client.axiosInstance.defaults.adapter = adapter;

  const document = parse("query Viewer { viewer { id } }");
  const data = await graphqlRequest<{ viewer: { id: string } }>(document, undefined, {
    preferPost: true,
    client,
  });

  assert.deepEqual(data, { viewer: { id: "viewer-1" } });
  assert.equal(configs.length, 2);
  assert.equal(starts.length, 1);
  assert.equal(configs[1].headers.get("content-type"), "application/json");
});

test("intercepts a GraphQL APQ GET challenge envelope and preserves preflight headers", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter((_config, index) =>
    index === 0
      ? { data: CHALLENGE_ENVELOPE }
      : { data: { data: { viewer: { id: "viewer-get" } } } },
  );
  client.axiosInstance.defaults.adapter = adapter;

  const document = parse("query ViewerGet { viewer { id } }");
  const data = await graphqlRequest<{ viewer: { id: string } }>(document, undefined, {
    client,
  });

  assert.deepEqual(data, { viewer: { id: "viewer-get" } });
  assert.equal(configs.length, 2);
  assert.equal(starts.length, 1);

  for (const config of configs) {
    assert.equal(config.method, "get");
    assert.equal(config.headers.get("apollo-require-preflight"), "true");
  }
});

test("a GraphQL challenge failure is surfaced as a typed error, not GraphQL data", async () => {
  const recovery: SessionRecovery = {
    getGeneration: () => 0,
    recover: async () => {
      throw new ProofOfWorkRecoveryError("solve-failed");
    },
  };
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter(() => ({ data: CHALLENGE_ENVELOPE }));
  client.axiosInstance.defaults.adapter = adapter;

  const document = parse("query Viewer { viewer { id } }");

  await assert.rejects(
    graphqlRequest(document, undefined, { preferPost: true, client }),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "solve-failed",
  );

  assert.equal(configs.length, 1);
});

test("twenty simultaneous challenged HTTP requests share one handshake", async () => {
  const NOW = 1_800_000_000_000;
  const { fetchImpl, calls: challengeCalls } = scriptedFetch(async (_call, index) => {
    if (index === 0) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return index === 0 ? jsonResponse(challengeBody(NOW)) : jsonResponse(tokenBody(NOW));
  });
  const { solver, calls: solverCalls } = createSolver();
  const recovery = new SessionRecoveryCoordinator({
    apiOrigin: API_ORIGIN,
    fetchImpl,
    solver,
    now: () => NOW,
  });
  const client = createClient(recovery);

  const attempts = new Map<string, number>();
  const { adapter, configs } = createAdapter((config) => {
    const key = String(config.url);
    const attempt = attempts.get(key) ?? 0;
    attempts.set(key, attempt + 1);

    return attempt === 0 ? { data: CHALLENGE_ENVELOPE } : { data: { url: config.url } };
  });
  client.axiosInstance.defaults.adapter = adapter;

  const results = await Promise.all(
    Array.from({ length: 20 }, (_, index) => client.get(`/offers/${index}`)),
  );

  assert.equal(results.length, 20);
  assert.equal(configs.length, 40);
  assert.equal(challengeCalls.length, 2);
  assert.equal(solverCalls.length, 1);
  assert.equal(solverCalls[0].challenge, TEST_CHALLENGE);
  assert.equal(recovery.getGeneration(), 1);
});

test("replays an original request only once and surfaces repeated challenges", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter(() => ({ data: CHALLENGE_ENVELOPE }));
  client.axiosInstance.defaults.adapter = adapter;

  await assert.rejects(
    client.get("/offers/offer-1"),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "challenged-again",
  );

  assert.equal(configs.length, 2);
  assert.equal(starts.length, 1);
});

test("empty, truncated and high-risk mitigation responses never trigger recovery", async () => {
  const responses = [
    { data: "" },
    { data: null },
    { data: '{"error":{"code":"SESSION_CHALLENGE_REQUIRED"' },
    { data: { elements: [], page: 1, limit: 0, total: 0 } },
    { data: { error: { code: "SOMETHING_ELSE" } } },
  ];

  for (const response of responses) {
    const { recovery, starts } = createRecoverySpy();
    const client = createClient(recovery);
    const { adapter, configs } = createAdapter(() => response);
    client.axiosInstance.defaults.adapter = adapter;

    await client.get("/offers");
    assert.equal(configs.length, 1);
    assert.equal(starts.length, 0);
  }
});

test("does not replay a non-replayable body after a challenge", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter(() => ({ data: CHALLENGE_ENVELOPE }));
  client.axiosInstance.defaults.adapter = adapter;

  const stream = new ReadableStream<Uint8Array>();

  await assert.rejects(
    client.post("/upload", stream),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "not-replayable",
  );

  assert.equal(configs.length, 1);
  assert.equal(starts.length, 0);
  await stream.cancel();
});

test("never recovers on the server and reports the SSR limitation", async () => {
  let recoverCalls = 0;
  const recovery: SessionRecovery = {
    getGeneration: () => 0,
    recover: async () => {
      recoverCalls += 1;
      return { generation: 1, expiresAt: Date.now() + 600_000 };
    },
  };
  const client = new HttpFetch(API_ORIGIN, {}, { mode: "server", recovery });
  const { adapter, configs } = createAdapter(() => ({ data: CHALLENGE_ENVELOPE }));
  client.axiosInstance.defaults.adapter = adapter;

  await assert.rejects(
    client.get("/offers"),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "ssr-unsupported",
  );

  assert.equal(configs.length, 1);
  assert.equal(recoverCalls, 0);
});

test("a caller cancellation during recovery never replays the request", async () => {
  const controller = new AbortController();
  let notifyStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    notifyStarted = resolve;
  });

  const recovery: SessionRecovery = {
    getGeneration: () => 0,
    recover: async ({ signal }) => {
      notifyStarted?.();
      await new Promise<never>((_resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }

        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      });

      return { generation: 1, expiresAt: Date.now() + 600_000 };
    },
  };

  const client = createClient(recovery);
  const { adapter, configs } = createAdapter(() => ({ data: CHALLENGE_ENVELOPE }));
  client.axiosInstance.defaults.adapter = adapter;

  const request = client.get("/offers", { signal: controller.signal });
  await started;
  controller.abort();

  await assert.rejects(request, (error) => axios.isCancel(error));
  assert.equal(configs.length, 1);
});

test("429 responses keep their existing error shape and do not start PoW", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter(() => ({
    data: { error: { code: "RATE_LIMITED" } },
    status: 429,
    headers: { "retry-after": "3" },
  }));
  client.axiosInstance.defaults.adapter = adapter;

  await assert.rejects(
    client.get("/offers"),
    (error: { status?: number; retryAfterMs?: number }) => {
      assert.equal(error.status, 429);
      assert.equal(error.retryAfterMs, 3_000);
      return true;
    },
  );

  assert.equal(configs.length, 1);
  assert.equal(starts.length, 0);
});

test("the query cache never receives a challenge envelope and retries are terminal", async () => {
  const { recovery } = createRecoverySpy();
  recovery.recover = async () => {
    throw new ProofOfWorkRecoveryError("solve-failed");
  };
  const client = createClient(recovery);
  const { adapter, configs } = createAdapter(() => ({ data: CHALLENGE_ENVELOPE }));
  client.axiosInstance.defaults.adapter = adapter;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: shouldRetryQuery } },
  });

  await assert.rejects(
    queryClient.fetchQuery({
      queryKey: ["challenge-test"],
      queryFn: () => client.get("/offers"),
    }),
    (error) => isProofOfWorkRecoveryError(error),
  );

  assert.equal(configs.length, 1);
  assert.equal(queryClient.getQueryData(["challenge-test"]), undefined);
  assert.ok(isProofOfWorkRecoveryError(queryClient.getQueryState(["challenge-test"])?.error));
});
