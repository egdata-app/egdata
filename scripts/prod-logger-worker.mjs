import { formatWithOptions } from "node:util";
import { parentPort } from "node:worker_threads";
import { createConsola } from "consola";

const outputQueue = [];
let flushing = false;
let shutdownRequested = false;

const logger = createConsola({
  reporters: [
    {
      log(logObject) {
        const stream = logObject.level < 2 ? process.stderr : process.stdout;
        enqueueOutput(stream, formatLogObject(logObject));
      },
    },
  ],
});

parentPort.on("message", (message) => {
  if (message?.type === "shutdown") {
    shutdownRequested = true;
    scheduleFlush();
    return;
  }

  if (message?.type !== "log") return;

  writeLogMessage(message);
});

function writeLogMessage(message) {
  if (message.level === "request") {
    logger.withTag("http").info(formatRequest(message.request));
    return;
  }

  const taggedLogger = logger.withTag(message.tag || "server");
  const level = message.level === "error" || message.level === "warn" ? message.level : "info";
  taggedLogger[level](message.line);
}

function formatRequest(request) {
  const parts = [
    request.method,
    String(request.status),
    request.path,
    `${request.durationMs.toFixed(2)}ms`,
  ];

  if (request.encoding) parts.push(`enc=${request.encoding}`);
  if (request.length) parts.push(`len=${formatBytes(request.length)}`);

  return parts.join(" ");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatLogObject(logObject) {
  const time = logObject.date.toISOString().slice(11, 23);
  const level = getLevelLabel(logObject.type).padEnd(4);
  const tag = (logObject.tag || "server").padEnd(7);
  const message = formatWithOptions({ colors: false }, ...logObject.args);

  return prefixMultiline(`${time} ${level} ${tag} ${message}`);
}

function getLevelLabel(type) {
  switch (type) {
    case "error":
    case "fatal":
      return "ERR";
    case "warn":
      return "WARN";
    case "success":
    case "ready":
      return "OK";
    case "debug":
      return "DBG";
    case "trace":
      return "TRC";
    case "info":
      return "INFO";
    default:
      return type.toUpperCase().slice(0, 4);
  }
}

function prefixMultiline(line) {
  return line.replaceAll("\n", "\n  ");
}

function enqueueOutput(stream, line) {
  outputQueue.push({ line, stream });
  scheduleFlush();
}

function scheduleFlush() {
  if (flushing) return;
  flushing = true;
  setImmediate(flush);
}

function flush() {
  let flushed = 0;

  while (outputQueue.length > 0) {
    const entry = outputQueue[0];

    if (!entry.stream.write(`${entry.line}\n`)) {
      entry.stream.once("drain", flush);
      if (flushed > 0) parentPort.postMessage({ type: "flushed", count: flushed });
      return;
    }

    outputQueue.shift();
    flushed++;
  }

  flushing = false;
  if (flushed > 0) parentPort.postMessage({ type: "flushed", count: flushed });
  if (shutdownRequested) parentPort.postMessage({ type: "drained" });
}
