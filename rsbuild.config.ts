import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { sentryWebpackPlugin } from "@sentry/webpack-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/rsbuild";
import { SECURITY_HEADERS } from "./src/lib/security-headers";

const { publicVars } = loadEnv({ prefixes: ["VITE_"] });

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
    define: publicVars,
  },
  output: {
    sourceMap: true,
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
  tools: {
    rspack(_config, { appendPlugins }) {
      if (!process.env.SENTRY_AUTH_TOKEN) {
        return;
      }

      appendPlugins(
        sentryWebpackPlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: "royale-radar",
          project: "egdata",
        }),
      );
    },
  },
  plugins: [pluginReact(), pluginTailwindcss(), tanstackStart()],
});
