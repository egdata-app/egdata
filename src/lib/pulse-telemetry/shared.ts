import { context as otelContext, SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";
import { logs, SeverityNumber, type Logger } from "@opentelemetry/api-logs";
import { resourceFromAttributes, type Resource } from "@opentelemetry/resources";
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
  ATTR_EXCEPTION_TYPE,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export const PULSE_SERVICE_NAME = "egdata.app";
export const PULSE_INSTRUMENTATION_NAME = "egdata.pulse-telemetry";
export const DEFAULT_PULSE_LOGS_ENDPOINT = "https://pulse.egdata.app/v1/logs";
export const DEFAULT_PULSE_TRACES_ENDPOINT = "https://pulse.egdata.app/v1/traces";

type PrimitiveAttributeValue = string | number | boolean;
type SanitizedAttributeValue = PrimitiveAttributeValue | string[] | number[] | boolean[];
type AttributeInput = PrimitiveAttributeValue | PrimitiveAttributeValue[] | null | undefined;

export type PulseRuntime = "browser" | "server";
export type PulseSeverity = "error" | "fatal";

export type CaptureContext = {
  attributes?: Record<string, AttributeInput>;
  dedupe?: boolean;
  fingerprint?: string;
  path?: string;
  request?: Request;
  route?: string;
  severity?: PulseSeverity;
  source?: string;
};

export type PulseTelemetryRegistration = {
  environment: string;
  forceFlushers: Array<() => Promise<void>>;
  release?: string;
  runtime: PulseRuntime;
};

type NormalizedError = {
  exception: {
    message: string;
    name: string;
    stack?: string;
  };
  originalError?: Error;
};

type PulseTelemetryState = PulseTelemetryRegistration & {
  logger: Logger;
};

let state: PulseTelemetryState | null = null;
const reportedBrowserErrors = new WeakSet<object>();

export function createPulseResource({
  environment,
  release,
  runtime,
}: Omit<PulseTelemetryRegistration, "forceFlushers">): Resource {
  return resourceFromAttributes({
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: environment,
    [ATTR_SERVICE_NAME]: PULSE_SERVICE_NAME,
    ...(release ? { [ATTR_SERVICE_VERSION]: release } : {}),
    "egdata.runtime": runtime,
  });
}

export function registerPulseTelemetry(registration: PulseTelemetryRegistration) {
  state = {
    ...registration,
    logger: logs.getLogger(PULSE_INSTRUMENTATION_NAME),
  };
}

export function captureError(error: unknown, captureContext: CaptureContext = {}) {
  if (!state || shouldSkipError(error, captureContext)) {
    return;
  }

  const normalized = normalizeError(error);
  const eventId = createEventId();
  const fingerprint =
    captureContext.fingerprint ?? createFingerprint(normalized, captureContext.source);
  const severity = captureContext.severity ?? "error";
  const attributes = buildAttributes({
    captureContext,
    eventId,
    fingerprint,
    normalized,
    severity,
  });
  const tracer = trace.getTracer(PULSE_INSTRUMENTATION_NAME);
  const span = tracer.startSpan("egdata.error", { attributes });
  const activeContext = trace.setSpan(otelContext.active(), span);

  span.recordException(normalized.originalError ?? normalized.exception);
  span.setStatus({ code: SpanStatusCode.ERROR, message: normalized.exception.message });

  state.logger.emit({
    attributes,
    body: normalized.exception.message,
    context: activeContext,
    eventName: "exception",
    exception: normalized.originalError ?? normalized.exception,
    observedTimestamp: Date.now(),
    severityNumber: severity === "fatal" ? SeverityNumber.FATAL : SeverityNumber.ERROR,
    severityText: severity.toUpperCase(),
    timestamp: Date.now(),
  });

  span.end();
}

export function captureMessage(message: string, captureContext: CaptureContext = {}) {
  captureError(new Error(message), {
    ...captureContext,
    dedupe: false,
  });
}

export async function flushPulseTelemetry() {
  if (!state) {
    return;
  }

  await Promise.allSettled(state.forceFlushers.map((forceFlush) => forceFlush()));
}

function shouldSkipError(error: unknown, captureContext: CaptureContext) {
  if (!state || state.runtime !== "browser" || captureContext.dedupe === false) {
    return false;
  }

  if (!isObject(error)) {
    return false;
  }

  if (reportedBrowserErrors.has(error)) {
    return true;
  }

  reportedBrowserErrors.add(error);
  return false;
}

function buildAttributes({
  captureContext,
  eventId,
  fingerprint,
  normalized,
  severity,
}: {
  captureContext: CaptureContext;
  eventId: string;
  fingerprint: string;
  normalized: NormalizedError;
  severity: PulseSeverity;
}): Attributes {
  const requestAttributes = getRequestAttributes(captureContext.request);
  const safePath = sanitizePath(captureContext.path) ?? getCurrentBrowserPath();
  const customAttributes = sanitizeCustomAttributes(captureContext.attributes);

  return {
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: state?.environment ?? "unknown",
    [ATTR_EXCEPTION_MESSAGE]: normalized.exception.message,
    [ATTR_EXCEPTION_TYPE]: normalized.exception.name,
    [ATTR_SERVICE_NAME]: PULSE_SERVICE_NAME,
    ...(state?.release ? { [ATTR_SERVICE_VERSION]: state.release } : {}),
    ...(normalized.exception.stack
      ? { [ATTR_EXCEPTION_STACKTRACE]: normalized.exception.stack }
      : {}),
    ...(captureContext.route ? { "egdata.route": truncate(captureContext.route, 512) } : {}),
    ...(safePath ? { "url.path": safePath } : {}),
    ...requestAttributes,
    ...customAttributes,
    "egdata.environment": state?.environment ?? "unknown",
    "egdata.error_event_id": eventId,
    "egdata.fingerprint": fingerprint,
    "egdata.release": state?.release ?? "unknown",
    "egdata.runtime": state?.runtime ?? "unknown",
    "egdata.severity": severity,
    "egdata.source": truncate(captureContext.source ?? "unknown", 256),
  };
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      exception: {
        message: truncate(error.message || error.name || "Error", 2048),
        name: truncate(error.name || "Error", 256),
        stack: sanitizeStack(error.stack),
      },
      originalError: error,
    };
  }

  if (isObject(error)) {
    const maybeError = error as { message?: unknown; name?: unknown; stack?: unknown };
    const message =
      typeof maybeError.message === "string" ? maybeError.message : describeUnknown(error);
    const name = typeof maybeError.name === "string" ? maybeError.name : "NonErrorException";
    const stack = typeof maybeError.stack === "string" ? maybeError.stack : undefined;

    return {
      exception: {
        message: truncate(message, 2048),
        name: truncate(name, 256),
        stack: sanitizeStack(stack),
      },
    };
  }

  return {
    exception: {
      message: truncate(describeUnknown(error), 2048),
      name: "NonErrorException",
    },
  };
}

