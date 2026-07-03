import { compile } from "@inlang/paraglide-js";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const LOCALES_DIR = path.resolve("src/locales");

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    }),
  );

  return files.flat();
}

async function snapshotDirectory(dir) {
  const files = await listFiles(dir);
  const snapshot = new Map();

  await Promise.all(
    files.map(async (file) => {
      snapshot.set(path.relative(dir, file), await readFile(file));
    }),
  );

  return snapshot;
}

async function restoreDirectorySnapshot(dir, snapshot) {
  const originalFiles = new Set(snapshot.keys());
  const currentFiles = await listFiles(dir);

  await Promise.all(
    currentFiles.map(async (file) => {
      const relativePath = path.relative(dir, file);
      if (!originalFiles.has(relativePath)) {
        await rm(file, { force: true });
      }
    }),
  );

  await Promise.all(
    [...snapshot.entries()].map(async ([relativePath, contents]) => {
      const file = path.join(dir, relativePath);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, contents);
    }),
  );
}

const localesSnapshot = await snapshotDirectory(LOCALES_DIR);

try {
  await compile({
    project: "./project.inlang",
    outdir: "./src/paraglide",
    strategy: ["custom-url-prefix", "cookie", "preferredLanguage", "baseLocale"],
    cookieName: "user_locale",
    emitTsDeclarations: true,
    emitGitIgnore: false,
    emitPrettierIgnore: false,
    routeStrategies: [
      { match: "/api/:path(.*)?", exclude: true },
      { match: "/auth/:path(.*)?", exclude: true },
      { match: "/sitemap.xml", exclude: true },
      { match: "/sw.js", exclude: true },
      { match: "/assets/:path(.*)?", exclude: true },
      { match: "/static/:path(.*)?", exclude: true },
    ],
  });
} finally {
  await restoreDirectorySnapshot(LOCALES_DIR, localesSnapshot);
}
