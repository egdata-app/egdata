import axios, {
  AxiosHeaders,
  CanceledError,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { parseRetryAfterMs } from "./pow/challenge.ts";
import {
  AbuseTarpitError,
  ProofOfWorkRecoveryError,
  isAbortLikeError,
  isAbuseTarpitError,
  isProofOfWorkRecoveryError,
  isSessionChallengeEnvelope,
} from "./pow/errors.ts";
import { clearRecoveryFailure, reportRecoveryFailure } from "./pow/recovery-events.ts";
import type { SessionRecovery } from "./pow/session-recovery.ts";
import { readSsrClientIdentity } from "./ssr-client-identity.ts";

type ParameterValue = string | number | boolean | undefined | null;

export interface FetchOptions extends AxiosRequestConfig {
  params?: Record<string, ParameterValue>;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface HttpError extends Error {
  response?: unknown;
  status?: number;
  retryAfterMs?: number;
}

export interface V1Envelope<T, M = Record<string, unknown>> {
  data: T;
  meta: M;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

type BufferedBody = {
  replayable: boolean;
  data: unknown;
};

export type HttpFetchRuntime = {
  mode?: "browser" | "server";
  /** Request-scoped identity provider; never put visitor headers in Axios defaults. */
  serverRequestIdentity?: () => Promise<Record<string, string>>;
  /**
   * Test/advanced seam. `undefined` enables the lazy browser coordinator,
   * `null` disables recovery for this instance.
   */
  recovery?: SessionRecovery | null;
  /** Optional fixed `/v1` API key (overrides ephemeral `egw_` browser tokens). */
  fixedApiKey?: string | null;
  /** Enable verbose request start/completion logging. */
  debug?: boolean;
};

type EnvBag = {
  SSR?: boolean;
  VITE_API_ENDPOINT?: string;
  VITE_V1_API_KEY?: string;
  VITE_HTTP_DEBUG?: string;
  API_ENDPOINT?: string;
};

const SLOW_REQUEST_THRESHOLD_MS = 2_000;

function readEnv(): EnvBag {
  let ssr: boolean | undefined;
  let viteApiEndpoint: string | undefined;
  let viteV1ApiKey: string | undefined;
  let viteHttpDebug: string | undefined;
  let apiEndpoint: string | undefined;

  try {
    ssr = import.meta.env.SSR;
  } catch {
    ssr = undefined;
  }
  try {
    viteApiEndpoint = import.meta.env.VITE_API_ENDPOINT;
  } catch {
    viteApiEndpoint = undefined;
  }
  try {
    viteV1ApiKey = import.meta.env.VITE_V1_API_KEY;
  } catch {
    viteV1ApiKey = undefined;
  }
  try {
    viteHttpDebug = import.meta.env.VITE_HTTP_DEBUG;
  } catch {
    viteHttpDebug = undefined;
  }
  try {
    apiEndpoint = (import.meta.env as EnvBag).API_ENDPOINT;
  } catch {
    apiEndpoint = undefined;
  }

  return {
    SSR: ssr,
    VITE_API_ENDPOINT:
      viteApiEndpoint ??
      (typeof process !== "undefined" && process.env ? process.env.VITE_API_ENDPOINT : undefined),
    VITE_V1_API_KEY:
      viteV1ApiKey ??
      (typeof process !== "undefined" && process.env ? process.env.VITE_V1_API_KEY : undefined),
    VITE_HTTP_DEBUG:
      viteHttpDebug ??
      (typeof process !== "undefined" && process.env
        ? (process.env.HTTP_DEBUG ?? process.env.VITE_HTTP_DEBUG)
        : undefined),
    API_ENDPOINT: apiEndpoint,
  };
}

function detectServer(env: EnvBag): boolean {
  if (env.SSR === true) {
    return true;
  }

  return typeof window === "undefined";
}

function resolveBaseUrl(env: EnvBag, server: boolean): string {
  if (server) {
    const nodeEndpoint =
      typeof process !== "undefined" && process.env ? process.env.API_ENDPOINT : undefined;

    return nodeEndpoint ?? env.API_ENDPOINT ?? "https://api.egdata.app";
  }

  return env.VITE_API_ENDPOINT ?? "https://api.egdata.app";
}

function resolveApiOrigin(baseUrl: string): string | null {
  try {
    const base = typeof window !== "undefined" ? window.location.href : undefined;
    const url = new URL(baseUrl || "/", base);

    return url.origin;
  } catch {
    return null;
  }
}

function isReadableStreamLike(value: object): boolean {
  const candidate = value as {
    getReader?: unknown;
    pipe?: unknown;
    [Symbol.asyncIterator]?: unknown;
  };

  return (
    typeof candidate.getReader === "function" ||
    typeof candidate.pipe === "function" ||
    typeof candidate[Symbol.asyncIterator] === "function"
  );
}

function cloneFormData(data: FormData): FormData {
  const copy = new FormData();

  for (const [key, value] of data.entries()) {
    copy.append(key, value);
  }

  return copy;
}

function bufferReplayableBody(data: unknown): BufferedBody {
  if (data === undefined || data === null) {
    return { replayable: true, data };
  }

  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return { replayable: true, data };
  }

  if (typeof FormData !== "undefined" && data instanceof FormData) {
    try {
      return { replayable: true, data: cloneFormData(data) };
    } catch {
      return { replayable: false, data };
    }
  }

  if (typeof File !== "undefined" && data instanceof File) {
    try {
      return {
        replayable: true,
        data: new File([data], data.name, {
          type: data.type,
          lastModified: data.lastModified,
        }),
      };
    } catch {
      return { replayable: false, data };
    }
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      return { replayable: true, data: data.slice(0, data.size, data.type) };
    } catch {
      return { replayable: false, data };
    }
  }

  if (data instanceof ArrayBuffer) {
    try {
      return { replayable: true, data: data.slice(0) };
    } catch {
      return { replayable: false, data };
    }
  }

  if (ArrayBuffer.isView(data)) {
    try {
      const view = data as ArrayBufferView;
      const copy = new Uint8Array(view.byteLength);
      copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));

      return { replayable: true, data: copy };
    } catch {
      return { replayable: false, data };
    }
  }

  if (typeof URLSearchParams !== "undefined" && data instanceof URLSearchParams) {
    return { replayable: true, data: new URLSearchParams(data.toString()) };
  }

  if (typeof data === "object") {
    if (isReadableStreamLike(data)) {
      return { replayable: false, data };
    }

    try {
      const candidate = data as {
        toJSON?: unknown;
        constructor?: { name?: string };
      };

      if (typeof candidate.toJSON === "function") {
        return { replayable: true, data: candidate.toJSON() };
      }

      const ctorName = candidate.constructor?.name;
      if (ctorName && ctorName !== "Object" && ctorName !== "Array") {
        return { replayable: false, data };
      }

      return { replayable: true, data: JSON.parse(JSON.stringify(data)) };
    } catch {
      return { replayable: false, data };
    }
  }

  return { replayable: false, data };
}

