import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor, WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import {
  captureError,
  createPulseResource,
  DEFAULT_PULSE_LOGS_ENDPOINT,
  DEFAULT_PULSE_TRACES_ENDPOINT,
  flushPulseTelemetry,
  registerPulseTelemetry,
} from "./shared";

let initialized = false;

export function initPulseBrowserTelemetry() {
  if (initialized || typeof window === "undefined") {
    return initialized;
  }

  const projectKey = import.meta.env.VITE_PULSE_PROJECT_KEY;

  if (!projectKey) {
    return false;
  }

  initialized = true;

  const environment = import.meta.env.PROD ? "production" : "development";
  const release = import.meta.env.VITE_PULSE_RELEASE;
  const headers: Record<string, string> = {
    "x-pulse-project-key": projectKey,
  };

  if (import.meta.env.VITE_PULSE_PROJECT_ID) {
    headers["x-pulse-project-id"] = import.meta.env.VITE_PULSE_PROJECT_ID;
  }

  const resource = createPulseResource({
    environment,
    release,
    runtime: "browser",
  });
  const loggerProvider = new LoggerProvider({
    processors: [
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          headers,
          url: import.meta.env.VITE_PULSE_LOGS_ENDPOINT ?? DEFAULT_PULSE_LOGS_ENDPOINT,
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
  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          headers,
          url: import.meta.env.VITE_PULSE_TRACES_ENDPOINT ?? DEFAULT_PULSE_TRACES_ENDPOINT,
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
    runtime: "browser",
  });
  installBrowserErrorHandlers();

  return true;
}

export { captureError, flushPulseTelemetry };

function installBrowserErrorHandlers() {
  window.addEventListener("error", (event) => {
    captureError(event.error ?? event.message, {
      attributes: {
        "browser.error.filename": event.filename,
        "browser.error.lineno": event.lineno,
        "browser.error.colno": event.colno,
      },
      source: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureError(event.reason, {
      source: "window.unhandledrejection",
    });
  });

  window.addEventListener("pagehide", () => {
    void flushPulseTelemetry();
  });

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushPulseTelemetry();
    }
  });
}
