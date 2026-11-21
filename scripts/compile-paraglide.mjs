/**
 * Generates the Paraglide locale-resolution runtime (strategies, middleware,
 * AsyncLocalStorage) into src/paraglide.
 *
 * Messages are no longer Paraglide's job: they are compiled into one catalog per
 * locale by scripts/build-i18n-catalogs.mjs and lazily loaded. Pointing the
 * compiler at an empty project keeps the emitted runtime byte-identical while
 * taking ~1.5s instead of ~40s (it used to write ~3,100 message modules that the
 * app never imported).
 *
 * Locales come from the src/locales directory names, which is the single source
 * of truth for what the app can render.
 */
import { compile } from "@inlang/paraglide-js";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const LOCALES_DIR = path.resolve("src/locales");
const PROJECT_DIR = path.resolve(".cache", "paraglide.inlang");
const OUTDIR = "./src/paraglide";
const BASE_LOCALE = "en-US";

const locales = (await readdir(LOCALES_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (!locales.includes(BASE_LOCALE)) {
  console.error(`[paraglide] missing base locale ${BASE_LOCALE} in ${LOCALES_DIR}`);
  process.exit(1);
}

await rm(PROJECT_DIR, { recursive: true, force: true });
await mkdir(PROJECT_DIR, { recursive: true });

await writeFile(
  path.join(PROJECT_DIR, "settings.json"),
  JSON.stringify(
    {
      $schema: "https://inlang.com/schema/project-settings",
      baseLocale: BASE_LOCALE,
      locales,
      modules: [],
    },
    null,
    2,
  ),
  "utf8",
);

for (const locale of locales) {
  const dir = path.join(PROJECT_DIR, "messages", locale);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "translation.json"), "{}", "utf8");
}

await compile({
  project: PROJECT_DIR,
  outdir: OUTDIR,
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
