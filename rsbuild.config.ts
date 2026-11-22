import { resolve } from "node:path";
import { defineConfig, loadEnv, type RsbuildPlugin } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { tanstackStart } from "@tanstack/react-start/plugin/rsbuild";
import { buildServiceWorker, writeServiceWorker } from "./scripts/build-sw.mjs";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

const { publicVars } = loadEnv({ prefixes: ["VITE_"] });

function serviceWorkerPlugin(): RsbuildPlugin {
  let builtSw: Awaited<ReturnType<typeof buildServiceWorker>> | null = null;
  let swVersion: string | null = null;

  return {
    name: "egdata-service-worker",
    setup(api) {
      api.modifyRsbuildConfig(async (config, { mergeRsbuildConfig }) => {
        if (api.context.action !== "build") {
          return mergeRsbuildConfig(config, {
            source: {
              define: {
                __SW_VERSION__: JSON.stringify(process.env.VITE_SW_VERSION || "dev"),
              },
            },
          });
        }

        builtSw = await buildServiceWorker(api.context.rootPath);
        swVersion = process.env.VITE_SW_VERSION || builtSw.hash;

        return mergeRsbuildConfig(config, {
          source: {
            define: {
              __SW_VERSION__: JSON.stringify(swVersion),
            },
          },
        });
      });

      api.onAfterBuild(async () => {
        if (!builtSw || !swVersion) return;

        for (const warning of builtSw.warnings) {
          console.warn(warning);
        }

        const swDest = resolve(api.context.rootPath, "dist", "client", `sw.${swVersion}.js`);
        await writeServiceWorker(swDest, builtSw.code);
        console.log(
          `Generated ${swDest} (${builtSw.hash}) with ${builtSw.count} precache entries (${builtSw.size} bytes).`,
        );
      });
    },
  };
}

function getCssUrlAssetName(sourceFilename: string | undefined, fallbackName: string) {
  const normalized = (sourceFilename || fallbackName).replaceAll("\\", "/");

  if (normalized.includes("@vidstack/react/player/styles/default/layouts/audio.css")) {
    return "vidstack-audio";
  }

  if (normalized.includes("@vidstack/react/player/styles/default/layouts/video.css")) {
    return "vidstack-video";
  }

  if (normalized.includes("@vidstack/react/player/styles/default/theme.css")) {
    return "vidstack-theme";
  }

  return fallbackName.split("/").pop() || "style";
}

// CDN prefix for hashed assets, baked into the build when set
// (e.g. ASSET_PREFIX=https://static.egdata.app). TanStack Start's rsbuild
// plugin overrides per-environment output.assetPrefix with publicBase ("/"),
// so we re-apply the CDN prefix in modifyEnvironmentConfig (which runs after
// modifyRsbuildConfig). This sets rspack's client publicPath for async chunks,
// prefixes ?url asset imports in SSR, and causes rsbuild:define to bake
// process.env.ASSET_PREFIX into the SSR bundle for transformAssets in src/server.ts.
const assetPrefix = process.env.ASSET_PREFIX?.trim().replace(/\/+$/, "") || "";

function cdnAssetPrefixPlugin(prefix: string): RsbuildPlugin {
  return {
    name: "egdata-cdn-asset-prefix",
    setup(api) {
      if (!prefix) return;

      api.modifyEnvironmentConfig((config, { mergeEnvironmentConfig }) => {
        if (api.context.action === "dev") return config;

        return mergeEnvironmentConfig(config, {
          output: {
            assetPrefix: prefix,
          },
        });
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    headers: SECURITY_HEADERS,
    publicDir: {
      name: "public",
      copyOnBuild: "auto",
      ignore: ["sw.js"],
    },
  },
  source: {
    define: {
      ...publicVars,
    },
  },
  output: {
    manifest: true,
    assetPrefix: assetPrefix || "/",
    sourceMap: {
      css: true,
      js: "source-map",
    },
  },
  tools: {
    cssLoader: {
      url: {
        // Leave root-relative public/ URLs (e.g. /fonts/...) untouched so css-loader
        // doesn't try to resolve them as module imports during bundling.
        filter: (url) => !url.startsWith("/"),
      },
    },
    bundlerChain(chain, { CHAIN_ID }) {
      chain.module
        .rule(CHAIN_ID.RULE.CSS)
        .oneOf(CHAIN_ID.ONE_OF.CSS_URL)
        .use(CHAIN_ID.USE.CSS_URL)
        .tap((options) => ({
          ...(typeof options === "object" && options !== null ? options : {}),
          filename: (
            pathData: { chunk?: { name?: string }; contentHash?: string },
            assetInfo?: { sourceFilename?: string },
          ) => {
            const hash = pathData.contentHash?.slice(0, 10) || "[contenthash:10]";
            const name = getCssUrlAssetName(assetInfo?.sourceFilename, pathData.chunk?.name || "");

            return `static/css/assets/${name}.${hash}.css`;
          },
        }));
    },
  },
  environments: {
    ssr: {
      output: {
        autoExternal: {
          exclude: [
            "@react-spectrum/image",
            "@react-spectrum/provider",
            "@vidstack/react",
            "@mdxeditor/editor",
            "@tanstack/devtools",
            "@tanstack/react-start",
          ],
        },
      },
    },
  },
  plugins: [
    pluginReact(),
    pluginTailwindcss(),
    tanstackStart(),
    cdnAssetPrefixPlugin(assetPrefix),
    serviceWorkerPlugin(),
  ],
});
