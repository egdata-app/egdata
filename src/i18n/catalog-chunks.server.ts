/**
 * Server-only: resolve the built catalog chunk URL for each locale from the
 * Rsbuild manifest, so the document can modulepreload the active locale's
 * catalog and the client entry does not wait an extra round trip to hydrate.
 *
 * Absent in dev (no manifest); then no preload is emitted and the client entry
 * falls back to fetching the chunk itself.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setCatalogChunkResolver } from "@/lib/i18n";

const MANIFEST_PATH = resolve(process.cwd(), "dist", "client", "manifest.json");
const ASSET_PREFIX = process.env.ASSET_PREFIX?.trim().replace(/\/+$/, "") ?? "";
const CATALOG_CHUNK = /(?:^|\/)i18n\/([^/]+)\.[0-9a-f]+\.js$/;

function readCatalogChunks(): Record<string, string> {
  const chunks: Record<string, string> = {};

  try {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as { allFiles?: string[] };

    for (const file of manifest.allFiles ?? []) {
      const match = CATALOG_CHUNK.exec(file);

      if (!match) continue;

      const normalized = file.startsWith("/") ? file : `/${file}`;

      chunks[decodeURIComponent(match[1])] = `${ASSET_PREFIX}${normalized}`;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[i18n] catalog manifest unavailable, skipping modulepreload", error);
    }
  }

  return chunks;
}

const catalogChunks = readCatalogChunks();

setCatalogChunkResolver((locale) => catalogChunks[locale]);
