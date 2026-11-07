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

type ParameterValue = string | number | boolean | undefined | null;

interface FetchOptions extends AxiosRequestConfig {
  params?: Record<string, ParameterValue>;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

interface HttpError extends Error {
  response?: unknown;
  status?: number;
  retryAfterMs?: number;
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

type BufferedBody = {
  replayable: boolean;
  data: unknown;
};

export type HttpFetchRuntime = {
  mode?: "browser" | "server";
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
      if (typeof structuredClone === "function") {
        return { replayable: true, data: structuredClone(data) };
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
  private readonly mode: "browser" | "server";
  private readonly apiOrigin: string | null;
  private readonly injectedRecovery: SessionRecovery | null | undefined;
  private recoveryInstance: SessionRecovery | null = null;
  private recoveryPromise: Promise<SessionRecovery | null> | null = null;

  constructor(baseURL = "", defaultOptions: FetchOptions = {}, runtime: HttpFetchRuntime = {}) {
    const env = readEnv();
    const mode = runtime.mode ?? (detectServer(env) ? "server" : "browser");
    this.mode = mode;
    this.apiOrigin = resolveApiOrigin(baseURL);
    this.injectedRecovery = runtime.recovery;

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

  private requestConfig(
    method: HttpMethod,
    endpoint: string,
    options: FetchOptions,
    data: unknown,
  ): AxiosRequestConfig {
    const requiresJsonContentType = method === "POST" || method === "PUT" || method === "PATCH";

    return {
      method,
      url: endpoint,
      params: options.params ? { ...options.params } : undefined,
      headers: {
        ...(requiresJsonContentType ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
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

  private async request<T>(
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
        this.requestConfig(method, endpoint, options, buffered.data),
      );
    } catch (error) {
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
        this.requestConfig(method, endpoint, options, buffered.data),
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

  public async get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>("GET", endpoint, options);
  }

  public async post<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.request<T>("POST", endpoint, options, body);
  }

  public async put<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.request<T>("PUT", endpoint, options, body);
  }

  public async patch<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.request<T>("PATCH", endpoint, options, body);
  }

  public async delete<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>("DELETE", endpoint, options);
  }

  public async options<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>("OPTIONS", endpoint, options);
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
