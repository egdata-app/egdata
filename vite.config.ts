import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'royale-radar',
      project: 'egdata',
    }),
    tanstackStart({
      target: 'bun',
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        swSrc: 'src/sw.ts',
        swDest: 'sw.js',
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'EGData',
        short_name: 'EGData',
        description: 'Epic Games Store data and analytics',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
          },
          {
            src: '/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
          {
            src: '/mstile-150x150.png',
            sizes: '150x150',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  build: {
    minify: 'oxc',
    sourcemap: true,
  },
  ssr: {
    noExternal: [
      '@react-spectrum/image',
      '@react-spectrum/provider',
      '@vidstack/react',
    ],
  },
});
