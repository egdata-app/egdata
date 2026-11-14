import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from "axios";

type ParameterValue = string | number | boolean | undefined | null;
export interface FetchOptions extends AxiosRequestConfig {
  params?: Record<string, ParameterValue>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface HttpError extends Error {
  response?: unknown;
  status?: number;
}

export interface V1Envelope<T, M = Record<string, unknown>> {
  data: T;
  meta: M;
}

class HttpFetch {
  public axiosInstance: AxiosInstance;
  private initializationPromise: Promise<void>;
  private webApiKey: string | null = null;
  private webApiKeyExpiresAt: number | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseURL = "", defaultOptions: FetchOptions = {}) {
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
      if (import.meta.env?.SSR || typeof window === "undefined") {
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

  public async refreshWebApiKey(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch("/api/web-token", {
          method: "GET",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
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

    return this.refreshPromise;
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
    endpoint: string,
    config: AxiosRequestConfig,
    hasRefreshedRetry = false,
  ): Promise<T> {
    await this.ensureInitialized();
    const isV1 = this.isV1Endpoint(endpoint);

    const requestHeaders: Record<string, string> = {};
    if (config.headers) {
      Object.assign(requestHeaders, config.headers);
    }

    if (isV1) {
      if (typeof window === "undefined" || import.meta.env?.SSR) {
        const workerToken = process.env.V1_WORKER_TOKEN || process.env.ORIGIN_AUTH_TOKEN || "";
        const originToken = process.env.ORIGIN_AUTH_TOKEN || process.env.V1_WORKER_TOKEN || "";

        if (workerToken) {
          requestHeaders["x-egdata-worker-token"] = workerToken;
        }
        if (originToken) {
          requestHeaders["x-egdata-origin-token"] = originToken;
        }
        requestHeaders["x-egdata-key-id"] = process.env.WEB_SSR_KEY_ID || "key_egdata_web_ssr";
        requestHeaders["x-egdata-key-tier"] = "enterprise";
        requestHeaders["x-egdata-key-project"] = process.env.WEB_PROJECT_ID || "prj_egdata_web";
        requestHeaders["x-egdata-authenticated"] = "1";
      } else {
        if (
          !this.webApiKey ||
          (this.webApiKeyExpiresAt && Date.now() >= this.webApiKeyExpiresAt - 30_000)
        ) {
          await this.refreshWebApiKey();
        }
        if (this.webApiKey) {
          requestHeaders["X-API-Key"] = this.webApiKey;
        }
      }
    }

    const requestConfig: AxiosRequestConfig = {
      ...config,
      url: endpoint,
      headers: requestHeaders,
    };

    try {
      const response = await this.axiosInstance.request<T>(requestConfig);
      return response.data;
    } catch (error) {
      if (
        !hasRefreshedRetry &&
        typeof window !== "undefined" &&
        isV1 &&
        axios.isAxiosError(error) &&
        error.response?.status === 401
      ) {
        const data = error.response.data as { code?: string } | undefined;
        if (data?.code === "EXPIRED_WEB_TOKEN" || !hasRefreshedRetry) {
          const newToken = await this.refreshWebApiKey();
          if (newToken) {
            requestHeaders["X-API-Key"] = newToken;
            return this.executeRequest<T>(
              endpoint,
              {
                ...requestConfig,
                headers: requestHeaders,
              },
              true,
            );
          }
        }
      }
      return this.handleAxiosError(error);
    }
  }

  public async request<T>(
    endpointOrConfig: string | AxiosRequestConfig,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    if (typeof endpointOrConfig === "string") {
      return this.executeRequest<T>(endpointOrConfig, {
        ...config,
        url: endpointOrConfig,
      });
    }
    return this.executeRequest<T>(endpointOrConfig.url || "", endpointOrConfig);
  }

  public async get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
      params: options.params,
      headers: options.headers,
      timeout: options.timeout,
      signal: options.signal,
    });
  }

  public async post<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      data: body,
      params: options.params,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: options.timeout,
      signal: options.signal,
    });
  }

  public async put<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      data: body,
      params: options.params,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: options.timeout,
      signal: options.signal,
    });
  }

  public async patch<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      data: body,
      params: options.params,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: options.timeout,
      signal: options.signal,
    });
  }

  public async delete<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      params: options.params,
      headers: options.headers,
      timeout: options.timeout,
      signal: options.signal,
    });
  }

  public async options<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: "OPTIONS",
      params: options.params,
      headers: options.headers,
      timeout: options.timeout,
      signal: options.signal,
    });
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

export const httpClient = new HttpFetch(
  import.meta.env?.SSR || typeof window === "undefined"
    ? (process.env.API_ENDPOINT ?? "https://api.egdata.app")
    : (import.meta.env?.VITE_API_ENDPOINT ?? "https://api.egdata.app"),
  {
    timeout: 5_000,
    withCredentials: true,
    headers: {
      // @ts-expect-error
      "User-Agent":
        import.meta.env?.SSR || typeof window === "undefined"
          ? "egdata-web-client/1.0.0"
          : undefined,
    },
  },
);
