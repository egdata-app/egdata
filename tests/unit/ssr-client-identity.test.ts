import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { HttpFetch } from "../../src/lib/http-client.ts";
import { cloudflareClientIdentity } from "../../src/lib/ssr-client-identity.server.ts";
import { createAdapter } from "./pow-test-helpers.ts";

test("only a single valid Cloudflare visitor IP becomes an SSR identity", () => {
  for (const ip of ["192.0.2.48", "2001:db8::48"]) {
    assert.deepEqual(cloudflareClientIdentity(new Headers({ "cf-connecting-ip": ip })), {
      "cf-connecting-ip": ip,
    });
  }
  for (const ip of ["", "not-an-ip", "192.0.2.48, 192.0.2.49", "1.2.3.4:1234"]) {
    assert.deepEqual(cloudflareClientIdentity(new Headers({ "cf-connecting-ip": ip })), {});
  }
  assert.deepEqual(
    cloudflareClientIdentity(
      new Headers({
        "x-forwarded-for": "192.0.2.48",
        "x-real-ip": "192.0.2.48",
        authorization: "Bearer private",
        cookie: "session=private",
      }),
    ),
    {},
  );
});

test("overlapping SSR requests retain their own visitor identity and never mutate defaults", async () => {
  const context = new AsyncLocalStorage<Headers>();
  const client = new HttpFetch(
    "http://api.internal:4000",
    {},
    {
      mode: "server",
      serverRequestIdentity: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return cloudflareClientIdentity(context.getStore() ?? new Headers());
      },
    },
  );
  const { adapter, configs } = createAdapter((config) => ({
    data: {
      ip: config.headers.get("cf-connecting-ip"),
      path: config.url,
      forwarded: config.headers.get("x-forwarded-for"),
      real: config.headers.get("x-real-ip"),
    },
  }));
  client.axiosInstance.defaults.adapter = adapter;
  const ips = ["192.0.2.48", "192.0.2.49", "2001:db8::48"];
  const results = await Promise.all(
    ips.map((ip) =>
      context.run(new Headers({ "cf-connecting-ip": ip }), () =>
        client.get<{ ip: string; path: string; forwarded?: unknown; real?: unknown }>(
          `/graphql?visitor=${ip}`,
          {
            headers: {
              "CF-Connecting-IP": "192.0.2.99",
              "X-Forwarded-For": "forged",
              "X-Real-IP": "forged",
            },
          },
        ),
      ),
    ),
  );
  results.forEach((result, index) => {
    assert.equal(result.ip, ips[index]);
    assert.equal(result.forwarded, false);
    assert.equal(result.real, false);
  });
  assert.equal(client.axiosInstance.defaults.headers.common["cf-connecting-ip"], undefined);
  assert.equal(configs.length, 3);
  const background = await client.get<{ ip?: unknown }>("/graphql");
  assert.equal(background.ip, false);
});

test("browser requests never invoke SSR identity and external destinations receive none", async () => {
  let calls = 0;
  for (const mode of ["browser", "server"] as const) {
    const client = new HttpFetch(
      "https://api.egdata.app",
      {},
      {
        mode,
        serverRequestIdentity: async () => {
          calls++;
          return { "cf-connecting-ip": "192.0.2.48" };
        },
      },
    );
    const { adapter, configs } = createAdapter(() => ({ data: {} }));
    client.axiosInstance.defaults.adapter = adapter;
    await client.get(mode === "browser" ? "/graphql" : "https://example.com/other");
    assert.ok(!configs[0].headers.get("cf-connecting-ip"));
  }
  assert.equal(calls, 0);
});

test("cross-origin redirects remove SSR identity before making the next request", async () => {
  const seen: Array<string | undefined> = [];
  const destination = createServer((req, res) => {
    seen.push(req.headers["cf-connecting-ip"] as string | undefined);
    res.setHeader("Content-Type", "application/json");
    res.end('{"ok":true}');
  }).listen(0, "127.0.0.1");
  await once(destination, "listening");
  const target = destination.address() as { port: number };
  const origin = createServer((req, res) => {
    seen.push(req.headers["cf-connecting-ip"] as string | undefined);
    res.writeHead(302, { Location: `http://127.0.0.1:${target.port}/target` });
    res.end();
  }).listen(0, "127.0.0.1");
  await once(origin, "listening");
  try {
    const address = origin.address() as { port: number };
    const client = new HttpFetch(
      `http://127.0.0.1:${address.port}`,
      {},
      {
        mode: "server",
        serverRequestIdentity: async () => ({ "cf-connecting-ip": "192.0.2.48" }),
      },
    );
    assert.deepEqual(await client.get("/redirect"), { ok: true });
    assert.deepEqual(seen, ["192.0.2.48", undefined]);
  } finally {
    origin.closeAllConnections();
    destination.closeAllConnections();
    await Promise.all([
      new Promise<void>((resolve) => origin.close(() => resolve())),
      new Promise<void>((resolve) => destination.close(() => resolve())),
    ]);
  }
});

test("IPv6 redirect destinations are parsed without losing brackets", async () => {
  const client = new HttpFetch(
    "http://[::1]:4000",
    {},
    {
      mode: "server",
      serverRequestIdentity: async () => ({ "cf-connecting-ip": "2001:db8::48" }),
    },
  );
  const { adapter, configs } = createAdapter(() => ({ data: {} }));
  client.axiosInstance.defaults.adapter = adapter;
  await client.get("/redirect");
  const sameOrigin = {
    href: "http://[::1]:4000/target",
    hostname: "::1",
    headers: { "cf-connecting-ip": "2001:db8::48" },
  };
  const external = {
    href: "http://[::1]:4001/target",
    hostname: "::1",
    headers: { "cf-connecting-ip": "2001:db8::48" },
  };
  configs[0].beforeRedirect!(sameOrigin, { headers: {}, statusCode: 302 });
  configs[0].beforeRedirect!(external, { headers: {}, statusCode: 302 });
  assert.equal(sameOrigin.headers["cf-connecting-ip"], "2001:db8::48");
  assert.equal(external.headers["cf-connecting-ip"], undefined);
});
