import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getRequestHeaders } from "@tanstack/react-start/server";

const DEV_SECRET = "dev-web-ephemeral-key-secret-at-least-32-bytes";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface MintedWebToken {
  token: string | null;
  expiresAt: number | null;
}

/**
 * Extract client IP from request headers.
 * Order of precedence:
 * 1. cf-connecting-ip
 * 2. first IP in x-forwarded-for
 * 3. x-real-ip
 * 4. Fallback: "127.0.0.1"
 */
export function extractClientIp(
  headers?: Headers | Record<string, string | string[] | undefined>,
): string {
  const cfConnectingIp = getHeaderValue(headers, "cf-connecting-ip");
  if (cfConnectingIp?.trim()) {
    return cfConnectingIp.trim();
  }

  const xForwardedFor = getHeaderValue(headers, "x-forwarded-for");
  if (xForwardedFor?.trim()) {
    const firstIp = xForwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = getHeaderValue(headers, "x-real-ip");
  if (xRealIp?.trim()) {
    return xRealIp.trim();
  }

  return "127.0.0.1";
}

function getHeaderValue(
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name);
  }
  const obj = headers as Record<string, string | string[] | undefined>;
  const lowerName = name.toLowerCase();
  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === lowerName) {
      if (Array.isArray(v)) return v[0] ?? null;
      return typeof v === "string" ? v : null;
    }
  }
  return null;
}

/**
 * Compute the IP subnet string matching the Cloudflare Worker implementation:
 * - Empty/missing => "local"
 * - Trim; strip "::ffff:" if IPv4-mapped IPv6
 * - IPv4 => a.b.c.0/24
 * - IPv6 => expand :: to 8 groups, format first three groups as hex without leading zeros => g0:g1:g2::/48
 * - Otherwise => "local"
 */
export function computeIpSubnet(ip?: string | null): string {
  if (!ip || typeof ip !== "string") return "local";
  let cleanIp = ip.trim();
  if (cleanIp.toLowerCase().startsWith("::ffff:")) {
    cleanIp = cleanIp.slice(7);
  }

  const ipType = isIP(cleanIp);
  if (ipType === 4) {
    const parts = cleanIp.split(".");
    if (
      parts.length === 4 &&
      parts.every((p) => {
        const n = Number(p);
        return Number.isInteger(n) && n >= 0 && n <= 255 && String(n) === p;
      })
    ) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }

  if (ipType === 6) {
    const zoneIndex = cleanIp.indexOf("%");
    if (zoneIndex !== -1) {
      cleanIp = cleanIp.slice(0, zoneIndex);
    }

    const parts = cleanIp.split("::");
    let groups: string[] = [];
    if (parts.length === 2) {
      const left = parts[0] ? parts[0].split(":") : [];
      const right = parts[1] ? parts[1].split(":") : [];
      const omitted = 8 - (left.length + right.length);
      groups = [...left, ...Array.from({ length: omitted }, () => "0"), ...right];
    } else if (parts.length === 1) {
      groups = parts[0].split(":");
    }

    if (groups.length === 8) {
      const g = groups.slice(0, 3).map((group) => {
        const parsed = parseInt(group, 16);
        return Number.isNaN(parsed) ? "0" : parsed.toString(16);
      });
      return `${g[0]}:${g[1]}:${g[2]}::/48`;
    }
  }

  return "local";
}

/**
 * Signs an ephemeral web token egw_<base64url(payload)>.<sig> with a 30m TTL.
 */
export function mintWebEphemeralToken(subnet: string): MintedWebToken {
  const configuredSecret = process.env.WEB_EPHEMERAL_KEY_SECRET?.trim();
  const secret = configuredSecret || (process.env.NODE_ENV !== "production" ? DEV_SECRET : null);

  if (!secret) {
    return { token: null, expiresAt: null };
  }

  const exp = Date.now() + TTL_MS;
  const payload = { exp, subnet };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sigB64 = createHmac("sha256", secret).update(payloadB64).digest("base64url");

  return {
    token: `egw_${payloadB64}.${sigB64}`,
    expiresAt: exp,
  };
}

/**
 * Safely mints an ephemeral web token using client IP extracted from request headers.
 */
export function mintWebEphemeralTokenFromRequest(
  headers?: Headers | Record<string, string | string[] | undefined>,
): MintedWebToken {
  let resolvedHeaders = headers;
  if (!resolvedHeaders) {
    try {
      resolvedHeaders = getRequestHeaders();
    } catch {
      // In case called outside of active request context
    }
  }

  const clientIp = extractClientIp(resolvedHeaders);
  const subnet = computeIpSubnet(clientIp);
  return mintWebEphemeralToken(subnet);
}
