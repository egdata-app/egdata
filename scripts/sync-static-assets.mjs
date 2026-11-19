#!/usr/bin/env node
// Syncs the built client static assets (dist/client) to a Cloudflare R2 bucket
// so the CDN can serve them instead of the origin server.
//
// - Talks to the R2 S3-compatible API directly (SigV4, no SDK dependency).
// - Files are compared by MD5 against the bucket listing; only changed files
//   are uploaded.
// - Hashed build outputs (assets/, static/) get immutable one-year caching.
// - Precompressed sidecars (.br/.gz/.zst) are stored with Content-Encoding so
//   gateways can serve them without recompressing.
// - Service worker files are skipped: they must be served same-origin and can
//   never be moved to a CDN hostname.
//
// Required environment variables:
//   R2_ACCOUNT_ID     Cloudflare account ID
//   R2_ACCESS_KEY_ID   R2 API token access key ID
//   R2_SECRET_ACCESS_KEY  R2 API token secret
//   SYNC_STATIC_BUCKET    (or --bucket) bucket name
//
// CLI: node scripts/sync-static-assets.mjs [--bucket=x] [--dir=x] [--prune]
//         [--dry-run] [--force] [--exclude-maps] [--concurrency=n]
//         [--setup-cors]

import { createHash, createHmac } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const R2_REGION = "auto";
const R2_SERVICE = "s3";
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const SW_PATH_PATTERN = /^sw(\.[^.]+)?\.js(\.(br|gz|zst))?$/;
const MAP_PATH_PATTERN = /\.map(\.(br|gz|zst))?$/;

const SIDECAR_ENCODINGS = {
  ".br": "br",
  ".gz": "gzip",
  ".zst": "zstd",
};

