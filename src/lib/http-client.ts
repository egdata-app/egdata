import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from "axios";

type ParameterValue = string | number | boolean | undefined | null;
interface FetchOptions extends AxiosRequestConfig {
  params?: Record<string, ParameterValue>;
  headers?: Record<string, string>;
  timeout?: number;
}

interface HttpError extends Error {
  response?: unknown;
  status?: number;
}

class HttpFetch {
  public axiosInstance: AxiosInstance;
  private initializationPromise: Promise<void>;

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
      if (typeof window === "undefined") {
        try {
          const [http, https] = await Promise.all([import("node:http"), import("node:https")]);

          // Create new instance with agents
          this.axiosInstance = axios.create({
            ...config,
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
          });
        } catch (error) {
          console.error("Failed to initialize HTTP agents:", error);
          // Keep using the basic instance if agent initialization fails
        }
      }
    })();
  }

  private async ensureInitialized() {
    await this.initializationPromise;
  }

  private handleAxiosError(error: unknown): never {
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

  public async get<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    await this.ensureInitialized();
    try {
      const response = await this.axiosInstance.get<T>(endpoint, {
        params: options.params,
        headers: options.headers,
        timeout: options.timeout,
      });
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  public async post<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    await this.ensureInitialized();
    try {
      const response = await this.axiosInstance.post<T>(endpoint, body, {
        params: options.params,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        timeout: options.timeout,
      });
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  public async put<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    await this.ensureInitialized();
    try {
      const response = await this.axiosInstance.put<T>(endpoint, body, {
        params: options.params,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        timeout: options.timeout,
      });
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  public async patch<T>(endpoint: string, body?: unknown, options: FetchOptions = {}): Promise<T> {
    await this.ensureInitialized();
    try {
      const response = await this.axiosInstance.patch<T>(endpoint, body, {
        params: options.params,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        timeout: options.timeout,
      });
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  public async delete<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    await this.ensureInitialized();
    try {
      const response = await this.axiosInstance.delete<T>(endpoint, {
        params: options.params,
        headers: options.headers,
        timeout: options.timeout,
      });
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }

  public async options<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    await this.ensureInitialized();
    try {
      const response = await this.axiosInstance.options<T>(endpoint, {
        params: options.params,
        headers: options.headers,
        timeout: options.timeout,
      });
      return response.data;
    } catch (error) {
      return this.handleAxiosError(error);
    }
  }
}

export const httpClient = new HttpFetch(
  import.meta.env.SSR
    ? (process.env.SERVER_API_ENDPOINT ?? "https://api.egdata.app")
    : (import.meta.env.SERVER_API_ENDPOINT ?? "https://api.egdata.app"),
  {
    timeout: 5_000,
    withCredentials: true,
    headers: {
      // @ts-expect-error
      "User-Agent": import.meta.env.SSR ? "egdata-web-client/1.0.0" : undefined,
    },
  },
);
