import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerProofSolver, type WorkerEndpoint } from "../../src/lib/pow/browser-solver.ts";
import { isProofOfWorkRecoveryError } from "../../src/lib/pow/errors.ts";
import type { PowSolveRequest } from "../../src/lib/pow/protocol.ts";
import { solvePowRequest } from "../../src/lib/pow/solve-core.ts";
import { TEST_CHALLENGE, TEST_NONCE } from "./pow-test-helpers.ts";

type FakeWorker = {
  endpoint: WorkerEndpoint;
  terminated: () => number;
};

function fakeWorker(onPost: (message: unknown, endpoint: WorkerEndpoint) => void): FakeWorker {
  let terminateCount = 0;
  let endpoint: WorkerEndpoint;

  endpoint = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage: (message: unknown) => onPost(message, endpoint),
    terminate: () => {
      terminateCount += 1;
    },
  };

  return {
    endpoint,
    terminated: () => terminateCount,
  };
}

test("runs a valid solve in a worker, verifies the proof and terminates the worker", async () => {
  const worker = fakeWorker((message) => {
    const response = solvePowRequest(message as PowSolveRequest);
    setTimeout(() => {
      worker.endpoint.onmessage?.({ data: response } as MessageEvent);
    }, 0);
  });
  const solver = createWorkerProofSolver(
    () => worker.endpoint,
    () => Date.now(),
  );

  const nonce = await solver({
    challenge: TEST_CHALLENGE,
    difficulty: 16,
    deadline: Date.now() + 5_000,
  });

  assert.equal(nonce, TEST_NONCE);
  assert.equal(worker.terminated(), 1);
});

test("rejects a worker result that does not satisfy the proof and terminates it", async () => {
  const worker = fakeWorker((_message, endpoint) => {
    setTimeout(() => {
      endpoint.onmessage?.({ data: { type: "solved", nonce: "bad nonce!" } } as MessageEvent);
    }, 0);
  });
  const solver = createWorkerProofSolver(
    () => worker.endpoint,
    () => Date.now(),
  );

  await assert.rejects(
    solver({
      challenge: TEST_CHALLENGE,
      difficulty: 16,
      deadline: Date.now() + 5_000,
    }),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "solve-failed",
  );

  assert.equal(worker.terminated(), 1);
});

test("surfaces worker errors and terminates the worker", async () => {
  const worker = fakeWorker((_message, endpoint) => {
    setTimeout(() => {
      endpoint.onerror?.({ preventDefault() {} } as ErrorEvent);
    }, 0);
  });
  const solver = createWorkerProofSolver(
    () => worker.endpoint,
    () => Date.now(),
  );

  await assert.rejects(
    solver({
      challenge: TEST_CHALLENGE,
      difficulty: 16,
      deadline: Date.now() + 5_000,
    }),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "solve-failed",
  );

  assert.equal(worker.terminated(), 1);
});

test("bounds a stalled worker by the solve deadline and terminates it", async () => {
  const worker = fakeWorker(() => {});
  const solver = createWorkerProofSolver(
    () => worker.endpoint,
    () => Date.now(),
  );

  await assert.rejects(
    solver({
      challenge: TEST_CHALLENGE,
      difficulty: 16,
      deadline: Date.now() + 5,
    }),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "solve-timeout",
  );

  assert.equal(worker.terminated(), 1);
});

test("cancellation terminates the worker and rejects with an abort error", async () => {
  const worker = fakeWorker(() => {});
  const solver = createWorkerProofSolver(
    () => worker.endpoint,
    () => Date.now(),
  );
  const controller = new AbortController();

  const solving = solver({
    challenge: TEST_CHALLENGE,
    difficulty: 16,
    deadline: Date.now() + 5_000,
    signal: controller.signal,
  });

  controller.abort();

  await assert.rejects(solving, (error) => {
    assert.equal((error as Error).name, "AbortError");
    return true;
  });

  assert.equal(worker.terminated(), 1);
});

test("does not create a worker when the deadline already passed", async () => {
  let factoryCalls = 0;
  const worker = fakeWorker(() => {});
  const solver = createWorkerProofSolver(
    () => {
      factoryCalls += 1;
      return worker.endpoint;
    },
    () => Date.now(),
  );

  await assert.rejects(
    solver({
      challenge: TEST_CHALLENGE,
      difficulty: 16,
      deadline: Date.now() - 1,
    }),
    (error) => isProofOfWorkRecoveryError(error) && error.reason === "solve-timeout",
  );

  assert.equal(factoryCalls, 0);
  assert.equal(worker.terminated(), 0);
});
