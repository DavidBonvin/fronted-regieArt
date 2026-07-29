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
    // usePolling fixes inotify file-watching on Windows + Docker Desktop (WSL2 volume mounts)
    watch: { usePolling: true, interval: 300 },
    proxy: {
      // Proxies /api-prod/* → Railway backend, bypassing CORS in local dev
      '/api-prod': {
        target: 'https://regieart-backend-production.up.railway.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api-prod/, '/api/v1'),
      },
      // Proxies /r2-proxy/* → Cloudflare R2 bucket, bypassing CORS for browser PUT uploads.
      // The presigned URL path + query params are preserved; AWS signature remains valid.
      '/r2-proxy': {
        target: 'https://regieart-media-production.e0315a593d85e644262dc2eb21b26d6c.r2.cloudflarestorage.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/r2-proxy/, ''),
        // Large audio / video files can take several minutes to upload.
        // Without these, http-proxy uses a 2-minute default and silently drops the
        // TCP connection — causing fetch() to hang indefinitely on the browser side.
        timeout:      10 * 60 * 1000, // 10 min socket inactivity timeout
        proxyTimeout: 10 * 60 * 1000, // 10 min proxy → R2 response timeout
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
});
