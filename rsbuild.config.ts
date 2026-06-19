import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { sentryWebpackPlugin } from "@sentry/webpack-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/rsbuild";

const { publicVars } = loadEnv({ prefixes: ["VITE_"] });

const shouldUploadSourcemaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

const ssrNoExternalPackages = [
  "@react-spectrum/image",
  "@react-spectrum/provider",
  "@mdxeditor/editor",
  "@vidstack/react",
  "@tanstack/devtools",
  "@tanstack/react-router",
  "@tanstack/react-router-ssr-query",
  "@tanstack/react-router-with-query",
  "@tanstack/react-start",
  "@tanstack/router-core",
  "@tanstack/start-client-core",
  "@tanstack/start-server-core",
  "graphql",
];

export default defineConfig({
  server: {
    port: 3000,
  },
  source: {
    define: publicVars,
  },
  output: {
    sourceMap: {
      js: shouldUploadSourcemaps ? "hidden-source-map" : "source-map",
      css: true,
    },
  },
  environments: {
    ssr: {
      output: {
        autoExternal: {
          exclude: ssrNoExternalPackages,
        },
      },
    },
  },
  tools: {
    rspack(config, { isProd, isServer }) {
      if (!shouldUploadSourcemaps || !isProd || isServer) {
        return;
      }

      config.plugins.push(
        sentryWebpackPlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: "royale-radar",
          project: "egdata",
        }),
      );
    },
  },
  plugins: [
    pluginReact(),
    pluginTailwindcss(),
    tanstackStart({
      start: {
        entry: "start.ts",
      },
    }),
  ],
});