function describeUnknown(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "undefined") {
    return "undefined";
  }

  return Object.prototype.toString.call(value);
}

function sanitizeCustomAttributes(attributes: CaptureContext["attributes"]): Attributes {
  if (!attributes) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(attributes)
      .map(([key, value]) => [sanitizeAttributeName(key), sanitizeAttributeValue(value)] as const)
      .filter(
        (
          entry,
        ): entry is readonly [string, NonNullable<ReturnType<typeof sanitizeAttributeValue>>] => {
          return !!entry[0] && typeof entry[1] !== "undefined";
        },
      ),
  );
}

function sanitizeAttributeName(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 128);
}

function sanitizeAttributeValue(value: AttributeInput): SanitizedAttributeValue | undefined {
  if (typeof value === "undefined" || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return truncate(value, 1024);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const sanitized = value
    .map((item) => sanitizeAttributeValue(item))
    .filter((item): item is PrimitiveAttributeValue => typeof item !== "undefined");

  if (sanitized.length === 0) {
    return undefined;
  }

  const firstType = typeof sanitized[0];
  const homogeneousValues = sanitized.filter((item) => typeof item === firstType).slice(0, 32);

  if (firstType === "string") {
    return homogeneousValues as string[];
  }

  if (firstType === "number") {
    return homogeneousValues as number[];
  }

  return homogeneousValues as boolean[];
}

function getRequestAttributes(request: Request | undefined): Attributes {
  if (!request) {
    return {};
  }

  return {
    "http.request.method": request.method,
    ...getUrlAttributes(request.url),
  };
}

function getUrlAttributes(urlValue: string | undefined): Attributes {
  if (!urlValue) {
    return {};
  }

  try {
    const url = new URL(urlValue);
    return {
      "server.address": url.hostname,
      "url.path": sanitizePath(url.pathname),
      "url.scheme": url.protocol.replace(":", ""),
    };
  } catch {
    return {};
  }
}

function getCurrentBrowserPath() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return sanitizePath(window.location.pathname);
}

function sanitizePath(path: string | undefined) {
  if (!path) {
    return undefined;
  }

  try {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return truncate(new URL(path).pathname, 1024);
    }
  } catch {
    return undefined;
  }

  const [withoutQuery] = path.split(/[?#]/, 1);
  return truncate(withoutQuery || "/", 1024);
}

function sanitizeStack(stack: string | undefined) {
  if (!stack) {
    return undefined;
  }

  const withoutUrlQueries = stack.replace(/https?:\/\/[^\s)]+/g, (match) => {
    try {
      const url = new URL(match);
      return `${url.origin}${url.pathname}`;
    } catch {
      return match;
    }
  });

  return truncate(withoutUrlQueries, 8000);
}

function createEventId() {
  const cryptoApi = globalThis.crypto as Crypto | undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function createFingerprint(normalized: NormalizedError, source: string | undefined) {
  const stackFrame = normalized.exception.stack?.split("\n").find((line) => line.trim()) ?? "";
  return `egdata-${hashString(
    [normalized.exception.name, normalized.exception.message, stackFrame, source ?? "unknown"].join(
      "|",
    ),
  )}`;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}

function isObject(value: unknown): value is object {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}
