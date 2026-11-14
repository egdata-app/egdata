import assert from "node:assert/strict";
import test from "node:test";
import { ProofOfWorkRecoveryError } from "../../src/lib/pow/errors.ts";
import {
  DEFAULT_QUERY_RETRY_COUNT,
  shouldRetryQuery,
  shouldRetryQueryWithLimit,
} from "../../src/lib/pow/query-retry.ts";

test("does not retry typed proof-of-work recovery failures", () => {
  assert.equal(shouldRetryQuery(0, new ProofOfWorkRecoveryError("solve-failed")), false);
  assert.equal(shouldRetryQuery(0, new ProofOfWorkRecoveryError("challenged-again")), false);
  assert.equal(shouldRetryQueryWithLimit(1)(0, new ProofOfWorkRecoveryError("timeout")), false);
});

test("preserves bounded retry behavior for ordinary errors", () => {
  assert.equal(shouldRetryQuery(0, new Error("network")), true);
  assert.equal(shouldRetryQuery(DEFAULT_QUERY_RETRY_COUNT - 1, new Error("network")), true);
  assert.equal(shouldRetryQuery(DEFAULT_QUERY_RETRY_COUNT, new Error("network")), false);

  const retryOnce = shouldRetryQueryWithLimit(1);
  assert.equal(retryOnce(0, new Error("network")), true);
  assert.equal(retryOnce(1, new Error("network")), false);
});
