import assert from "node:assert/strict";
import test from "node:test";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { HttpFetch, httpClient } from "../../src/lib/http-client.ts";

test("httpClient setWebApiKey decodes base64url payload exp", () => {
  const exp = Date.now() + 1800000;
  const payload = { exp, subnet: "192.168.1.0/24" };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `egw_${payloadB64}.fakesig123`;

  httpClient.setWebApiKey(token);
  assert.equal(httpClient.getWebApiKey(), token);

  httpClient.setWebApiKey(null);
  assert.equal(httpClient.getWebApiKey(), null);
});

test("v1Get and v1Post normalize endpoints, unwrap envelope, and attach SSR headers on trusted origins", async () => {
  const origAdapter = httpClient.axiosInstance.defaults.adapter;
  const origWorkerToken = process.env.V1_WORKER_TOKEN;
  const captured: InternalAxiosRequestConfig[] = [];

  try {
    process.env.V1_WORKER_TOKEN = "mock-worker-token";
    httpClient.axiosInstance.defaults.adapter = async (config) => {
      captured.push(config);
      const isPost = config.method?.toUpperCase() === "POST";
      return {
        data: {
          data: isPost ? { result: "created" } : ["US", "ES", "DE"],
          meta: { count: 3 },
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse;
    };

    // 1. v1Get normalizes /countries -> /v1/countries and unwraps .data
    const getData = await httpClient.v1Get<string[]>("/countries");
    assert.deepEqual(getData, ["US", "ES", "DE"]);
    assert.equal(captured[0]?.url, "/v1/countries");
    const getHeaders = captured[0]?.headers as Record<string, string>;
    assert.equal(getHeaders["x-egdata-worker-token"], "mock-worker-token");
    assert.equal(getHeaders["x-egdata-key-id"], "key_egdata_web_ssr");
    assert.equal(getHeaders["x-egdata-key-tier"], "enterprise");
    assert.equal(getHeaders["x-egdata-authenticated"], "1");

    // 2. v1Post normalizes /offers/search -> /v1/offers/search and unwraps .data
    const postData = await httpClient.v1Post<{ result: string }>("/offers/search", { query: "game" });
    assert.deepEqual(postData, { result: "created" });
    assert.equal(captured[1]?.url, "/v1/offers/search");
    const postHeaders = captured[1]?.headers as Record<string, string>;
    assert.equal(postHeaders["x-egdata-worker-token"], "mock-worker-token");
    assert.equal(postHeaders["x-egdata-key-id"], "key_egdata_web_ssr");
  } finally {
    httpClient.axiosInstance.defaults.adapter = origAdapter;
    if (origWorkerToken !== undefined) {
      process.env.V1_WORKER_TOKEN = origWorkerToken;
    } else {
      delete process.env.V1_WORKER_TOKEN;
    }
  }
});

test("untrusted external origins do not receive internal SSR headers or browser X-API-Key", async () => {
  const origAdapter = httpClient.axiosInstance.defaults.adapter;
  const origWorkerToken = process.env.V1_WORKER_TOKEN;
  const captured: InternalAxiosRequestConfig[] = [];

  try {
    process.env.V1_WORKER_TOKEN = "super-secret-token";
    httpClient.setWebApiKey("egw_secret_web_key");

    httpClient.axiosInstance.defaults.adapter = async (config) => {
      captured.push(config);
      return {
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse;
    };

    await httpClient.get("https://other.example/v1/offers");
    assert.equal(captured.length, 1);
    const headers = captured[0]?.headers as Record<string, string>;
    assert.equal(headers["x-egdata-worker-token"], undefined);
    assert.equal(headers["x-egdata-key-id"], undefined);
    assert.equal(headers["x-egdata-authenticated"], undefined);
    assert.equal(headers["X-API-Key"], undefined);
  } finally {
    httpClient.setWebApiKey(null);
    httpClient.axiosInstance.defaults.adapter = origAdapter;
    if (origWorkerToken !== undefined) {
      process.env.V1_WORKER_TOKEN = origWorkerToken;
    } else {
      delete process.env.V1_WORKER_TOKEN;
    }
  }
});

test("in simulated browser mode, handles token refresh and retries only on EXPIRED_WEB_TOKEN", async () => {
  const origFetch = globalThis.fetch;
  const origWindow = (globalThis as unknown as { window?: unknown }).window;
  let fetchCallCount = 0;
  let adapterCallCount = 0;

  try {
    (globalThis as unknown as { window?: unknown }).window = {};
    const client = new HttpFetch("https://api.egdata.app", {}, { mode: "browser" });

    // Mock fetch for /api/web-token
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("/api/web-token")) {
        fetchCallCount++;
        const token = `egw_token_${fetchCallCount}`;
        return new Response(
          JSON.stringify({ token, expiresAt: Date.now() + 1800000 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    // 1. Initial request triggers token refresh and attaches X-API-Key
    client.axiosInstance.defaults.adapter = async (config) => {
      adapterCallCount++;
      return {
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse;
    };

    const res1 = await client.get<{ success: boolean }>("/v1/countries");
    assert.deepEqual(res1, { success: true });
    assert.equal(fetchCallCount, 1);
    assert.equal(client.getWebApiKey(), "egw_token_1");

    // 2. Request encountering EXPIRED_WEB_TOKEN retries once with renewed token
    adapterCallCount = 0;
    client.axiosInstance.defaults.adapter = async (config) => {
      adapterCallCount++;
      const key = (config.headers as Record<string, string>)["X-API-Key"];
      if (key === "egw_token_1") {
        const error = new Error("Request failed with status code 401") as Error & {
          response: AxiosResponse;
          isAxiosError: boolean;
        };
        error.isAxiosError = true;
        error.response = {
          data: { code: "EXPIRED_WEB_TOKEN", message: "Token expired" },
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          config,
        };
        throw error;
      }
      return {
        data: { recovered: true, usedKey: key },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse;
    };

    const res2 = await client.get<{ recovered: boolean; usedKey: string }>("/v1/countries");
    assert.equal(res2.recovered, true);
    assert.equal(res2.usedKey, "egw_token_2");
    assert.equal(adapterCallCount, 2); // original + 1 retry

    // 3. Request encountering INVALID_WEB_TOKEN does NOT retry
    adapterCallCount = 0;
    const fetchCallsBefore = fetchCallCount;
    client.axiosInstance.defaults.adapter = async (config) => {
      adapterCallCount++;
      const error = new Error("Request failed with status code 401") as Error & {
        response: AxiosResponse;
        isAxiosError: boolean;
      };
      error.isAxiosError = true;
      error.response = {
        data: { code: "INVALID_WEB_TOKEN", message: "Token is invalid" },
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config,
      };
      throw error;
    };

    await assert.rejects(
      async () => {
        await client.get("/v1/countries");
      },
      (err: any) => {
        return err.status === 401;
      },
    );
    assert.equal(adapterCallCount, 1, "Should not retry on INVALID_WEB_TOKEN");
    assert.equal(fetchCallCount, fetchCallsBefore, "Should not call fetch for INVALID_WEB_TOKEN");
  } finally {
    globalThis.fetch = origFetch;
    if (origWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = origWindow;
    }
  }
});
