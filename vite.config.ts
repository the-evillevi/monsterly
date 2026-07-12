import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

import { webManifest } from './src/pwa/web-manifest';

export default defineConfig({
  // Millisecond build timestamp: lets tabs compare who runs the newer build.
  define: {
    __APP_BUILD_ID__: JSON.stringify(String(Date.now())),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      devOptions: {
        enabled: false,
      },
      manifest: webManifest,
      // prompt, not autoUpdate: the operator chooses when to apply an update
      // ("Nueva versión disponible") instead of the app reloading mid-task.
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
