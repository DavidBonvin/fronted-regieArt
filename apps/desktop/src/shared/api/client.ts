import { initApiClient } from '@regieart/api';
import type { TokenStorageAdapter, StoredTokens, FileReaderAdapter } from '@regieart/api';

const tokenAdapter: TokenStorageAdapter = {
  async getTokens(): Promise<StoredTokens | null> {
    const raw = sessionStorage.getItem('regieart_tokens');
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  },
  async setTokens(tokens: StoredTokens): Promise<void> {
    sessionStorage.setItem('regieart_tokens', JSON.stringify(tokens));
  },
  async clearTokens(): Promise<void> {
    sessionStorage.removeItem('regieart_tokens');
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
  /**
   * Overrides the direct R2 PUT so it goes through the Vite dev-server proxy (/r2-proxy),
   * bypassing the CORS preflight that the browser would otherwise block.
   * In production builds (import.meta.env.DEV === false) the URL is used as-is.
   */
  async putToPresignedUrl(url: string, body: ArrayBuffer | Blob, contentType: string): Promise<void> {
    let effectiveUrl = url;

    if (import.meta.env.DEV) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith('r2.cloudflarestorage.com')) {
          // Route through /r2-proxy → Vite proxies to the real R2 bucket (no CORS)
          effectiveUrl = `/r2-proxy${parsed.pathname}${parsed.search}`;
        }
      } catch { /* keep original URL if parsing fails */ }
    }

    // 10-minute hard cap: if R2 or the Vite proxy silently drops the connection
    // (e.g. socket inactivity reset for large files), fetch() would wait forever
    // without a signal.  AbortSignal.timeout surfaces it as a clear error instead.
    const signal = AbortSignal.timeout(10 * 60 * 1000);

    const resp = await fetch(effectiveUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body,
      signal,
    });

    if (!resp.ok) {
      // R2 returns XML errors; try to extract the <Message> tag for readability
      const text = await resp.text().catch(() => '');
      const match = text.match(/<Message>([^<]+)<\/Message>/);
      const msg = match ? match[1] : text.slice(0, 300);
      throw new Error(`R2 PUT failed HTTP ${resp.status}: ${msg}`);
    }
  },
};

initApiClient({
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3005/api/v1',
  keycloakUrl: import.meta.env.VITE_KEYCLOAK_URL ?? 'https://keycloak-production-b2ce.up.railway.app',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'regieart',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'regieart-mobile',
  tokenAdapter,
  fileReaderAdapter,
  onSessionExpired: () => {
    window.location.href = '/auth/login';
  },
});