export class HttpFetch {
  public axiosInstance: AxiosInstance;
  private initializationPromise: Promise<void>;
  public readonly mode: "browser" | "server";
  public readonly apiOrigin: string | null;
  private readonly injectedRecovery: SessionRecovery | null | undefined;
  private recoveryInstance: SessionRecovery | null = null;
  private recoveryPromise: Promise<SessionRecovery | null> | null = null;
  private readonly serverRequestIdentity: () => Promise<Record<string, string>>;

  private readonly fixedApiKey: string | null;
  private webApiKey: string | null = null;
  private webApiKeyExpiresAt: number | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private debug: boolean;

  constructor(baseURL = "", defaultOptions: FetchOptions = {}, runtime: HttpFetchRuntime = {}) {
    const env = readEnv();
    const mode = runtime.mode ?? (detectServer(env) ? "server" : "browser");
    this.mode = mode;
    this.apiOrigin = resolveApiOrigin(baseURL);
    this.injectedRecovery = runtime.recovery;
    this.serverRequestIdentity = runtime.serverRequestIdentity ?? readSsrClientIdentity;

    const rawFixedKey =
      runtime.fixedApiKey !== undefined
        ? runtime.fixedApiKey
        : mode === "server" && typeof process !== "undefined" && process.env
          ? (process.env.V1_API_KEY ?? env.VITE_V1_API_KEY)
          : env.VITE_V1_API_KEY;
    this.fixedApiKey =
      typeof rawFixedKey === "string" && rawFixedKey.trim() ? rawFixedKey.trim() : null;
    this.debug = runtime.debug ?? (env.VITE_HTTP_DEBUG === "1" || env.VITE_HTTP_DEBUG === "true");

    const config: AxiosRequestConfig = {
      baseURL,
      headers: defaultOptions.headers,
      timeout: defaultOptions.timeout ?? 10_000,
      withCredentials: defaultOptions.withCredentials ?? true,
    };

    // Initialize with basic config first
    this.axiosInstance = axios.create(config);

    // Handle async initialization for Node.js environment
    this.initializationPromise = (async () => {
      if (
        mode === "server" &&
        typeof process !== "undefined" &&
        typeof process.getBuiltinModule === "function"
      ) {
        const http = process.getBuiltinModule("node:http") as typeof import("node:http");
        const https = process.getBuiltinModule("node:https") as typeof import("node:https");

        // Create new instance with agents
        this.axiosInstance = axios.create({
          ...config,
          httpAgent: new http.Agent({ keepAlive: true }),
          httpsAgent: new https.Agent({ keepAlive: true }),
        });
      }
    })();
  }

