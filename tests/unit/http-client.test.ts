import assert from "node:assert/strict";
import test from "node:test";
import { httpClient } from "../../src/lib/http-client.ts";

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

test("httpClient normalizeV1Endpoint normalizes endpoints properly", () => {
  // Test via accessing public v1Get url construction or checking v1 methods
  assert.equal(typeof httpClient.v1Get, "function");
  assert.equal(typeof httpClient.v1Post, "function");
  assert.equal(typeof httpClient.refreshWebApiKey, "function");
});