const MIME_TYPES = {
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

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const HTML_CACHE = "no-cache";
const DEFAULT_CACHE = "public, max-age=3600";

const CORS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>https://egdata.app</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;

/**
 * Sync dist/client into an R2 bucket.
 *
 * @param {object} options
 * @param {string} options.bucket Bucket name.
 * @param {string} [options.dir] Local asset directory, defaults to dist/client.
 * @param {boolean} [options.prune] Delete bucket objects missing locally.
 * @param {boolean} [options.dryRun] Report the plan without writing.
 * @param {boolean} [options.force] Re-upload even when MD5 matches.
 * @param {boolean} [options.excludeMaps] Skip source maps and their sidecars.
 * @param {number} [options.concurrency] Parallel uploads, defaults to 8.
 * @param {boolean} [options.setupCors] Apply the app CORS rule to the bucket.
 * @param {(line: string) => void} [options.logger]
 * @returns {Promise<string>} Human-readable summary.
 */
export async function syncStaticAssets(options = {}) {
  const {
    bucket,
    dir = resolve(process.cwd(), "dist/client"),
    prune = false,
    dryRun = false,
    force = false,
    excludeMaps = false,
    concurrency = 8,
    setupCors = false,
    logger = console.log,
  } = options;

  if (!bucket) throw new Error("A bucket name is required.");
  await stat(dir);

  const started = performance.now();
  const localFiles = await walk(dir);
  const remoteFiles = await listObjects(bucket);

  /** @type {Map<string, {relPath: string, bytes: Buffer, md5: string, metadata: object}>} */
  const queue = new Map();
  const localNames = new Set();
  const stats = { uploaded: 0, uploadedBytes: 0, unchanged: 0, sw: 0, maps: 0, pruned: 0, failures: 0 };

  for (const filePath of localFiles) {
    const relPath = toPosix(relative(dir, filePath));
    localNames.add(relPath);

    if (relPath === "sw.js" || SW_PATH_PATTERN.test(relPath)) {
      stats.sw++;
      continue;
    }

    if (excludeMaps && MAP_PATH_PATTERN.test(relPath)) {
      stats.maps++;
      continue;
    }

    const bytes = await readFile(filePath);
    const md5 = createHash("md5").update(bytes).digest("hex");

    if (!force && remoteFiles.get(relPath) === md5) {
      stats.unchanged++;
      continue;
    }

    queue.set(relPath, { relPath, bytes, md5, metadata: metadataFor(relPath) });
  }

  const pendingDeletes = prune ? [...remoteFiles.keys()].filter((name) => !localNames.has(name)) : [];

  if (dryRun) {
    for (const [relPath, entry] of queue) {
      logger(`[dry-run] upload ${relPath} (${formatBytes(entry.bytes.byteLength)}) ${entry.metadata.cacheControl}`);
    }
    for (const name of pendingDeletes) {
      logger(`[dry-run] delete ${name}`);
    }
    return planSummary(stats, queue, pendingDeletes, started);
  }

  if (setupCors) {
    const corsBody = Buffer.from(CORS_XML, "utf8");
    await s3Request(bucket, {
      method: "PUT",
      query: { cors: null },
      headers: {
        "Content-Type": "application/xml",
        "Content-MD5": createHash("md5").update(corsBody).digest("base64"),
      },
      body: corsBody,
    });
    logger("applied bucket CORS rule (origin https://egdata.app)");
  }

  const failures = [];

  await runPool([...queue.values()], concurrency, async (entry) => {
    try {
      await s3Request(bucket, {
        key: entry.relPath,
        method: "PUT",
        headers: {
          "Cache-Control": entry.metadata.cacheControl,
          "Content-Type": entry.metadata.contentType,
          ...(entry.metadata.contentEncoding ? { "Content-Encoding": entry.metadata.contentEncoding } : {}),
        },
        body: entry.bytes,
      });
      stats.uploaded++;
      stats.uploadedBytes += entry.bytes.byteLength;
      logger(`uploaded ${entry.relPath} (${formatBytes(entry.bytes.byteLength)})`);
    } catch (error) {
      stats.failures++;
      failures.push({ relPath: entry.relPath, error });
      logger(`failed ${entry.relPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  if (prune) {
    await runPool(pendingDeletes, concurrency, async (name) => {
      try {
        await s3Request(bucket, { key: name, method: "DELETE" });
        stats.pruned++;
        logger(`pruned ${name}`);
      } catch (error) {
        stats.failures++;
        failures.push({ relPath: name, error });
        logger(`failed to prune ${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  if (failures.length > 0) {
    const first = failures[0];
    throw new Error(
      `Static asset sync failed for ${failures.length} file(s). First failure: ${first.relPath}: ${first.error instanceof Error ? first.error.message : String(first.error)}`,
    );
  }

  return (
    `uploaded ${stats.uploaded} (${formatBytes(stats.uploadedBytes)}), ` +
    `unchanged ${stats.unchanged}, ` +
    `skipped sw ${stats.sw}, ` +
    `maps ${stats.maps}, ` +
    `pruned ${stats.pruned} ` +
    `in ${Math.round(performance.now() - started)}ms`
  );
}

function metadataFor(relPath) {
  let ext = extname(relPath);
  let contentEncoding;

  if (SIDECAR_ENCODINGS[ext]) {
    contentEncoding = SIDECAR_ENCODINGS[ext];
    ext = extname(relPath.slice(0, -ext.length));
  }

  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  const cacheControl =
    relPath.startsWith("assets/") || relPath.startsWith("static/")
      ? IMMUTABLE_CACHE
      : ext === ".html"
        ? HTML_CACHE
        : DEFAULT_CACHE;

  return { cacheControl, contentType, ...(contentEncoding ? { contentEncoding } : {}) };
}

function requireCredentials() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
  }

  return { accountId, accessKeyId, secretAccessKey };
}

function r2Endpoint(accountId) {
  return process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`;
}

async function s3Request(bucket, init, attempts = 3) {
  const { accountId, accessKeyId, secretAccessKey } = requireCredentials();
  const url = new URL(`${r2Endpoint(accountId)}/${bucket}`);

  if (init.key) {
    url.pathname = `/${bucket}/${init.key.split("/").map(uriEncode).join("/")}`;
  }

  const method = init.method ?? "GET";
  const body = init.body ?? null;
  const payloadHash = body ? createHash("sha256").update(body).digest("hex") : EMPTY_SHA256;

  const headers = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    ...(init.headers ?? {}),
  };

  const extraQuery = init.query ?? {};
  for (const [name, value] of Object.entries(extraQuery)) {
    url.searchParams.set(name, value ?? "");
  }

  const now = new Date();
  const amzDate = `${now.toISOString().replaceAll("-", "").replaceAll(":", "").slice(0, 15)}Z`;
  const dateScope = amzDate.slice(0, 8);

  headers["x-amz-date"] = amzDate;

  const signedHeaders = Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort();

  const canonicalHeaders = signedHeaders
    .map((name) => {
      const value = Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1] ?? "";
      return `${name}:${String(value).trim()}\n`;
    })
    .join("");

  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQueryString(url),
    canonicalHeaders,
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${dateScope}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const signingKey = [dateScope, R2_REGION, R2_SERVICE, "aws4_request"].reduce(
    (key, data) => createHmac("sha256", key).update(data).digest(),
    `AWS4${secretAccessKey}`,
  );

  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  headers.Authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`;

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: Object.fromEntries(Object.entries(headers).filter(([name]) => name !== "host")),
        body: body ? new Uint8Array(body) : undefined,
      });

      if (response.ok || (response.status === 404 && method === "DELETE")) {
        return { status: response.status, text: await response.text() };
      }

      const errorBody = (await response.text()).slice(0, 300);
      throw new Error(`R2 responded ${response.status}: ${errorBody}`);
    } catch (error) {
      lastError = error;

      if (attempt < attempts) {
        await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 500));
      }
    }
  }

  throw lastError;
}

