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
};

type EnvBag = {
  SSR?: boolean;
  VITE_API_ENDPOINT?: string;
  API_ENDPOINT?: string;
};

function readEnv(): EnvBag {
  return (import.meta.env ?? {}) as EnvBag;
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

  private webApiKey: string | null = null;
  private webApiKeyExpiresAt: number | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL = "", defaultOptions: FetchOptions = {}, runtime: HttpFetchRuntime = {}) {
    const env = readEnv();
    const mode = runtime.mode ?? (detectServer(env) ? "server" : "browser");
    this.mode = mode;
    this.apiOrigin = resolveApiOrigin(baseURL);
    this.injectedRecovery = runtime.recovery;
    this.serverRequestIdentity = runtime.serverRequestIdentity ?? readSsrClientIdentity;

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

  public setWebApiKey(token: string | null, expiresAt?: number | null): void {
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
    return this.webApiKey;
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
          return null;
        } catch (err) {
          console.error("Failed to refresh webApiKey", err);
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

  private rejectTarpit(response: Pick<AxiosResponse, "status" | "headers">): void {
    if (response.status !== 204) return;
    const marker =
      response.headers instanceof AxiosHeaders
        ? response.headers.get("x-egdata-mitigation")
        : Object.entries(response.headers).find(
            ([name]) => name.toLowerCase() === "x-egdata-mitigation",
          )?.[1];
    if (marker === "tarpit") {
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
      if (this.mode === "server") {
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

    return {
      method,
      url: endpoint,
      params: options.params ? { ...options.params } : undefined,
      headers,
      beforeRedirect,
      timeout: options.timeout,
      signal: options.signal,
      data,
    };
  }

  private handleAxiosError(error: unknown): never {
    if (axios.isCancel(error)) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data;
      const status = axiosError.response?.status;
      const errorMessage = `HTTP error! Status: ${status ?? "unknown"}`;

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
          throw lastError;
        }
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
        this.isTrustedV1Request(endpoint, options) &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        const data = error.response.data as { code?: string } | undefined;
        if (data?.code === "EXPIRED_WEB_TOKEN") {
          const newToken = await this.refreshWebApiKey(options.signal);
          if (newToken) {
            try {
              const retryResponse = await this.axiosInstance.request<T>(
                await this.requestConfig(method, endpoint, options, buffered.data),
              );
              this.rejectTarpit(retryResponse);
              return retryResponse.data;
            } catch (retryError) {
              return this.handleAxiosError(retryError);
            }
          }
        }
      }
      return this.handleAxiosError(error);
    }

    this.rejectTarpit(firstResponse);
    if (!isSessionChallengeEnvelope(firstResponse.data)) {
      return firstResponse.data;
    }

    // From here on we only recover from the exact envelope. No other status,
    // empty result, GraphQL error or high-risk mitigation reaches this path.
    if (options.signal?.aborted) {
      throw new CanceledError("The request was canceled.");
    }

    if (!buffered.replayable) {
      this.notifyFailure();
      throw new ProofOfWorkRecoveryError("not-replayable");
    }

    const recovery = await this.getRecovery();

    if (!recovery) {
      if (this.mode === "server") {
        throw new ProofOfWorkRecoveryError("ssr-unsupported");
      }

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
        throw new CanceledError("The request was canceled.");
      }

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
      return this.handleAxiosError(error);
    }

    this.rejectTarpit(retryResponse);
    if (isSessionChallengeEnvelope(retryResponse.data)) {
      this.notifyFailure();
      throw new ProofOfWorkRecoveryError("challenged-again");
    }

    if (this.mode === "browser") {
      clearRecoveryFailure();
    }

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

  public async v1Get<T, M = Record<string, unknown>>(
    endpoint: string,
    options?: FetchOptions,
  ): Promise<T> {
    const envelope = await this.get<V1Envelope<T, M>>(this.normalizeV1Endpoint(endpoint), options);
    return envelope && typeof envelope === "object" && "data" in envelope
      ? envelope.data
      : (envelope as unknown as T);
  }

  public async v1Post<T, M = Record<string, unknown>>(
    endpoint: string,
    body?: Record<string, unknown> | unknown,
    options?: FetchOptions,
  ): Promise<T> {
    const envelope = await this.post<V1Envelope<T, M>>(
      this.normalizeV1Endpoint(endpoint),
      body as Record<string, unknown> | undefined,
      options,
    );
    return envelope && typeof envelope === "object" && "data" in envelope
      ? envelope.data
      : (envelope as unknown as T);
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

export { bufferReplayableBody };