  private async ensureInitialized() {
    await this.initializationPromise;
  }

  public setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  public isDebugEnabled(): boolean {
    if (this.debug) {
      return true;
    }
    if (this.mode === "browser" && typeof window !== "undefined") {
      try {
        return window.localStorage?.getItem("egdata:http-debug") === "1";
      } catch {
        return false;
      }
    }
    return false;
  }

  public getAuthSummary(): "fixed-api-key" | "ssr-worker-headers" | "ephemeral-web-token" {
    if (this.fixedApiKey) {
      return "fixed-api-key";
    }
    return this.mode === "server" ? "ssr-worker-headers" : "ephemeral-web-token";
  }

  private getV1AuthMode(
    endpoint: string,
    options: FetchOptions,
  ): "fixed-api-key" | "ssr-worker-headers" | "ephemeral-web-token" | "none" {
    if (!this.isTrustedV1Request(endpoint, options)) {
      return "none";
    }
    return this.getAuthSummary();
  }

  private formatRequestTarget(endpoint: string, params?: Record<string, ParameterValue>): string {
    if (!params) {
      return endpoint;
    }
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    if (!query) {
      return endpoint;
    }
    return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${query}`;
  }

  private extractAxiosErrorDetails(axiosError: AxiosError): Record<string, unknown> {
    const errorData = axiosError.response?.data;
    const dataObj =
      errorData && typeof errorData === "object" ? (errorData as Record<string, unknown>) : null;
    const rawDetail =
      typeof errorData === "string"
        ? errorData
        : (dataObj?.detail ?? dataObj?.message ?? dataObj?.error ?? dataObj?.title);
    const detail =
      typeof rawDetail === "string"
        ? rawDetail.slice(0, 300)
        : rawDetail !== undefined
          ? String(rawDetail).slice(0, 300)
          : undefined;
    const headers = axiosError.response?.headers as
      | { get?: (name: string) => string | null; [key: string]: unknown }
      | undefined;
    const headerRequestId =
      typeof headers?.get === "function" ? headers.get("x-request-id") : headers?.["x-request-id"];
    const requestId =
      typeof dataObj?.requestId === "string"
        ? dataObj.requestId
        : typeof headerRequestId === "string"
          ? headerRequestId
          : undefined;

    return {
      status: axiosError.response?.status ?? null,
      axiosCode: axiosError.code,
      message: axiosError.message,
      ...(typeof dataObj?.code === "string" ? { responseCode: dataObj.code } : {}),
      ...(detail ? { detail } : {}),
      ...(requestId ? { requestId } : {}),
      ...(axiosError.code === "ERR_NETWORK" && !axiosError.response
        ? { hint: "Network or CORS preflight failure" }
        : {}),
    };
  }

  public setWebApiKey(token: string | null, expiresAt?: number | null): void {
    if (this.fixedApiKey) {
      return;
    }

    this.webApiKey = token;
    if (expiresAt !== undefined && expiresAt !== null) {
      this.webApiKeyExpiresAt = expiresAt;
      return;
    }

    if (token?.startsWith("egw_")) {
      try {
        const payloadB64 = token.slice(4).split(".")[0];
        if (payloadB64) {
          let jsonStr: string;
          if (typeof Buffer !== "undefined") {
            jsonStr = Buffer.from(payloadB64, "base64url").toString("utf8");
          } else {
            let b64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4) {
              b64 += "=";
            }
            jsonStr = atob(b64);
          }
          const payload = JSON.parse(jsonStr) as { exp?: number };
          if (typeof payload.exp === "number") {
            this.webApiKeyExpiresAt = payload.exp;
            return;
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    this.webApiKeyExpiresAt = null;
  }

  public getWebApiKey(): string | null {
    return this.fixedApiKey ?? this.webApiKey;
  }

  private isV1Endpoint(endpoint: string): boolean {
    if (!endpoint) return false;
    if (endpoint === "/v1" || endpoint === "v1") return true;
    if (endpoint.startsWith("/v1/") || endpoint.startsWith("v1/")) return true;
    try {
      const url = new URL(endpoint, "https://api.egdata.app");
      return url.pathname === "/v1" || url.pathname.startsWith("/v1/");
    } catch {
      return endpoint.includes("/v1/") || endpoint.endsWith("/v1");
    }
  }

  private getTrustedOrigins(): Set<string> {
    const trusted = new Set<string>();
    trusted.add("https://api.egdata.app");
    trusted.add("https://origin-api.egdata.app");

    const addOrigin = (rawUrl?: string | null) => {
      if (!rawUrl || typeof rawUrl !== "string") return;
      try {
        const parsed = new URL(rawUrl);
        trusted.add(parsed.origin.toLowerCase());
      } catch {
        // Ignore non-URL strings
      }
    };

    addOrigin(this.apiOrigin);
    addOrigin(this.axiosInstance.defaults.baseURL);
    if (typeof process !== "undefined" && process.env) {
      addOrigin(process.env.API_ENDPOINT);
    }
    const env = readEnv();
    if (env.VITE_API_ENDPOINT) {
      addOrigin(env.VITE_API_ENDPOINT);
    }
    return trusted;
  }

  private isOriginTrusted(urlStr: string): boolean {
    try {
      const url = new URL(urlStr);
      const origin = url.origin.toLowerCase();
      const trustedOrigins = this.getTrustedOrigins();
      if (trustedOrigins.has(origin)) {
        return true;
      }

      const isNonProd =
        typeof process !== "undefined" && process.env
          ? process.env.NODE_ENV !== "production"
          : true;
      if (
        isNonProd &&
        (url.protocol === "http:" || url.protocol === "https:") &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  private isTrustedV1Request(endpoint: string, config: AxiosRequestConfig): boolean {
    if (!this.isV1Endpoint(endpoint)) {
      return false;
    }

    const trimmed = endpoint.trim();
    const isAbsolute =
      trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//");

    const targetUrlStr = isAbsolute
      ? trimmed.startsWith("//")
        ? `https:${trimmed}`
        : trimmed
      : null;

    const baseURL = (
      config.baseURL ||
      this.axiosInstance.defaults.baseURL ||
      this.apiOrigin ||
      ""
    ).trim();

    if (!targetUrlStr) {
      if (!baseURL) {
        return true;
      }
      const isBaseAbsolute =
        baseURL.startsWith("http://") || baseURL.startsWith("https://") || baseURL.startsWith("//");
      if (!isBaseAbsolute) {
        return true;
      }
      return this.isOriginTrusted(baseURL.startsWith("//") ? `https:${baseURL}` : baseURL);
    }

    return this.isOriginTrusted(targetUrlStr);
  }

  private normalizeV1Endpoint(endpoint: string): string {
    if (
      endpoint.startsWith("/v1/") ||
      endpoint.startsWith("v1/") ||
      endpoint === "/v1" ||
      endpoint === "v1" ||
      endpoint.startsWith("http://") ||
      endpoint.startsWith("https://")
    ) {
      return endpoint;
    }
    return endpoint.startsWith("/") ? `/v1${endpoint}` : `/v1/${endpoint}`;
  }

  public async refreshWebApiKey(callerSignal?: AbortSignal): Promise<string | null> {
    if (callerSignal?.aborted) {
      throw callerSignal.reason ?? new DOMException("Aborted", "AbortError");
    }

    if (this.fixedApiKey) {
      return this.fixedApiKey;
    }

    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const timeoutSignal = AbortSignal.timeout(5_000);
        try {
          const response = await fetch("/api/web-token", {
            method: "GET",
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            signal: timeoutSignal,
          });

          if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            console.error("[http-client] web-token fetch failed", {
              status: response.status,
              statusText: response.statusText,
              ...(errorBody ? { body: errorBody.slice(0, 300) } : {}),
            });
            return null;
          }

          const data = (await response.json()) as {
            token?: string | null;
            expiresAt?: number | null;
          };

          if (data?.token) {
            this.setWebApiKey(data.token, data.expiresAt);
            return data.token;
          }
          console.warn("[http-client] web-token response did not contain a token");
          return null;
        } catch (err) {
          console.error("[http-client] failed to refresh webApiKey", err);
          return null;
        } finally {
          this.refreshPromise = null;
        }
      })();
    }

    const sharedPromise = this.refreshPromise;
    if (!callerSignal) {
      return sharedPromise;
    }

    return new Promise<string | null>((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(callerSignal.reason ?? new DOMException("Aborted", "AbortError"));
      };

      const cleanup = () => {
        callerSignal.removeEventListener("abort", onAbort);
      };

      callerSignal.addEventListener("abort", onAbort, { once: true });

      sharedPromise
        .then((res) => {
          cleanup();
          resolve(res);
        })
        .catch((err) => {
          cleanup();
          reject(err);
        });
    });
  }

  private async getRecovery(): Promise<SessionRecovery | null> {
    if (this.mode !== "browser") {
      return null;
    }

    if (this.injectedRecovery !== undefined) {
      return this.injectedRecovery;
    }

    if (this.recoveryInstance) {
      return this.recoveryInstance;
    }

    if (!this.apiOrigin) {
      return null;
    }

    if (!this.recoveryPromise) {
      const load = import("./pow/browser-recovery.ts")
        .then(({ createBrowserSessionRecovery }) =>
          createBrowserSessionRecovery(this.apiOrigin as string),
        )
        .then((recovery) => {
          this.recoveryInstance = recovery;
          return recovery;
        });

      const promise = load.catch(() => {
        if (this.recoveryPromise === promise) {
          this.recoveryPromise = null;
        }

        return null;
      });

      this.recoveryPromise = promise;
    }

    return this.recoveryPromise;
  }

  private currentGeneration(): number {
    if (this.mode !== "browser") {
      return 0;
    }

    const recovery = this.recoveryInstance ?? this.injectedRecovery;

    return recovery?.getGeneration() ?? 0;
  }

  private notifyFailure(): void {
    if (this.mode === "browser") {
      reportRecoveryFailure();
    }
  }

  private rejectTarpit(
    response: Pick<AxiosResponse, "status" | "headers">,
    context?: { method: HttpMethod; target: string; durationMs: number },
  ): void {
    if (response.status !== 204) return;
    const marker =
      response.headers instanceof AxiosHeaders
        ? response.headers.get("x-egdata-mitigation")
        : Object.entries(response.headers).find(
            ([name]) => name.toLowerCase() === "x-egdata-mitigation",
          )?.[1];
    if (marker === "tarpit") {
      console.error("[http-client] tarpit mitigation response", {
        ...context,
        mode: this.mode,
      });
      if (this.mode === "browser") reportRecoveryFailure("tarpit");
      throw new AbuseTarpitError();
    }
  }

  private async requestConfig(
    method: HttpMethod,
    endpoint: string,
    options: FetchOptions,
    data: unknown,
  ): Promise<AxiosRequestConfig> {
    const requiresJsonContentType = method === "POST" || method === "PUT" || method === "PATCH";
    const headers = new AxiosHeaders({
      ...(requiresJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    });
    let beforeRedirect: AxiosRequestConfig["beforeRedirect"];
    if (this.mode === "server") {
      // Never let request options override the visitor's rate-limit identity.
      for (const name of ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"]) {
        headers.set(name, false);
      }
      if (this.apiOrigin && new URL(endpoint, this.apiOrigin).origin === this.apiOrigin) {
        const identity = await this.serverRequestIdentity();
        if (identity["cf-connecting-ip"]) {
          headers.set("cf-connecting-ip", identity["cf-connecting-ip"], true);
        }
      }
      beforeRedirect = (redirect) => {
        const origin = new URL(redirect.href).origin;
        if (origin !== this.apiOrigin) {
          for (const name of Object.keys(redirect.headers)) {
            if (
              [
                "cf-connecting-ip",
                "x-forwarded-for",
                "x-real-ip",
                "x-egdata-worker-token",
                "x-egdata-origin-token",
                "x-egdata-key-id",
                "x-egdata-key-tier",
                "x-egdata-key-project",
                "x-egdata-authenticated",
              ].includes(name.toLowerCase())
            ) {
              delete redirect.headers[name];
            }
          }
        }
      };
    }

    const isTrustedV1 = this.isTrustedV1Request(endpoint, options);
    if (isTrustedV1) {
      if (this.fixedApiKey) {
        headers.set("X-API-Key", this.fixedApiKey);
      } else if (this.mode === "server") {
        const workerToken = process.env.V1_WORKER_TOKEN || process.env.ORIGIN_AUTH_TOKEN || "";
        const originToken = process.env.ORIGIN_AUTH_TOKEN || process.env.V1_WORKER_TOKEN || "";

        if (workerToken) {
          headers.set("x-egdata-worker-token", workerToken);
        }
        if (originToken) {
          headers.set("x-egdata-origin-token", originToken);
        }
        headers.set("x-egdata-key-id", process.env.WEB_SSR_KEY_ID || "key_egdata_web_ssr");
        headers.set("x-egdata-key-tier", "enterprise");
        headers.set("x-egdata-key-project", process.env.WEB_PROJECT_ID || "prj_egdata_web");
        headers.set("x-egdata-authenticated", "1");
      } else {
        if (
          !this.webApiKey ||
          (this.webApiKeyExpiresAt && Date.now() >= this.webApiKeyExpiresAt - 30_000)
        ) {
          await this.refreshWebApiKey(options.signal);
        }
        if (this.webApiKey) {
          headers.set("X-API-Key", this.webApiKey);
        }
      }
    }

    const withCredentials =
      options.withCredentials ?? (this.isV1Endpoint(endpoint) ? false : undefined);

    return {
      method,
      url: endpoint,
      params: options.params ? { ...options.params } : undefined,
      headers,
      beforeRedirect,
      ...(withCredentials !== undefined ? { withCredentials } : {}),
      timeout: options.timeout,
      signal: options.signal,
      data,
    };
  }

  private logResponse(
    meta: { method: HttpMethod; target: string; auth: string; startedAt: number },
    status: number,
  ): void {
    const durationMs = Date.now() - meta.startedAt;
    if (this.isDebugEnabled()) {
      console.info("[http-client] <-", {
        method: meta.method,
        target: meta.target,
        status,
        durationMs,
        mode: this.mode,
        auth: meta.auth,
      });
    } else if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
      console.warn("[http-client] slow request", {
        method: meta.method,
        target: meta.target,
        status,
        durationMs,
        mode: this.mode,
        auth: meta.auth,
      });
    }
  }

  private handleAxiosError(
    error: unknown,
    context?: { method: HttpMethod; target: string; auth: string; startedAt: number },
  ): never {
    const durationMs = context ? Date.now() - context.startedAt : undefined;

    if (axios.isCancel(error)) {
      console.warn("[http-client] request canceled", {
        ...(context ? { method: context.method, target: context.target, auth: context.auth } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
        mode: this.mode,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data;
      const status = axiosError.response?.status;
      const details = this.extractAxiosErrorDetails(axiosError);
      const targetLabel = context ? ` (${context.method} ${context.target})` : "";
      const errorMessage = `HTTP error! Status: ${status ?? "unknown"}${targetLabel}`;

      console.error("[http-client] request failed", {
        ...(context ? { method: context.method, target: context.target, auth: context.auth } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
        mode: this.mode,
        ...details,
      });

      const httpError = new Error(errorMessage) as HttpError;
      httpError.response = errorData;
      httpError.status = status;

      const headers = axiosError.response?.headers as
        | { get?: (name: string) => string | null; [key: string]: unknown }
        | undefined;
      const rawRetryAfter =
        typeof headers?.get === "function" ? headers.get("retry-after") : headers?.["retry-after"];
      const retryAfterMs =
        typeof rawRetryAfter === "string"
          ? parseRetryAfterMs(rawRetryAfter, Date.now())
          : undefined;

      if (retryAfterMs !== undefined) {
        httpError.retryAfterMs = retryAfterMs;
      }

      throw httpError;
    }

    console.error("[http-client] unexpected error", {
      ...(context ? { method: context.method, target: context.target, auth: context.auth } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      mode: this.mode,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error("Unknown error occurred");
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async retry<T>(
    requestFn: () => Promise<T>,
    { retries = 3, delay = 1000 }: { retries?: number; delay?: number } = {},
  ): Promise<T> {
    await this.ensureInitialized();
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        if (isProofOfWorkRecoveryError(error) || isAbuseTarpitError(error)) {
          throw error;
        }

        const status = (error as { status?: number }).status;
        if (status === 404 || attempt === retries) {
          console.error("[http-client] retry terminated", {
            attempt,
            retries,
            status: status ?? null,
            mode: this.mode,
            message: error instanceof Error ? error.message : String(error),
          });
          throw lastError;
        }
        console.warn("[http-client] retrying failed attempt", {
          attempt,
          retries,
          status: status ?? null,
          nextDelayMs: delay,
          mode: this.mode,
          message: error instanceof Error ? error.message : String(error),
        });
        await this.delay(delay);
      }
    }

    throw lastError ?? new Error("Max retries reached");
  }

  private async executeRequest<T>(
    method: HttpMethod,
    endpoint: string,
    options: FetchOptions = {},
    body?: unknown,
  ): Promise<T> {
    await this.ensureInitialized();

    const meta = {
      method,
      target: this.formatRequestTarget(endpoint, options.params),
      auth: this.getV1AuthMode(endpoint, options),
      startedAt: Date.now(),
    };

    if (this.isDebugEnabled()) {
      console.info("[http-client] ->", {
        method: meta.method,
        target: meta.target,
        mode: this.mode,
        auth: meta.auth,
      });
    }

    const generationAtStart = this.currentGeneration();
    const buffered = bufferReplayableBody(body);
    let firstResponse;

    try {
      firstResponse = await this.axiosInstance.request<T>(
        await this.requestConfig(method, endpoint, options, buffered.data),
      );
    } catch (error) {
      if (
        this.mode === "browser" &&
        !this.fixedApiKey &&
        this.isTrustedV1Request(endpoint, options) &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        const data = error.response.data as { code?: string } | undefined;
        if (data?.code === "EXPIRED_WEB_TOKEN") {
          console.warn("[http-client] expired web token, refreshing and retrying", {
            method: meta.method,
            target: meta.target,
          });
          const newToken = await this.refreshWebApiKey(options.signal);
          if (newToken) {
            try {
              const retryResponse = await this.axiosInstance.request<T>(
                await this.requestConfig(method, endpoint, options, buffered.data),
              );
              this.rejectTarpit(retryResponse, {
                method: meta.method,
                target: meta.target,
                durationMs: Date.now() - meta.startedAt,
              });
              this.logResponse(meta, retryResponse.status);
              return retryResponse.data;
            } catch (retryError) {
              return this.handleAxiosError(retryError, meta);
            }
          }
        }
      }
      return this.handleAxiosError(error, meta);
    }

    this.rejectTarpit(firstResponse, {
      method: meta.method,
      target: meta.target,
      durationMs: Date.now() - meta.startedAt,
    });
    if (!isSessionChallengeEnvelope(firstResponse.data)) {
      this.logResponse(meta, firstResponse.status);
      return firstResponse.data;
    }

    console.warn("[http-client] session PoW challenge triggered", {
      method: meta.method,
      target: meta.target,
      mode: this.mode,
    });

    // From here on we only recover from the exact envelope. No other status,
    // empty result, GraphQL error or high-risk mitigation reaches this path.
    if (options.signal?.aborted) {
      console.warn("[http-client] canceled before PoW recovery", {
        method: meta.method,
        target: meta.target,
      });
      throw new CanceledError("The request was canceled.");
    }

    if (!buffered.replayable) {
      console.error("[http-client] PoW recovery aborted: body not replayable", {
        method: meta.method,
        target: meta.target,
      });
      this.notifyFailure();
      throw new ProofOfWorkRecoveryError("not-replayable");
    }

    const recovery = await this.getRecovery();

    if (!recovery) {
      if (this.mode === "server") {
        console.error("[http-client] PoW challenge received on SSR", {
          method: meta.method,
          target: meta.target,
        });
        throw new ProofOfWorkRecoveryError("ssr-unsupported");
      }

      console.error("[http-client] PoW recovery unavailable", {
        method: meta.method,
        target: meta.target,
      });
      this.notifyFailure();
      throw new ProofOfWorkRecoveryError("recovery-failed");
    }

    try {
      await recovery.recover({
        startedGeneration: generationAtStart,
        signal: options.signal,
      });
    } catch (error) {
      if (options.signal?.aborted || isAbortLikeError(error)) {
        console.warn("[http-client] PoW recovery canceled", {
          method: meta.method,
          target: meta.target,
        });
        throw new CanceledError("The request was canceled.");
      }

      console.error("[http-client] PoW recovery failed", {
        method: meta.method,
        target: meta.target,
        message: error instanceof Error ? error.message : String(error),
      });

      if (isProofOfWorkRecoveryError(error)) {
        throw error;
      }

      throw new ProofOfWorkRecoveryError("recovery-failed", undefined, {
        cause: error,
      });
    }

    if (options.signal?.aborted) {
      throw new CanceledError("The request was canceled.");
    }

    let retryResponse;

    try {
      retryResponse = await this.axiosInstance.request<T>(
        await this.requestConfig(method, endpoint, options, buffered.data),
      );
    } catch (error) {
      return this.handleAxiosError(error, meta);
    }

    this.rejectTarpit(retryResponse, {
      method: meta.method,
      target: meta.target,
      durationMs: Date.now() - meta.startedAt,
    });
    if (isSessionChallengeEnvelope(retryResponse.data)) {
      console.error("[http-client] PoW challenge persisted after recovery", {
        method: meta.method,
        target: meta.target,
      });
      this.notifyFailure();
      throw new ProofOfWorkRecoveryError("challenged-again");
    }

    if (this.mode === "browser") {
      clearRecoveryFailure();
    }

    this.logResponse(meta, retryResponse.status);
    return retryResponse.data;
  }

  public async request<T>(
    endpointOrConfig: string | FetchOptions,
    config: FetchOptions = {},
  ): Promise<T> {
    if (typeof endpointOrConfig === "string") {
      const method = (config.method?.toUpperCase() as HttpMethod) || "GET";
      return this.executeRequest<T>(method, endpointOrConfig, config, config.data);
    }
    const method = (endpointOrConfig.method?.toUpperCase() as HttpMethod) || "GET";
    return this.executeRequest<T>(
      method,
      endpointOrConfig.url || "",
      endpointOrConfig,
      endpointOrConfig.data,
    );
  }

  public async get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.executeRequest<T>("GET", endpoint, options);
  }

  public async post<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.executeRequest<T>("POST", endpoint, options, body);
  }

  public async put<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.executeRequest<T>("PUT", endpoint, options, body);
  }

  public async patch<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.executeRequest<T>("PATCH", endpoint, options, body);
  }

  public async delete<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.executeRequest<T>("DELETE", endpoint, options);
  }

  public async options<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.executeRequest<T>("OPTIONS", endpoint, options);
  }

  private unwrapV1Envelope<T, M = Record<string, unknown>>(
    method: "GET" | "POST",
    endpoint: string,
    envelope: V1Envelope<T, M>,
  ): T {
    if (envelope && typeof envelope === "object" && "data" in envelope) {
      return envelope.data;
    }
    console.warn("[http-client] v1 response missing .data envelope", {
      method,
      endpoint,
      receivedType: envelope === null ? "null" : typeof envelope,
    });
    return envelope as unknown as T;
  }

  public async v1GetEnvelope<T, M = Record<string, unknown>>(
    endpoint: string,
    options?: FetchOptions,
  ): Promise<V1Envelope<T, M>> {
    const normalized = this.normalizeV1Endpoint(endpoint);
    return this.get<V1Envelope<T, M>>(normalized, options);
  }

  public async v1Get<T, M = Record<string, unknown>>(
    endpoint: string,
    options?: FetchOptions,
  ): Promise<T> {
    const normalized = this.normalizeV1Endpoint(endpoint);
    const envelope = await this.get<V1Envelope<T, M>>(normalized, options);
    return this.unwrapV1Envelope("GET", normalized, envelope);
  }

  public async v1PostEnvelope<T, M = Record<string, unknown>>(
    endpoint: string,
    body?: Record<string, unknown> | unknown,
    options?: FetchOptions,
  ): Promise<V1Envelope<T, M>> {
    const normalized = this.normalizeV1Endpoint(endpoint);
    return this.post<V1Envelope<T, M>>(
      normalized,
      body as Record<string, unknown> | undefined,
      options,
    );
  }

  public async v1Post<T, M = Record<string, unknown>>(
    endpoint: string,
    body?: Record<string, unknown> | unknown,
    options?: FetchOptions,
  ): Promise<T> {
    const normalized = this.normalizeV1Endpoint(endpoint);
    const envelope = await this.post<V1Envelope<T, M>>(
      normalized,
      body as Record<string, unknown> | undefined,
      options,
    );
    return this.unwrapV1Envelope("POST", normalized, envelope);
  }
}

const defaultEnv = readEnv();

export const httpClient = new HttpFetch(resolveBaseUrl(defaultEnv, detectServer(defaultEnv)), {
  timeout: 5_000,
  withCredentials: true,
  headers: {
    // @ts-expect-error
    "User-Agent":
      defaultEnv.SSR || detectServer(defaultEnv) ? "egdata-web-client/1.0.0" : undefined,
  },
});

console.info("[http-client] initialized", {
  mode: httpClient.mode,
  baseURL: httpClient.axiosInstance.defaults.baseURL || "(relative)",
  auth: httpClient.getAuthSummary(),
  timeout: httpClient.axiosInstance.defaults.timeout,
  debug: httpClient.isDebugEnabled(),
});

export { bufferReplayableBody };
