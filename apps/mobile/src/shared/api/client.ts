import { initApiClient } from '@regieart/api';
import type { TokenStorageAdapter, StoredTokens, FileReaderAdapter } from '@regieart/api';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const TOKENS_KEY = 'regieart_tokens';

const tokenAdapter: TokenStorageAdapter = {
  async getTokens(): Promise<StoredTokens | null> {
    const raw = await SecureStore.getItemAsync(TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  },
  async setTokens(tokens: StoredTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(tokens));
  },
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
  },
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const fileReaderAdapter: FileReaderAdapter = {
  async readAsBinary(fileOrUri: File | Blob | string): Promise<ArrayBuffer | Blob> {
    if (typeof fileOrUri !== 'string') throw new Error('Mobile adapter requires a file URI string');
    const base64 = await FileSystem.readAsStringAsync(fileOrUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64ToArrayBuffer(base64);
  },
  async readChunk(
    fileOrUri: File | Blob | string,
    start: number,
    end: number,
  ): Promise<ArrayBuffer | Blob> {
    if (typeof fileOrUri !== 'string') throw new Error('Mobile adapter requires a file URI string');
    const base64 = await FileSystem.readAsStringAsync(fileOrUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: start,
      length: end - start,
    });
    return base64ToArrayBuffer(base64);
  },
  async getSize(fileOrUri: File | Blob | string): Promise<number> {
    if (typeof fileOrUri !== 'string') throw new Error('Mobile adapter requires a file URI string');
    const info = await FileSystem.getInfoAsync(fileOrUri, { size: true });
    if (!info.exists) throw new Error(`File not found: ${fileOrUri}`);
    return (info as unknown as { size: number }).size;
  },
  /**
   * Native streaming PUT — avoids loading the file into memory.
   * Uses expo-file-system's uploadAsync which streams the file directly via the native
   * HTTP stack.  This prevents OOM errors for large files (e.g. 50 MB+ videos) that
   * would otherwise crash when Base64-encoded via readAsStringAsync.
   */
  async streamUploadToPresignedUrl(fileOrUri: string, url: string, contentType: string, sizeBytes: number): Promise<void> {
    const result = await FileSystem.uploadAsync(url, fileOrUri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(sizeBytes),
      },
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`R2 PUT failed HTTP ${result.status}: ${(result.body ?? '').slice(0, 300)}`);
    }
  },
};

initApiClient({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3005/api/v1',
  keycloakUrl:
    process.env.EXPO_PUBLIC_KEYCLOAK_URL ?? 'https://keycloak-production-b2ce.up.railway.app',
  realm: process.env.EXPO_PUBLIC_KEYCLOAK_REALM ?? 'regieart',
  clientId: process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'regieart-mobile',
  tokenAdapter,
  fileReaderAdapter,
  onSessionExpired: () => {},
});

/** Store tokens from an ROPC login so that getHttpClient() can use them immediately. */
export async function storeUserTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  refreshExpiresIn: number,
): Promise<void> {
  await tokenAdapter.setTokens({
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshExpiresAt: Date.now() + refreshExpiresIn * 1000,
  });
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
