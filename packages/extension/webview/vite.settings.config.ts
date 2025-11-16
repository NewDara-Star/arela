import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: '../out/webview',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, '../webview-settings/main.ts'),
      output: {
        entryFileNames: 'settings-bundle.js',
        assetFileNames: 'settings-bundle.css',
      },
    },
  },
});
