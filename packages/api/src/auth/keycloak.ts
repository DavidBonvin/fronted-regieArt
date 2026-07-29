import type { TokenResponse } from '@regieart/types';
import { getConfig } from '../config';

export async function refreshAccessToken(currentRefreshToken: string): Promise<TokenResponse> {
  const { keycloakUrl, realm, clientId } = getConfig();
  const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: currentRefreshToken,
  });

  // 15 s hard cap — prevents isRefreshing from staying true forever when Keycloak is slow.
  // AbortSignal.timeout() is not available in React Native (Hermes), so we use a manual controller.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Token refresh timed out after 15 s')), 15_000);

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Token refresh failed with status ${response.status}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function logout(refreshToken: string): Promise<void> {
  const { keycloakUrl, realm, clientId } = getConfig();
  const logoutUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout`;

  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
  });

  await fetch(logoutUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}
