import { resolve } from 'path';
import { defineConfig } from 'vite';

const entryFile = process.env.ENTRY;

if (!entryFile) throw new Error('ENTRY env variable is required');


export default defineConfig({
  build: {
    lib: {
      entry: resolve(`electron/preload/${entryFile}.ts`),
      formats: ['cjs'],
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        dir: 'dist/electron',
        /*
         * preload must be cjs format.
         * if mjs, it will be error:
         *   - Unable to load preload script.
         *   - SyntaxError: Cannot use import statement outside a module.
         */
        // Output filename configuration for multiple entries
        entryFileNames: `preload/${entryFile}.cjs`,
        format: 'cjs',
        manualChunks: undefined, // 👈 Disable chunk splitting
      },
    },
    minify: false,
    emptyOutDir: false,
  },
  esbuild: {
    platform: 'node',
  },
});
