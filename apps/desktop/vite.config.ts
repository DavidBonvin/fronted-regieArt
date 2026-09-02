import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // process.env wins for proxy target: docker-compose always injects local dev URLs.
  // Fallback to loadEnv for bare `vite dev` outside Docker (reads .env.local).
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const apiUrl = process.env.VITE_API_BASE_URL ?? fileEnv.VITE_API_BASE_URL;

  const localBackendTarget = (() => {
    if (apiUrl?.startsWith('http')) {
      try { return new URL(apiUrl).origin; } catch { /* fallthrough */ }
    }
    return 'http://localhost:3001';
  })();

  return {
    plugins: [
    react(),
    svgr(),
  ],
  css: {
    modules: {
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    preprocessorOptions: {
      scss: {
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
      // Proxies /api-local/* → local backend containers, bypassing CORS
      '/api-local': {
        target: localBackendTarget,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-local/, ''),
      },
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
};
});
