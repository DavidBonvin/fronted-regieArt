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

const apiBaseUrl = import.meta.env.DEV
  ? '/api-prod'
  : 'https://regieart-backend-production.up.railway.app/api/v1';

initApiClient({
  apiBaseUrl,
  keycloakUrl: 'https://keycloak-production-b2ce.up.railway.app',
  realm: 'regieart',
  clientId: 'regieart-mobile',
  tokenAdapter,
  fileReaderAdapter,
  onSessionExpired: () => {
    window.location.href = '/login';
  },
});
