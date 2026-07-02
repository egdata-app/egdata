import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import * as zlib from "node:zlib";
import { FastResponse } from "srvx";
import type { ServerMiddleware } from "srvx";

type ContentEncoding = "br" | "gzip" | "zstd";

type ZlibWithZstd = typeof zlib & {
  createZstdCompress?: (options?: unknown) => NodeJS.ReadWriteStream;
};

interface ServeStaticAssetsOptions {
  dir: string;
  methods?: string[];
}

const zlibWithZstd = zlib as ZlibWithZstd;

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/vnd.microsoft.icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".zip": "application/zip",
};

const SIDECAR_ENCODINGS: Array<{ encoding: ContentEncoding; extension: string }> = [
  { encoding: "br", extension: ".br" },
  { encoding: "zstd", extension: ".zst" },
  { encoding: "gzip", extension: ".gz" },
];

const MIN_DYNAMIC_COMPRESSION_BYTES = 1024;
const STATIC_IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const DEFAULT_CACHE = "public, max-age=3600";
const HTML_CACHE = "no-cache";

export const serveStaticAssets = (options: ServeStaticAssetsOptions): ServerMiddleware => {
  const dir = resolve(options.dir);
  const dirPrefix = dir.endsWith(sep) ? dir : `${dir}${sep}`;
  const methods = new Set(
    (options.methods ?? ["GET", "HEAD"]).map((method) => method.toUpperCase()),
  );

  return async (request, next) => {
    if (!methods.has(request.method)) return next();

    const url = new URL(request.url);
    const candidates = getPathCandidates(url.pathname);

    for (const candidate of candidates) {
      const filePath = resolve(dir, candidate);
      if (!isPathInsideDir(filePath, dir, dirPrefix)) continue;

      const fileStat = await stat(filePath).catch(() => null);
      if (!fileStat?.isFile()) continue;

      const fileExt = extname(filePath);
      const contentType = MIME_TYPES[fileExt] ?? "application/octet-stream";
      const headers = new Headers({
        "Accept-Ranges": "bytes",
        "Cache-Control": getCacheControl(candidate, fileExt),
        "Content-Type": contentType,
        ETag: createWeakEtag(fileStat.size, fileStat.mtimeMs),
        "Last-Modified": fileStat.mtime.toUTCString(),
      });

      if (isNotModified(request, headers)) {
        return createStaticResponse(null, {
          status: 304,
          headers,
        });
      }

      const acceptedEncodings = parseAcceptEncoding(request.headers.get("accept-encoding"));
      const selectedSidecar = await findSidecar(filePath, fileStat.mtimeMs, acceptedEncodings);
      const isHead = request.method === "HEAD";

      if (selectedSidecar) {
        headers.set("Content-Encoding", selectedSidecar.encoding);
        headers.set("Content-Length", selectedSidecar.size.toString());
        headers.set("Vary", "Accept-Encoding");

        return createStaticResponse(isHead ? null : createReadStream(selectedSidecar.path), {
          headers,
        });
      }

      const dynamicEncoding = chooseDynamicEncoding(fileStat.size, contentType, acceptedEncodings);
      if (dynamicEncoding) {
        headers.set("Content-Encoding", dynamicEncoding.encoding);
        headers.set("Vary", "Accept-Encoding");

        const stream = isHead
          ? null
          : createReadStream(filePath).pipe(dynamicEncoding.createStream());

        return createStaticResponse(stream, { headers });
      }

      headers.set("Content-Length", fileStat.size.toString());

      return createStaticResponse(isHead ? null : createReadStream(filePath), {
        headers,
      });
    }

    return next();
  };
};

function createStaticResponse(body: NodeJS.ReadableStream | null, init: ResponseInit) {
  return new FastResponse(body as unknown as BodyInit | null, init);
}

function getPathCandidates(pathname: string) {
  const decodedPathname = decodePathname(pathname);
  if (!decodedPathname) return [];

  const path = decodedPathname.slice(1).replace(/\/$/, "");
  if (path === "") return ["index.html"];
  if (extname(path) === "") return [`${path}.html`, `${path}/index.html`];
  return [path];
}

function decodePathname(pathname: string) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function isPathInsideDir(filePath: string, dir: string, dirPrefix: string) {
  return filePath === dir || filePath.startsWith(dirPrefix);
}

function createWeakEtag(size: number, mtimeMs: number) {
  return `W/"${size.toString(16)}-${Math.floor(mtimeMs).toString(16)}"`;
}

function isNotModified(request: Request, headers: Headers) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === headers.get("etag")) return true;

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (!ifModifiedSince) return false;

  const lastModified = headers.get("last-modified");
  return Boolean(lastModified && Date.parse(ifModifiedSince) >= Date.parse(lastModified));
}

function getCacheControl(path: string, fileExt: string) {
  if (path === "sw.js") return "no-cache, no-store, max-age=0, must-revalidate";
  if (path.startsWith("static/")) return STATIC_IMMUTABLE_CACHE;
  if (fileExt === ".html") return HTML_CACHE;
  return DEFAULT_CACHE;
}

function parseAcceptEncoding(header: string | null) {
  const accepted = new Map<string, number>();
  if (!header) return accepted;

  for (const rawPart of header.split(",")) {
    const [rawEncoding, ...rawParams] = rawPart.trim().split(";");
    const encoding = rawEncoding.trim().toLowerCase();
    if (!encoding) continue;

    const qParam = rawParams.find((param) => param.trim().startsWith("q="));
    const q = qParam ? Number.parseFloat(qParam.split("=")[1]) : 1;
    if (Number.isFinite(q) && q > 0) accepted.set(encoding, q);
  }

  return accepted;
}

function acceptsEncoding(accepted: Map<string, number>, encoding: ContentEncoding) {
  return accepted.has(encoding) || accepted.has("*");
}

async function findSidecar(filePath: string, sourceMtimeMs: number, accepted: Map<string, number>) {
  for (const { encoding, extension } of SIDECAR_ENCODINGS) {
    if (!acceptsEncoding(accepted, encoding)) continue;

    const sidecarPath = `${filePath}${extension}`;
    const sidecarStat = await stat(sidecarPath).catch(() => null);
    if (!sidecarStat?.isFile()) continue;

    if (sidecarStat.mtimeMs + 1000 < sourceMtimeMs) continue;

    return {
      encoding,
      path: sidecarPath,
      size: sidecarStat.size,
    };
  }

  return null;
}

function chooseDynamicEncoding(size: number, contentType: string, accepted: Map<string, number>) {
  if (size < MIN_DYNAMIC_COMPRESSION_BYTES || !isCompressible(contentType)) return null;

  if (zlibWithZstd.createZstdCompress && acceptsEncoding(accepted, "zstd")) {
    return {
      encoding: "zstd" as const,
      createStream: () => zlibWithZstd.createZstdCompress!(),
    };
  }

  if (acceptsEncoding(accepted, "gzip")) {
    return {
      encoding: "gzip" as const,
      createStream: () => zlib.createGzip(),
    };
  }

  return null;
}

function isCompressible(contentType: string) {
  return (
    contentType.startsWith("text/") ||
    contentType.includes("javascript") ||
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("svg") ||
    contentType === "application/wasm"
  );
}
