import { isIP } from "node:net";

/**
 * The production website is behind Cloudflare, which overwrites this header.
 * Do not trust X-Forwarded-For / X-Real-IP: visitors can supply those themselves.
 * Only identity is forwarded, never cookies, credentials, or privilege headers.
 */
export function cloudflareClientIdentity(headers: Headers): Record<string, string> {
  const ip = headers.get("cf-connecting-ip")?.trim();
  return ip && isIP(ip) ? { "cf-connecting-ip": ip } : {};
}
