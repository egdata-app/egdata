import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { resolve } from "node:path";
import { serveStatic } from "srvx/static";
import type { ServerMiddleware } from "srvx";
import { SECURITY_HEADERS } from "@/lib/security-headers";

const withSecurityHeaders = (response: Response) => {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const securityHeadersMiddleware: ServerMiddleware = async (_request, next) => {
  return withSecurityHeaders(await next());
};

const clientDist = resolve(process.cwd(), "dist/client");

const entry = createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});

export default {
  ...entry,
  middleware: [securityHeadersMiddleware, serveStatic({ dir: clientDist })],
};
