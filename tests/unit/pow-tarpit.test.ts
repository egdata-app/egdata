import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { parse } from "graphql";
import { HttpFetch } from "../../src/lib/http-client.ts";
import { graphqlRequest } from "../../src/lib/graphql-request.ts";
import { AbuseTarpitError, isAbuseTarpitError } from "../../src/lib/pow/errors.ts";
import { shouldRetryQuery, shouldRetryQueryWithLimit } from "../../src/lib/pow/query-retry.ts";
import {
  clearRecoveryFailure,
  getRecoveryEventSnapshot,
} from "../../src/lib/pow/recovery-events.ts";
import { API_ORIGIN, createAdapter, createRecoverySpy } from "./pow-test-helpers.ts";

const tarpit = { status: 204, data: "", headers: { "X-Egdata-Mitigation": "tarpit" } };
const challenge = {
  data: { error: { code: "SESSION_CHALLENGE_REQUIRED", challengeUrl: "/auth/challenge" } },
};

for (const kind of ["REST", "GraphQL GET", "GraphQL POST"] as const) {
  test(`${kind} tarpit is a typed error with no recovery, retry, or successful cache entry`, async () => {
    clearRecoveryFailure();
    const { recovery, starts } = createRecoverySpy();
    const client = new HttpFetch(API_ORIGIN, {}, { mode: "browser", recovery });
    let blocked = true;
    const { adapter, configs } = createAdapter(() =>
      blocked
        ? tarpit
        : { data: kind === "REST" ? { id: "ok" } : { data: { offer: { id: "ok" } } } },
    );
    client.axiosInstance.defaults.adapter = adapter;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: shouldRetryQuery, gcTime: 0 } },
    });
    const options = {
      queryKey: ["tarpit", kind],
      queryFn: () =>
        kind === "REST"
          ? client.get("/offers/abc")
          : graphqlRequest(parse("query TarpitTest { offer { id } }"), undefined, {
              client,
              preferPost: kind === "GraphQL POST",
            }),
    };
    try {
      await assert.rejects(queryClient.fetchQuery(options), isAbuseTarpitError);
      assert.equal(configs.length, 1);
      assert.equal(starts.length, 0);
      assert.equal(queryClient.getQueryData(options.queryKey), undefined);
      assert.ok(isAbuseTarpitError(queryClient.getQueryState(options.queryKey)?.error));
      assert.equal(getRecoveryEventSnapshot().failureKind, "tarpit");
      assert.ok(getRecoveryEventSnapshot().failureId > 0);
      // Explicit user retry can succeed once the server stops mitigating.
      blocked = false;
      clearRecoveryFailure();
      await queryClient.fetchQuery(options);
      assert.equal(configs.length, 2);
      assert.equal(starts.length, 0);
      assert.ok(queryClient.getQueryData(options.queryKey));
    } finally {
      queryClient.clear();
      clearRecoveryFailure();
    }
  });
}

test("a tarpit after PoW replay is terminal and does not start another handshake", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = new HttpFetch(API_ORIGIN, {}, { mode: "browser", recovery });
  const { adapter, configs } = createAdapter((_config, i) => (i === 0 ? challenge : tarpit));
  client.axiosInstance.defaults.adapter = adapter;
  await assert.rejects(client.get("/offers/abc"), isAbuseTarpitError);
  assert.equal(configs.length, 2);
  assert.equal(starts.length, 1);
  clearRecoveryFailure();
});

test("SSR raises a tarpit error without creating browser notification or recovery state", async () => {
  clearRecoveryFailure();
  const before = getRecoveryEventSnapshot();
  const { recovery, starts } = createRecoverySpy();
  const client = new HttpFetch(API_ORIGIN, {}, { mode: "server", recovery });
  client.axiosInstance.defaults.adapter = createAdapter(() => tarpit).adapter;
  await assert.rejects(client.get("/offers/abc"), isAbuseTarpitError);
  assert.equal(starts.length, 0);
  assert.equal(getRecoveryEventSnapshot(), before);
});

test("ordinary 204s and marker-only 200s retain their existing behavior", async () => {
  const { recovery, starts } = createRecoverySpy();
  const client = new HttpFetch(API_ORIGIN, {}, { mode: "browser", recovery });
  for (const response of [
    { status: 204, data: "" },
    { status: 200, data: { id: "ok" }, headers: tarpit.headers },
  ]) {
    client.axiosInstance.defaults.adapter = createAdapter(() => response).adapter;
    assert.deepEqual(await client.delete("/reviews/abc"), response.data);
  }
  assert.equal(starts.length, 0);
});

test("retry helpers reject both live and serialized tarpit errors immediately", async () => {
  for (const error of [
    new AbuseTarpitError(),
    { name: "AbuseTarpitError", code: "ABUSE_TARPIT" },
  ]) {
    assert.ok(isAbuseTarpitError(error));
    assert.equal(shouldRetryQuery(0, error), false);
    assert.equal(shouldRetryQueryWithLimit(10)(0, error), false);
  }
  const client = new HttpFetch(API_ORIGIN, {}, { mode: "server", recovery: null });
  let calls = 0;
  await assert.rejects(
    client.retry(
      async () => {
        calls++;
        throw new AbuseTarpitError();
      },
      { retries: 3, delay: 0 },
    ),
    isAbuseTarpitError,
  );
  assert.equal(calls, 1);
});
