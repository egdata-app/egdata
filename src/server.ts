import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { resolve } from "node:path";
import { serveStatic } from "srvx/static";
import type { ServerMiddleware } from "srvx";
import { SECURITY_HEADERS } from "@/lib/security-headers";
import {
  captureError,
  flushPulseTelemetry,
  initPulseServerTelemetry,
} from "@/lib/pulse-telemetry/server";

initPulseServerTelemetry();

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
  async fetch(request) {
    try {
      return await handler.fetch(request);
    } catch (error) {
      captureError(error, {
        request,
        source: "server.fetch",
      });
      if (request.cloudflare) {
        request.cloudflare.waitUntil(flushPulseTelemetry());
      } else {
        void flushPulseTelemetry();
      }
      throw error;
    }
  },
});

export default {
  ...entry,
  middleware: [securityHeadersMiddleware, serveStatic({ dir: clientDist })],
};
