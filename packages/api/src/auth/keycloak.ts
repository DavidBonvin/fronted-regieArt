import type { TokenResponse } from '@regieart/types';
import { getConfig } from '../config';
import type { StoredTokens } from './tokenStorage';

export async function loginWithPassword(email: string, password: string): Promise<StoredTokens> {
  const { keycloakUrl, realm, clientId, tokenAdapter } = getConfig();
  const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    username: email,
    password,
    scope: 'openid offline_access',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Login timed out after 15 s')), 15_000);

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Login failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const tokenResponse = (await response.json()) as TokenResponse;

  const tokens: StoredTokens = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    refreshExpiresAt: Date.now() + tokenResponse.refresh_expires_in * 1000,
  };

  await tokenAdapter.setTokens(tokens);
  return tokens;
}

export async function refreshAccessToken(currentRefreshToken: string): Promise<TokenResponse> {
  const { keycloakUrl, realm, clientId } = getConfig();
  const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: currentRefreshToken,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Token refresh timed out after 15 s')), 15_000);

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
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
    body: body.toString(),
  });
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function registerUser(payload: RegisterPayload): Promise<void> {
  const { apiBaseUrl } = getConfig();

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('Registration timed out after 15 s')),
    15_000,
  );

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (body?.error as { message?: string })?.message ?? `Registration failed: ${response.status}`;
    throw new Error(msg);
  }
}
