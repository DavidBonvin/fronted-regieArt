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
    const info = await FileSystem.getInfoAsync(fileOrUri);
    if (!info.exists) throw new Error(`File not found: ${fileOrUri}`);
    return (info as unknown as { size: number }).size;
  },
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

export async function getStoredTokens() {
  return tokenAdapter.getTokens();
}

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
