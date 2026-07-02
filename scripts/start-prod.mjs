#!/usr/bin/env node

import { createServer } from "node:http";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

process.env.NODE_ENV ||= "production";
process.env.TZ ||= "UTC";

const logger = createAsyncLogger();
const entryPath = resolve(process.cwd(), "dist/server/index.js");
const entryModule = await import(pathToFileURL(entryPath).href);
const serverEntry = entryModule.default ?? entryModule;

if (typeof serverEntry.fetch !== "function") {
  throw new TypeError(`No fetch handler exported from ${entryPath}`);
}

const handleRequest = composeMiddleware(serverEntry.fetch, serverEntry.middleware ?? []);
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const server = createServer((req, res) => {
  void handleNodeRequest(req, res);
});

server.on("clientError", (error, socket) => {
  if (!socket.writable) return;
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  logger.error(formatError(error));
});

server.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" || host === "::" ? "localhost" : host;
  logger.info(`Production server listening on http://${displayHost}:${port}`, { critical: true });
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close((error) => {
      if (error) {
        logger.error(formatError(error), { critical: true });
        void logger.close().finally(() => process.exit(1));
        return;
      }

      void logger.close().finally(() => process.exit(0));
    });
  });
}

async function handleNodeRequest(req, res) {
  const start = performance.now();
  const requestUrl = req.url ?? "/";
  const logOnce = once(() => logRequest(req, res, requestUrl, start));

  res.once("finish", logOnce);
  res.once("close", logOnce);

  try {
    const request = createWebRequest(req, res);
    const response = await handleRequest(request);
    await sendWebResponse(req, res, response);
  } catch (error) {
    logger.error(formatError(error), { critical: true });

    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    await sendWebResponse(
      req,
      res,
      new Response("Internal Server Error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }),
    );
  }
}

function once(fn) {
  let called = false;

  return (...args) => {
    if (called) return;
    called = true;
    fn(...args);
  };
}

function logRequest(req, res, requestUrl, start) {
  const duration = performance.now() - start;
  const encoding = res.getHeader("content-encoding");
  const length = res.getHeader("content-length");

  logger.request({
    durationMs: duration,
    encoding: typeof encoding === "string" ? encoding : null,
    length: parseContentLength(length),
    method: req.method,
    path: requestUrl,
    status: res.statusCode,
  });
}

function composeMiddleware(fetchHandler, middleware) {
  const handlers = Array.isArray(middleware) ? middleware : [];

  return function handle(request) {
    return callMiddleware(request, 0);
  };

  function callMiddleware(request, index) {
    if (index === handlers.length) return fetchHandler(request);
    return handlers[index](request, () => callMiddleware(request, index + 1));
  }
}

function createWebRequest(req, res) {
  const protocol = req.socket.encrypted ? "https" : "http";
  const hostHeader = req.headers.host || `localhost:${port}`;
  const url = new URL(req.url || "/", `${protocol}://${hostHeader}`);
  const init = {
    method: req.method,
    headers: createHeaders(req.headers),
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req;
    init.duplex = "half";
  }

  const request = new Request(url, init);
  request.ip = req.socket.remoteAddress;
  request.runtime = {
    name: "node",
    node: {
      req,
      res,
    },
  };

  return request;
}

function createHeaders(rawHeaders) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(rawHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  return headers;
}

async function sendWebResponse(req, res, response) {
  const prepared = prepareResponse(response);

  res.statusCode = prepared.status;
  if (prepared.statusText) res.statusMessage = prepared.statusText;
  setResponseHeaders(res, prepared.headers);

  if (req.method === "HEAD" || !prepared.body) {
    await endResponse(res);
    return;
  }

  await writeBody(res, prepared.body);
}

function prepareResponse(response) {
  if (typeof response._toNodeResponse === "function") {
    return response._toNodeResponse();
  }

  const headers = Array.from(response.headers.entries());
  const setCookies =
    typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];

  if (setCookies.length > 0) {
    for (let index = headers.length - 1; index >= 0; index--) {
      if (headers[index][0].toLowerCase() === "set-cookie") headers.splice(index, 1);
    }

    for (const cookie of setCookies) headers.push(["set-cookie", cookie]);
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers,
    body: response.body,
  };
}

