import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  captureError,
  createPulseResource,
  DEFAULT_PULSE_LOGS_ENDPOINT,
  DEFAULT_PULSE_TRACES_ENDPOINT,
  flushPulseTelemetry,
  registerPulseTelemetry,
} from "./shared";

let initialized = false;

export function initPulseServerTelemetry() {
  if (initialized || typeof process === "undefined") {
    return initialized;
  }

  const serverToken = process.env.PULSE_SERVER_TOKEN;

  if (!serverToken) {
    return false;
  }

  initialized = true;

  const environment = process.env.NODE_ENV || (import.meta.env.PROD ? "production" : "development");
  const release = process.env.PULSE_RELEASE;
  const headers: Record<string, string> = {
    authorization: `Bearer ${serverToken}`,
  };

  if (process.env.PULSE_PROJECT_ID) {
    headers["x-pulse-project-id"] = process.env.PULSE_PROJECT_ID;
  }

  const resource = createPulseResource({
    environment,
    release,
    runtime: "server",
  });
  const loggerProvider = new LoggerProvider({
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          headers,
          url: process.env.PULSE_LOGS_ENDPOINT ?? DEFAULT_PULSE_LOGS_ENDPOINT,
        }),
        {
          exportTimeoutMillis: 3_000,
          maxExportBatchSize: 10,
          maxQueueSize: 100,
          scheduledDelayMillis: 1_000,
        },
      ),
    ],
    resource,
  });
  const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          headers,
          url: process.env.PULSE_TRACES_ENDPOINT ?? DEFAULT_PULSE_TRACES_ENDPOINT,
        }),
        {
          exportTimeoutMillis: 3_000,
          maxExportBatchSize: 10,
          maxQueueSize: 100,
          scheduledDelayMillis: 1_000,
        },
      ),
    ],
  });

  logs.setGlobalLoggerProvider(loggerProvider);
  tracerProvider.register();
  registerPulseTelemetry({
    environment,
    forceFlushers: [() => loggerProvider.forceFlush(), () => tracerProvider.forceFlush()],
    release,
    runtime: "server",
  });
  installProcessErrorHandlers();

  return true;
}

export { captureError, flushPulseTelemetry };

function installProcessErrorHandlers() {
  const processWithGuard = process as NodeJS.Process & {
    __egdataPulseHandlersInstalled?: boolean;
  };

  if (processWithGuard.__egdataPulseHandlersInstalled) {
    return;
  }

  processWithGuard.__egdataPulseHandlersInstalled = true;

  process.on("unhandledRejection", (reason) => {
    captureError(reason, {
      source: "process.unhandledRejection",
    });
    void flushPulseTelemetry();
  });

  process.on("uncaughtExceptionMonitor", (error) => {
    captureError(error, {
      severity: "fatal",
      source: "process.uncaughtException",
    });
    void flushPulseTelemetry();
  });
}
