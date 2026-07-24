import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    svgr(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // Allows @use 'theme' / @use 'theme/colors' without relative paths
        loadPaths: [resolve(__dirname, '../../packages/ui/src')],
        api: 'modern',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
