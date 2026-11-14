/// <reference lib="webworker" />

import { isPowSolveRequest } from "./protocol.ts";
import { solvePowRequest } from "./solve-core.ts";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<unknown>) => {
  if (!isPowSolveRequest(event.data)) {
    workerScope.postMessage({ type: "error", message: "Invalid proof-of-work request" });
    return;
  }

  workerScope.postMessage(solvePowRequest(event.data));
};
