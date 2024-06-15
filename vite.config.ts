import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      appDirectory: 'src/app',
    }),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    include: ['@amcharts/amcharts5'],
  },
  ssr: {
    noExternal: ['@amcharts/amcharts5', 'remix-utils'],
  },
});
