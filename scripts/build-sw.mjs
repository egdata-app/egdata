import { rm, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { injectManifest } from "workbox-build";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = resolve(root, "node_modules/.cache/egdata");
const tempSw = resolve(tempDir, "sw.js");
const outSw = resolve(root, "dist/client/sw.js");

await mkdir(tempDir, { recursive: true });

await esbuild.build({
  entryPoints: [resolve(root, "src/sw.ts")],
  outfile: tempSw,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
});

const { count, size, warnings } = await injectManifest({
  swSrc: tempSw,
  swDest: outSw,
  globDirectory: resolve(root, "dist/client"),
  globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,ttf}"],
  globIgnores: ["sw.js", "workbox-*.js", "**/*.map"],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
});

for (const warning of warnings) {
  console.warn(warning);
}

await rm(tempSw, { force: true });

console.log(`Injected ${count} precache entries (${size} bytes) into ${outSw}`);