function setResponseHeaders(res, headers) {
  const values = new Map();
  const setCookies = [];

  for (const [name, value] of headers) {
    if (name.toLowerCase() === "set-cookie") {
      setCookies.push(value);
      continue;
    }

    const existing = values.get(name);
    if (existing) {
      values.set(name, Array.isArray(existing) ? [...existing, value] : [existing, value]);
    } else {
      values.set(name, value);
    }
  }

  for (const [name, value] of values) {
    res.setHeader(name, value);
  }

  if (setCookies.length > 0) {
    res.setHeader("Set-Cookie", setCookies);
  }
}

function writeBody(res, body) {
  if (typeof body === "string" || body instanceof Uint8Array) {
    return endResponse(res, body);
  }

  if (body instanceof DataView) {
    return endResponse(res, new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
  }

  const stream = isNodeReadable(body) ? body : Readable.fromWeb(body);

  return new Promise((resolve, reject) => {
    stream.once("error", reject);
    res.once("error", reject);
    res.once("finish", resolve);
    res.once("close", resolve);
    stream.pipe(res);
  });
}

function endResponse(res, body) {
  return new Promise((resolve, reject) => {
    res.once("error", reject);
    res.once("finish", resolve);
    res.once("close", resolve);
    res.end(body);
  });
}

function isNodeReadable(body) {
  return body && typeof body.pipe === "function";
}

function createAsyncLogger() {
  const maxPending = Number.parseInt(process.env.PROD_LOGGER_MAX_PENDING ?? "10000", 10);
  const closeTimeoutMs = Number.parseInt(process.env.PROD_LOGGER_CLOSE_TIMEOUT_MS ?? "1000", 10);
  const worker = new Worker(new URL("./prod-logger-worker.mjs", import.meta.url));
  let pending = 0;
  let dropped = 0;
  let closed = false;
  let failed = false;

  worker.unref();
  worker.on("message", (message) => {
    if (message?.type === "flushed") {
      pending = Math.max(0, pending - message.count);
    }
  });
  worker.on("error", () => {
    failed = true;
  });
  worker.on("exit", (code) => {
    if (code !== 0) failed = true;
  });

  return {
    info(line, options = {}) {
      write({ level: "info", line }, options);
    },
    error(line, options = {}) {
      write({ level: "error", line }, { ...options, critical: true });
    },
    request(request) {
      write({ level: "request", request });
    },
    close() {
      closed = true;

      return new Promise((resolveClose) => {
        const timer = setTimeout(() => {
          void worker.terminate().finally(resolveClose);
        }, closeTimeoutMs);
        timer.unref();

        worker.on("message", function handleDrain(message) {
          if (message?.type !== "drained") return;
          clearTimeout(timer);
          worker.off("message", handleDrain);
          void worker.terminate().finally(resolveClose);
        });

        try {
          worker.postMessage({ type: "shutdown" });
        } catch {
          clearTimeout(timer);
          void worker.terminate().finally(resolveClose);
        }
      });
    },
  };

  function write(payload, options = {}) {
    if (closed || failed) return;

    const critical = options.critical === true;
    if (!critical && pending >= maxPending) {
      dropped++;
      return;
    }

    if (dropped > 0) {
      post({
        level: "warn",
        line: `dropped ${dropped} request log lines`,
      });
      dropped = 0;
    }

    post(payload);
  }

  function post(payload) {
    try {
      pending++;
      worker.postMessage({
        ...payload,
        type: "log",
      });
    } catch {
      pending = Math.max(0, pending - 1);
      failed = true;
    }
  }
}

function formatError(error) {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

function parseContentLength(length) {
  if (typeof length === "number") return length;
  if (typeof length !== "string") return null;

  const parsed = Number.parseInt(length, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
