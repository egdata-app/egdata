#!/usr/bin/env node

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import * as zlib from "node:zlib";

const clientDist = resolve(process.cwd(), "dist/client");
const compressibleExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".wasm",
  ".webmanifest",
  ".xml",
]);
const sidecarExtensions = new Set([".br", ".gz", ".zst"]);
const minSize = Number.parseInt(process.env.PRECOMPRESS_MIN_BYTES ?? "1024", 10);
const maxBrotliSize = Number.parseInt(process.env.PRECOMPRESS_BROTLI_MAX_BYTES ?? "2500000", 10);
const brotliQuality = Number.parseInt(process.env.PRECOMPRESS_BROTLI_QUALITY ?? "9", 10);
const gzipLevel = Number.parseInt(process.env.PRECOMPRESS_GZIP_LEVEL ?? "9", 10);
const zstdLevel = Number.parseInt(process.env.PRECOMPRESS_ZSTD_LEVEL ?? "6", 10);

const stats = {
  files: 0,
  br: 0,
  gzip: 0,
  zstd: 0,
};

await stat(clientDist);

for await (const filePath of walk(clientDist)) {
  const ext = extname(filePath);
  if (sidecarExtensions.has(ext) || !compressibleExtensions.has(ext)) continue;

  const input = await readFile(filePath);
  if (input.byteLength < minSize) continue;

  stats.files++;

  if (input.byteLength <= maxBrotliSize) {
    const output = zlib.brotliCompressSync(input, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: brotliQuality,
      },
    });

    if (await writeIfSmaller(filePath, ".br", input, output)) stats.br++;
  }

  if (typeof zlib.zstdCompressSync === "function") {
    const output = zlib.zstdCompressSync(input, {
      params: {
        [zlib.constants.ZSTD_c_compressionLevel]: zstdLevel,
      },
    });

    if (await writeIfSmaller(filePath, ".zst", input, output)) stats.zstd++;
  }

  const gzipOutput = zlib.gzipSync(input, { level: gzipLevel });
  if (await writeIfSmaller(filePath, ".gz", input, gzipOutput)) stats.gzip++;
}

console.log(
  `Precompressed ${stats.files} files (${stats.br} br, ${stats.zstd} zstd, ${stats.gzip} gzip).`,
);

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const childPath = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walk(childPath);
    } else if (entry.isFile()) {
      yield childPath;
    }
  }
}

async function writeIfSmaller(sourcePath, extension, input, output) {
  if (output.byteLength >= input.byteLength) return false;

  const targetPath = `${sourcePath}${extension}`;
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, output);
  return true;
}
