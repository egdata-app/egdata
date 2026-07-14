import { createServer } from "node:http";
import { createProfilePageResponse, isProfilePageRequest } from "./profile-fixture.mjs";
import { createBuildPageResponse } from "./build-fixture.mjs";

const port = Number(process.env.E2E_API_PROXY_PORT ?? "3101");
const upstreamUrl = process.env.E2E_API_UPSTREAM ?? "https://api.egdata.app";

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"ok":true}');
    return;
  }

  if (request.method === "GET") {
    const buildResponse = createBuildPageResponse(url);
    if (buildResponse) {
      sendJson(response, buildResponse);
      return;
    }
  }

  const body = await readBody(request);
  const payload = parseJson(body);

  if (request.method === "POST" && url.pathname === "/graphql" && isProfilePageRequest(payload)) {
    sendJson(response, createProfilePageResponse(payload.variables));
    return;
  }

  await proxyRequest(request, response, body);
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

function parseJson(body) {
  if (!body) return null;

  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    return null;
  }
}

function sendJson(response, body) {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function proxyRequest(request, response, body) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined || ["connection", "content-length", "host"].includes(name)) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  const upstream = await fetch(new URL(request.url ?? "/", upstreamUrl), {
    method: request.method,
    headers,
    body,
  });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  response.writeHead(upstream.status, Object.fromEntries(responseHeaders));
  response.end(Buffer.from(await upstream.arrayBuffer()));
}
