import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import react from "@vitejs/plugin-react";
import { nitroV2Plugin as nitro } from "@tanstack/nitro-v2-vite-plugin";
import { devtools } from "@tanstack/devtools-vite";

export default defineConfig({
  plugins: [
    devtools(),
    tailwindcss(),
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "royale-radar",
      project: "egdata",
    }),
    nitro({
      preset: "node-server",
      compatibilityDate: "2025-12-05",
      routeRules: {
        "/**": {
          headers: {
            "Content-Security-Policy": [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://analytics.egdata.app https://insights.egdata.app https://*.sentry.io https://www.googletagmanager.com https://analytics.ahrefs.com https://static.cloudflareinsights.com chrome-extension: moz-extension:",
              "style-src 'self' 'unsafe-inline' https://cdn.egdata.app chrome-extension: moz-extension:",
              "img-src 'self' data: blob: https: chrome-extension: moz-extension:",
              "font-src 'self' data: https://cdn.egdata.app chrome-extension: moz-extension:",
              "connect-src 'self' https://api.egdata.app https://cdn.egdata.app https://analytics.egdata.app https://insights.egdata.app https://*.sentry.io https://*.ingest.sentry.io https://kv.better-auth.com https://www.google-analytics.com https://*.analytics.google.com https://analytics.ahrefs.com https://cloudflareinsights.com chrome-extension: moz-extension:",
              "media-src 'self' https://cdn.egdata.app https://cdn1.epicgames.com",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
            "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        },
      },
    }),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectManifest: {
        swSrc: "src/sw.ts",
        swDest: "dist/sw.js",
        globDirectory: "dist",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "EGData",
        short_name: "EGData",
        description: "Epic Games Store data and analytics",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/favicon-16x16.png",
            sizes: "16x16",
            type: "image/png",
          },
          {
            src: "/favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
          {
            src: "/mstile-150x150.png",
            sizes: "150x150",
            type: "image/png",
          },
        ],
      },
    }),
    tanstackStart(),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    minify: "oxc",
    sourcemap: true,
  },
  ssr: {
    noExternal: [
      "@react-spectrum/image",
      "@react-spectrum/provider",
      "@vidstack/react",
      "@tanstack/devtools",
      "graphql",
    ],
  },
});
