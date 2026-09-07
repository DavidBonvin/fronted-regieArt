import ky, { type KyInstance } from 'ky';
import { getConfig } from '../config';
import { refreshAccessToken, toStoredTokens } from '../auth/keycloak';
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

function recordAuthDebug(cause: string, detail: Record<string, unknown> = {}): void {
  try {
    localStorage.setItem('__auth_debug', JSON.stringify({
      when: new Date().toISOString(), cause, ...detail,
    }));
  } catch { /* storage unavailable */ }
}

const ROTATION_POLL_ATTEMPTS = 4;
const ROTATION_POLL_INTERVAL = 250;

// Keycloak invalidates a refresh token once it is used. Another tab racing this one
// wins the rotation, so re-read storage before declaring the session dead.
async function waitForRotatedTokens(
  tokenAdapter: ReturnType<typeof getConfig>['tokenAdapter'],
  usedRefreshToken: string,
): Promise<StoredTokens | null> {
  for (let attempt = 0; attempt < ROTATION_POLL_ATTEMPTS; attempt += 1) {
    const latest = await tokenAdapter.getTokens();
    if (latest && latest.refreshToken !== usedRefreshToken && latest.expiresAt > Date.now()) {
      return latest;
    }
    await new Promise((resolve) => setTimeout(resolve, ROTATION_POLL_INTERVAL));
  }
  return null;
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

          // The refresh token is gone too: nothing left to renew with.
          if (tokens.refreshExpiresAt <= Date.now()) {
            await config.tokenAdapter.clearTokens();
            recordAuthDebug('refresh_token_expired');
            config.onSessionExpired?.();
            throw new Error('Session expired');
          }

          isRefreshing = true;

          try {
            const refreshed = await refreshAccessToken(tokens.refreshToken);
            const newTokens = toStoredTokens(refreshed);
            await config.tokenAdapter.setTokens(newTokens);
            processQueue(null);
            request.headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
          } catch (error) {
            const rotated = await waitForRotatedTokens(config.tokenAdapter, tokens.refreshToken);
            if (rotated) {
              processQueue(null);
              request.headers.set('Authorization', `Bearer ${rotated.accessToken}`);
              return;
            }
            processQueue(error);
            await config.tokenAdapter.clearTokens();
            recordAuthDebug('refresh_failed', { error: String(error) });
            config.onSessionExpired?.();
            throw error;
          } finally {
            isRefreshing = false;
          }
        },
      ],
      afterResponse: [
        async (request, _options, response) => {
          if (response.status === 401) {
            const config = getConfig();
            await config.tokenAdapter.clearTokens();
            recordAuthDebug('401', { url: request.url, method: request.method });
            console.warn('[auth] 401 on', request.method, request.url, '— tokens cleared');
            config.onSessionExpired?.();
          }
          return response;
        },
      ],
    },
  });

  return _client;
}
