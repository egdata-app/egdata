import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    // We don't want to clean up the output directory that contains our other public files
    emptyOutDir: false,
    // Output to the public folder
    outDir: 'public',
    lib: {
      entry: 'src/sw.ts',
      name: 'ServiceWorker',
      fileName: 'sw',
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'sw.js',
        format: 'es',
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
});
