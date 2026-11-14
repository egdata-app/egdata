import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getRequestHeaders } from "@tanstack/react-start/server";

export const DEV_SECRET = "dev-web-ephemeral-key-secret-at-least-32-bytes";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface MintedWebToken {
  token: string | null;
  expiresAt: number | null;
}

export interface ClientIpOptions {
  peerIp?: string | null;
  trustProxy?: boolean;
}

function parseIpv4(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255 || (part.length > 1 && part.startsWith("0"))) return null;
    out = (out << 8) | n;
  }
  return out >>> 0;
}

/**
 * Validates and cleans a raw IP address string, stripping ::ffff: and zone identifiers.
 * Normalizes trailing IPv4 dotted decimal in IPv6 addresses for valid isIP detection.
 */
export function cleanAndValidateIp(rawIp?: string | null): string | null {
  if (!rawIp || typeof rawIp !== "string") return null;
  let ip = rawIp.trim();
  if (ip.toLowerCase().startsWith("::ffff:")) {
    ip = ip.slice(7);
  }
  const zoneIndex = ip.indexOf("%");
  if (zoneIndex !== -1) {
    ip = ip.slice(0, zoneIndex);
  }

  // Handle trailing IPv4 in IPv6 for validation
  let normalized = ip;
  const lastColon = normalized.lastIndexOf(":");
  if (lastColon !== -1 && normalized.slice(lastColon + 1).includes(".")) {
    const v4 = parseIpv4(normalized.slice(lastColon + 1));
    if (v4 !== null) {
      const hi = ((v4 >>> 16) & 0xffff).toString(16);
      const lo = (v4 & 0xffff).toString(16);
      normalized = `${normalized.slice(0, lastColon)}:${hi}:${lo}`;
    }
  }

  return isIP(normalized) !== 0 ? ip : null;
}

/**
 * Extract client IP from request headers or socket peer.
 * In production, egdata runs behind Cloudflare (which sets and overwrites cf-connecting-ip at the edge).
 * Proxy trust is determined via options.trustProxy, TRUST_PROXY env var, CF-Ray header presence, or non-production mode.
 */
export function extractClientIp(
  headers?: Headers | Record<string, string | string[] | undefined>,
  options?: ClientIpOptions,
): string {
  const trustProxy =
    options?.trustProxy ??
    (process.env.TRUST_PROXY !== "false" &&
      (Boolean(getHeaderValue(headers, "cf-ray")) ||
        process.env.TRUST_PROXY === "true" ||
        process.env.NODE_ENV !== "production"));

  if (trustProxy) {
    const cfConnectingIp = cleanAndValidateIp(getHeaderValue(headers, "cf-connecting-ip"));
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    const xForwardedFor = getHeaderValue(headers, "x-forwarded-for");
    if (xForwardedFor) {
      const firstIp = cleanAndValidateIp(xForwardedFor.split(",")[0]?.trim());
      if (firstIp) {
        return firstIp;
      }
    }

    const xRealIp = cleanAndValidateIp(getHeaderValue(headers, "x-real-ip"));
    if (xRealIp) {
      return xRealIp;
    }
  }

  const peerIp = cleanAndValidateIp(options?.peerIp);
  if (peerIp) {
    return peerIp;
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
 * - Normalize dotted IPv4-in-IPv6 suffix (e.g. 2001:db8:1234:0:0:0:192.0.2.1)
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

  // Dotted IPv4-in-IPv6 suffix normalization (matching Worker permissions.ts parseIpv6)
  const lastColon = cleanIp.lastIndexOf(":");
  if (cleanIp.includes(":") && lastColon !== -1 && cleanIp.slice(lastColon + 1).includes(".")) {
    const v4 = parseIpv4(cleanIp.slice(lastColon + 1));
    if (v4 !== null) {
      const hi = ((v4 >>> 16) & 0xffff).toString(16);
      const lo = (v4 & 0xffff).toString(16);
      cleanIp = `${cleanIp.slice(0, lastColon)}:${hi}:${lo}`;
    }
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
 * In production, rejects DEV_SECRET and enforces configured secret >= 32 chars.
 */
export function mintWebEphemeralToken(subnet: string): MintedWebToken {
  const configuredSecret = process.env.WEB_EPHEMERAL_KEY_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  let secret: string | null = null;
  if (isProd) {
    if (!configuredSecret || configuredSecret === DEV_SECRET || configuredSecret.length < 32) {
      return { token: null, expiresAt: null };
    }
    secret = configuredSecret;
  } else {
    secret = configuredSecret || DEV_SECRET;
    if (secret.length < 32) {
      return { token: null, expiresAt: null };
    }
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
  options?: ClientIpOptions,
): MintedWebToken {
  let resolvedHeaders = headers;
  if (!resolvedHeaders) {
    try {
      resolvedHeaders = getRequestHeaders();
    } catch {
      // In case called outside of active request context
    }
  }

  const clientIp = extractClientIp(resolvedHeaders, options);
  const subnet = computeIpSubnet(clientIp);
  return mintWebEphemeralToken(subnet);
}
