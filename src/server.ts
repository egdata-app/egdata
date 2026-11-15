import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { resolve } from "node:path";
import type { ServerMiddleware } from "srvx";
import "@/lib/paraglide-strategy";
import { paraglideMiddleware } from "@/paraglide/server.js";
import { SECURITY_HEADERS } from "@/lib/security-headers";
import { getServiceWorkerCacheControl, serveStaticAssets } from "@/lib/static-assets";

const withSecurityHeaders = (request: Request, response: Response) => {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.pathname === "/sw.js") {
    headers.set("Cache-Control", getServiceWorkerCacheControl(requestUrl));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const securityHeadersMiddleware: ServerMiddleware = async (request, next) => {
  return withSecurityHeaders(request, await next());
};

const clientDist = resolve(process.cwd(), "dist/client");

const entry = createServerEntry({
  async fetch(request) {
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
});

export default {
  ...entry,
  middleware: [securityHeadersMiddleware, serveStaticAssets({ dir: clientDist })],
};
