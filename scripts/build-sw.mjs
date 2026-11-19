import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import workboxBuild from "workbox-build";

const { injectManifest } = workboxBuild;

/**
 * Bundle `src/sw.ts`, inject the Workbox precache manifest from `public/`,
 * and return the built script buffer along with its SHA-256 content hash.
 *
 * @param {string} [root]
 * @returns {Promise<{ code: Buffer; hash: string; count: number; size: number; warnings: string[] }>}
 */
export async function buildServiceWorker(root = process.cwd()) {
  const tempDir = resolve(root, ".tanstack", "sw");
  const tempSrc = resolve(tempDir, "sw-src.js");
  const tempOut = resolve(tempDir, "sw.js");
  const publicDir = resolve(root, "public");

  await mkdir(tempDir, { recursive: true });

  try {
    await build({
      entryPoints: [resolve(root, "src", "sw.ts")],
      outfile: tempSrc,
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
      swSrc: tempSrc,
      swDest: tempOut,
      globDirectory: publicDir,
      globPatterns: ["*.{ico,png,svg,webp,webmanifest}", "css/*.css", "offline.html"],
      globIgnores: ["sw.js", "sw.js.map", "static/js/**", "static/css/**"],
    });

    const code = await readFile(tempOut);
    const hash = createHash("sha256").update(code).digest("hex").slice(0, 16);

    return { code, hash, count, size, warnings };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * @param {string} destPath
 * @param {Buffer} code
 */
export async function writeServiceWorker(destPath, code) {
  await mkdir(dirname(destPath), { recursive: true });
  await writeFile(destPath, code);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const root = process.cwd();
  const { code, hash, count, size, warnings } = await buildServiceWorker(root);
  const swVersion = process.env.VITE_SW_VERSION || hash;

  for (const warning of warnings) {
    console.warn(warning);
  }

  const swDest = resolve(root, "dist", "client", `sw.${swVersion}.js`);
  await writeServiceWorker(swDest, code);
  console.log(`Generated ${swDest} (${hash}) with ${count} precache entries (${size} bytes).`);
}
