import assert from "node:assert/strict";
import test from "node:test";
import {
  computeIpSubnet,
  extractClientIp,
  mintWebEphemeralToken,
} from "../../src/lib/ephemeral-key.server.ts";

test("computeIpSubnet normalizes IPv4 addresses to /24", () => {
  assert.equal(computeIpSubnet("192.168.1.50"), "192.168.1.0/24");
  assert.equal(computeIpSubnet("10.0.5.254"), "10.0.5.0/24");
  assert.equal(computeIpSubnet("8.8.8.8"), "8.8.8.0/24");
});

test("computeIpSubnet strips ::ffff: IPv4-mapped IPv6 addresses", () => {
  assert.equal(computeIpSubnet("::ffff:192.168.1.50"), "192.168.1.0/24");
  assert.equal(computeIpSubnet("::FFFF:10.0.0.1"), "10.0.0.0/24");
});

test("computeIpSubnet normalizes IPv6 addresses to /48", () => {
  assert.equal(
    computeIpSubnet("2001:0db8:85a3:0000:0000:8a2e:0370:7334"),
    "2001:db8:85a3::/48",
  );
  assert.equal(computeIpSubnet("2001:db8::"), "2001:db8:0::/48");
  assert.equal(computeIpSubnet("::1"), "0:0:0::/48");
  assert.equal(computeIpSubnet("fe80::1ff:fe23:4567:890a"), "fe80:0:0::/48");
});

test("computeIpSubnet handles empty or invalid IP addresses as local", () => {
  assert.equal(computeIpSubnet(""), "local");
  assert.equal(computeIpSubnet(null), "local");
  assert.equal(computeIpSubnet(undefined), "local");
  assert.equal(computeIpSubnet("invalid-ip"), "local");
});

test("extractClientIp extracts IP from headers with correct precedence", () => {
  // 1. cf-connecting-ip
  const h1 = new Headers({
    "cf-connecting-ip": "1.2.3.4",
    "x-forwarded-for": "5.6.7.8, 9.10.11.12",
    "x-real-ip": "13.14.15.16",
  });
  assert.equal(extractClientIp(h1), "1.2.3.4");

  // 2. x-forwarded-for first IP
  const h2 = new Headers({
    "x-forwarded-for": "5.6.7.8, 9.10.11.12",
    "x-real-ip": "13.14.15.16",
  });
  assert.equal(extractClientIp(h2), "5.6.7.8");

  // 3. x-real-ip
  const h3 = new Headers({
    "x-real-ip": "13.14.15.16",
  });
  assert.equal(extractClientIp(h3), "13.14.15.16");

  // 4. fallback
  const h4 = new Headers({});
  assert.equal(extractClientIp(h4), "127.0.0.1");

  // Plain record support
  assert.equal(
    extractClientIp({ "CF-Connecting-IP": "20.30.40.50" }),
    "20.30.40.50",
  );
});

test("mintWebEphemeralToken generates valid signed egw_ token", () => {
  const result = mintWebEphemeralToken("192.168.1.0/24");
  assert.ok(result.token);
  assert.ok(result.expiresAt);
  assert.ok(result.token.startsWith("egw_"));

  const [payloadB64, sigB64] = result.token.slice(4).split(".");
  assert.ok(payloadB64);
  assert.ok(sigB64);

  const decoded = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf8"),
  );
  assert.equal(decoded.subnet, "192.168.1.0/24");
  assert.equal(decoded.exp, result.expiresAt);
  assert.ok(result.expiresAt > Date.now());
  assert.ok(result.expiresAt <= Date.now() + 30 * 60 * 1000);
});
