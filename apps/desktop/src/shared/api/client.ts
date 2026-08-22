import { initApiClient } from '@regieart/api';
import type { TokenStorageAdapter, StoredTokens, FileReaderAdapter } from '@regieart/api';

const tokenAdapter: TokenStorageAdapter = {
  async getTokens(): Promise<StoredTokens | null> {
    const raw = localStorage.getItem('regieart_tokens');
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  },
  async setTokens(tokens: StoredTokens): Promise<void> {
    localStorage.setItem('regieart_tokens', JSON.stringify(tokens));
  },
  async clearTokens(): Promise<void> {
    localStorage.removeItem('regieart_tokens');
  },
};

const fileReaderAdapter: FileReaderAdapter = {
  async readAsBinary(fileOrUri: File | Blob | string): Promise<ArrayBuffer | Blob> {
    if (!(fileOrUri instanceof Blob)) throw new Error('Desktop adapter requires a File or Blob');
    return fileOrUri;
  },
  async readChunk(fileOrUri: File | Blob | string, start: number, end: number): Promise<ArrayBuffer | Blob> {
    if (!(fileOrUri instanceof Blob)) throw new Error('Desktop adapter requires a File or Blob');
    return fileOrUri.slice(start, end);
  },
  async getSize(fileOrUri: File | Blob | string): Promise<number> {
    if (!(fileOrUri instanceof Blob)) throw new Error('Desktop adapter requires a File or Blob');
    return fileOrUri.size;
  },
  async putToPresignedUrl(url: string, body: ArrayBuffer | Blob, contentType: string): Promise<void> {
    let effectiveUrl = url;

    if (import.meta.env.DEV) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith('r2.cloudflarestorage.com')) {

          effectiveUrl = `/r2-proxy${parsed.pathname}${parsed.search}`;
        }
      } catch { /* keep original URL if parsing fails */ }
    }

    const signal = AbortSignal.timeout(10 * 60 * 1000);

    const resp = await fetch(effectiveUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body,
      signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      const match = text.match(/<Message>([^<]+)<\/Message>/);
      const msg = match ? match[1] : text.slice(0, 300);
      throw new Error(`R2 PUT failed HTTP ${resp.status}: ${msg}`);
    }
  },
};

const apiBaseUrl = (() => {
  if (!import.meta.env.DEV) {
    // Production: VITE_API_BASE_URL is set in Vercel (may be domain-only or full path)
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)
      ?? 'https://regieart-backend-production.up.railway.app/api/v1';
    try {
      const u = new URL(base);
      if (u.pathname === '/' || u.pathname === '') {
        u.pathname = '/api/v1';
        return u.toString();
      }
    } catch { /* keep as-is */ }
    return base;
  }
  // Local dev: always route through the Vite /api-local proxy.
  // Proxy target is configured in vite.config.ts via process.env — not needed here.
  return '/api-local/api/v1';
})();

const keycloakUrl = (import.meta.env.VITE_KEYCLOAK_URL as string | undefined)
  ?? 'https://keycloak-production-b2ce.up.railway.app';
const realm = (import.meta.env.VITE_KEYCLOAK_REALM as string | undefined) ?? 'regieart';
const clientId = (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? 'regieart-mobile';

initApiClient({
  apiBaseUrl,
  keycloakUrl,
  realm,
  clientId,
  tokenAdapter,
  fileReaderAdapter,
  onSessionExpired: () => {
    window.location.href = '/login';
  },
});