function canonicalQueryString(url) {
  return [...url.searchParams.entries()]
    .map(([name, value]) => [uriEncode(name), uriEncode(value)])
    .sort(([aName, aVal], [bName, bVal]) =>
      aName < bName ? -1 : aName > bName ? 1 : aVal < bVal ? -1 : aVal > bVal ? 1 : 0,
    )
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
}

function uriEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function listObjects(bucket) {
  const objects = new Map();
  let continuationToken;

  do {
    const response = await s3Request(bucket, {
      method: "GET",
      query: {
        "list-type": "2",
        "max-keys": "1000",
        ...(continuationToken ? { "continuation-token": continuationToken } : {}),
      },
    });

    const xml = response.text;
    const isTruncated = xml.includes("<IsTruncated>true</IsTruncated>");
    continuationToken = isTruncated ? decodeEntities(tagValue(xml, "NextContinuationToken")) : undefined;

    for (const block of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = decodeEntities(tagValue(block[1], "Key"));
      const etag = decodeEntities(tagValue(block[1], "ETag")).replace(/"/g, "");
      if (key && etag) objects.set(key, etag.toLowerCase());
    }
  } while (continuationToken);

  return objects;
}

function tagValue(source, tag) {
  return source.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? "";
}

function decodeEntities(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

async function runPool(items, concurrency, worker) {
  let index = 0;

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
    }
  });

  await Promise.all(runners);
}

function toPosix(path) {
  return sep === "\\" ? path.replaceAll("\\", "/") : path;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

function planSummary(stats, queue, pendingDeletes, started) {
  let bytes = 0;
  for (const entry of queue.values()) bytes += entry.bytes.byteLength;

  return (
    `dry-run: would upload ${queue.size} (${formatBytes(bytes)}), ` +
    `unchanged ${stats.unchanged}, ` +
    `sw ${stats.sw}, ` +
    `maps ${stats.maps}, ` +
    `would prune ${pendingDeletes.length} ` +
    `in ${Math.round(performance.now() - started)}ms`
  );
}

function parseArgs(argv) {
  const flags = {
    bucket: process.env.SYNC_STATIC_BUCKET?.trim() ?? process.env.R2_BUCKET?.trim(),
    dir: undefined,
    prune: process.env.SYNC_STATIC_PRUNE === "true",
    dryRun: false,
    force: false,
    excludeMaps: process.env.SYNC_STATIC_EXCLUDE_MAPS === "true",
    setupCors: false,
    concurrency: 8,
  };

  for (const arg of argv) {
    if (arg === "--prune") flags.prune = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--force") flags.force = true;
    else if (arg === "--exclude-maps") flags.excludeMaps = true;
    else if (arg === "--setup-cors") flags.setupCors = true;
    else if (arg.startsWith("--bucket=")) flags.bucket = arg.slice("--bucket=".length);
    else if (arg.startsWith("--dir=")) flags.dir = arg.slice("--dir=".length);
    else if (arg.startsWith("--concurrency=")) {
      const parsed = Number.parseInt(arg.slice("--concurrency=".length), 10);
      if (Number.isFinite(parsed) && parsed > 0) flags.concurrency = parsed;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return flags;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const flags = parseArgs(process.argv.slice(2));

  if (!flags.bucket) {
    console.error("Missing bucket. Pass --bucket=<name> or set SYNC_STATIC_BUCKET.");
    process.exit(1);
  }

  try {
    const summary = await syncStaticAssets({
      bucket: flags.bucket,
      ...(flags.dir ? { dir: resolve(flags.dir) } : {}),
      prune: flags.prune,
      dryRun: flags.dryRun,
      force: flags.force,
      excludeMaps: flags.excludeMaps,
      concurrency: flags.concurrency,
      setupCors: flags.setupCors,
    });

    console.log(`Static asset sync: ${summary}`);
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  }
}
