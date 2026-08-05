import ky, { type KyInstance } from 'ky';
import { getConfig } from '../config';
import { refreshAccessToken } from '../auth/keycloak';
import type { StoredTokens } from '../auth/tokenStorage';

let isRefreshing = false;
const failedQueue: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

function processQueue(error: unknown): void {
  for (const item of failedQueue) {
    if (error) {
      item.reject(error);
    } else {
      item.resolve();
    }
  }
  failedQueue.length = 0;
}

let _client: KyInstance | null = null;

export function resetHttpClient(): void {
  _client = null;
}

export function getHttpClient(): KyInstance {
  if (_client) return _client;

  const { apiBaseUrl } = getConfig();

  _client = ky.create({
    prefixUrl: apiBaseUrl,
    retry: 0,
    hooks: {
      beforeRequest: [
        async (request) => {
          const config = getConfig();
          const tokens = await config.tokenAdapter.getTokens();

          if (!tokens) return;

          if (isRefreshing) {
            await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Token refresh queue timeout')), 16_000);
              failedQueue.push({
                resolve: () => { clearTimeout(timer); resolve(); },
                reject:  (err) => { clearTimeout(timer); reject(err); },
              });
            });
            const freshTokens = await config.tokenAdapter.getTokens();
            if (freshTokens) {
              request.headers.set('Authorization', `Bearer ${freshTokens.accessToken}`);
            }
            return;
          }

          if (tokens.expiresAt - Date.now() >= 60_000) {
            request.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
            return;
          }

          isRefreshing = true;

          try {
            const refreshed = await refreshAccessToken(tokens.refreshToken);
            const newTokens: StoredTokens = {
              accessToken: refreshed.access_token,
              refreshToken: refreshed.refresh_token,
              expiresAt: Date.now() + refreshed.expires_in * 1000,
              refreshExpiresAt: Date.now() + refreshed.refresh_expires_in * 1000,
            };
            await config.tokenAdapter.setTokens(newTokens);
            processQueue(null);
            request.headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
          } catch (error) {
            processQueue(error);
            await config.tokenAdapter.clearTokens();
            config.onSessionExpired?.();
            throw error;
          } finally {
            isRefreshing = false;
          }
        },
      ],
      afterResponse: [
        async (_request, _options, response) => {
          if (response.status === 401) {
            const config = getConfig();
            await config.tokenAdapter.clearTokens();
            config.onSessionExpired?.();
          }
          return response;
        },
      ],
    },
  });

  return _client;
}
