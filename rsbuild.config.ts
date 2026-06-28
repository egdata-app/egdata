import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { tanstackStart } from "@tanstack/react-start/plugin/rsbuild";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

const { publicVars } = loadEnv({ prefixes: ["VITE_"] });
const swVersion =
  process.env.VITE_SW_VERSION ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  Date.now().toString();

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
      __SW_VERSION__: JSON.stringify(swVersion),
    },
  },
  output: {
    sourceMap: {
      css: true,
      js: "source-map",
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
  plugins: [pluginReact(), pluginTailwindcss(), tanstackStart()],
});
