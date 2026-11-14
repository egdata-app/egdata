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

test("computeIpSubnet normalizes dotted IPv4-in-IPv6 suffix to /48", () => {
  assert.equal(
    computeIpSubnet("2001:db8:1234:0:0:0:192.0.2.1"),
    "2001:db8:1234::/48",
  );
});

test("computeIpSubnet handles empty or invalid IP addresses as local", () => {
  assert.equal(computeIpSubnet(""), "local");
  assert.equal(computeIpSubnet(null), "local");
  assert.equal(computeIpSubnet(undefined), "local");
  assert.equal(computeIpSubnet("invalid-ip"), "local");
});

test("extractClientIp extracts IP from headers with correct precedence when proxy trusted", () => {
  // 1. cf-connecting-ip
  const h1 = new Headers({
    "cf-connecting-ip": "1.2.3.4",
    "x-forwarded-for": "5.6.7.8, 9.10.11.12",
    "x-real-ip": "13.14.15.16",
  });
  assert.equal(extractClientIp(h1, { trustProxy: true }), "1.2.3.4");

  // 2. x-forwarded-for first IP
  const h2 = new Headers({
    "x-forwarded-for": "5.6.7.8, 9.10.11.12",
    "x-real-ip": "13.14.15.16",
  });
  assert.equal(extractClientIp(h2, { trustProxy: true }), "5.6.7.8");

  // 3. x-real-ip
  const h3 = new Headers({
    "x-real-ip": "13.14.15.16",
  });
  assert.equal(extractClientIp(h3, { trustProxy: true }), "13.14.15.16");

  // 4. fallback
  const h4 = new Headers({});
  assert.equal(extractClientIp(h4, { trustProxy: true }), "127.0.0.1");

  // Plain record support
  assert.equal(
    extractClientIp({ "CF-Connecting-IP": "20.30.40.50" }, { trustProxy: true }),
    "20.30.40.50",
  );
});

test("extractClientIp ignores untrusted proxy headers and uses peerIp or fallback", () => {
  const headers = new Headers({
    "cf-connecting-ip": "1.2.3.4",
    "x-forwarded-for": "5.6.7.8",
  });
  // trustProxy explicitly false
  assert.equal(
    extractClientIp(headers, { trustProxy: false, peerIp: "99.88.77.66" }),
    "99.88.77.66",
  );
  assert.equal(
    extractClientIp(headers, { trustProxy: false }),
    "127.0.0.1",
  );
});

test("mintWebEphemeralToken generates valid signed egw_ token in non-production", () => {
  const origNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "test";
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
  } finally {
    process.env.NODE_ENV = origNodeEnv;
  }
});

test("mintWebEphemeralToken rejects DEV_SECRET and missing/short secret in production", () => {
  const origNodeEnv = process.env.NODE_ENV;
  const origSecret = process.env.WEB_EPHEMERAL_KEY_SECRET;
  try {
    process.env.NODE_ENV = "production";

    // Unset or empty secret in production -> returns null
    delete process.env.WEB_EPHEMERAL_KEY_SECRET;
    assert.deepEqual(mintWebEphemeralToken("192.168.1.0/24"), {
      token: null,
      expiresAt: null,
    });

    // Too short secret in production (< 32 chars) -> returns null
    process.env.WEB_EPHEMERAL_KEY_SECRET = "too-short-secret-less-than-32";
    assert.deepEqual(mintWebEphemeralToken("192.168.1.0/24"), {
      token: null,
      expiresAt: null,
    });

    // Valid 32+ char secret in production -> succeeds
    process.env.WEB_EPHEMERAL_KEY_SECRET = "production-super-secret-key-that-is-at-least-32-chars-long";
    const res = mintWebEphemeralToken("192.168.1.0/24");
    assert.ok(res.token);
    assert.ok(res.expiresAt);
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origSecret !== undefined) {
      process.env.WEB_EPHEMERAL_KEY_SECRET = origSecret;
    } else {
      delete process.env.WEB_EPHEMERAL_KEY_SECRET;
    }
  }
});
