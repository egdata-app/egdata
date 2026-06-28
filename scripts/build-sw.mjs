import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import workboxBuild from "workbox-build";

const { injectManifest } = workboxBuild;

const root = process.cwd();
const tempDir = resolve(root, ".tanstack", "sw");
const tempSw = resolve(tempDir, "sw.js");
const clientDist = resolve(root, "dist", "client");
const swDest = resolve(clientDist, "sw.js");

await mkdir(tempDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "src", "sw.ts")],
  outfile: tempSw,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
  },
});

const { count, size, warnings } = await injectManifest({
  swSrc: tempSw,
  swDest,
  globDirectory: clientDist,
  globPatterns: ["*.{ico,png,svg,webp,webmanifest}", "css/*.css", "offline.html"],
  globIgnores: ["sw.js", "sw.js.map", "static/js/**", "static/css/**"],
});

for (const warning of warnings) {
  console.warn(warning);
}

console.log(`Generated ${swDest} with ${count} precache entries (${size} bytes).`);

await rm(tempDir, { recursive: true, force: true });
