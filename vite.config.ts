import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        memoravel: resolve(__dirname, 'calc/memoravel/index.html'),
        diadema: resolve(__dirname, 'calc/diadema/index.html'),
      },
    },
  },
});
