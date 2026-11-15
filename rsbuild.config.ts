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
        const swVersion = process.env.VITE_SW_VERSION || builtSw.hash;

        return mergeRsbuildConfig(config, {
          source: {
            define: {
              __SW_VERSION__: JSON.stringify(swVersion),
            },
          },
        });
      });

      api.onAfterBuild(async () => {
        if (!builtSw) return;

        for (const warning of builtSw.warnings) {
          console.warn(warning);
        }

        const swDest = resolve(api.context.rootPath, "dist", "client", "sw.js");
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
    sourceMap: {
      css: true,
      js: "source-map",
    },
  },
  tools: {
    bundlerChain(chain, { CHAIN_ID }) {
      chain.module
        .rule(CHAIN_ID.RULE.CSS)
        .oneOf(CHAIN_ID.ONE_OF.CSS_URL)
        .use(CHAIN_ID.USE.CSS_URL)
        .tap((options: { filename?: unknown; modules?: unknown }) => ({
          ...options,
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
            "graphql",
          ],
        },
      },
    },
  },
  plugins: [pluginReact(), pluginTailwindcss(), tanstackStart(), serviceWorkerPlugin()],
});
