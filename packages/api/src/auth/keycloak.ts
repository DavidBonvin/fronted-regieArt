import { getConfig } from '../config';
import type { StoredTokens } from './tokenStorage';

export async function loginWithPassword(email: string, password: string): Promise<StoredTokens> {
  const { apiBaseUrl, tokenAdapter } = getConfig();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Login timed out after 15 s')), 15_000);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (body?.error as { message?: string })?.message ?? 'Email o contraseña incorrectos';
    throw new Error(msg);
  }

  const body = await response.json() as { success: boolean; data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  } };

  const tokens = toStoredTokens(body.data);

  await tokenAdapter.setTokens(tokens);
  return tokens;
}

export interface BackendTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

// Keycloak occasionally omits the lifetimes; without a guard they become NaN and
// every later comparison silently reads as "expired".
const DEFAULT_EXPIRES_IN = 300;
const DEFAULT_REFRESH_EXPIRES_IN = 1800;

export function toStoredTokens(data: BackendTokens): StoredTokens {
  const expiresIn = Number.isFinite(data.expiresIn) && data.expiresIn > 0
    ? data.expiresIn : DEFAULT_EXPIRES_IN;
  const refreshExpiresIn = Number.isFinite(data.refreshExpiresIn) && data.refreshExpiresIn > 0
    ? data.refreshExpiresIn : DEFAULT_REFRESH_EXPIRES_IN;

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshExpiresAt: Date.now() + refreshExpiresIn * 1000,
  };
}

export async function refreshAccessToken(currentRefreshToken: string): Promise<BackendTokens> {
  const { apiBaseUrl } = getConfig();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Token refresh timed out after 15 s')), 15_000);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Token refresh failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    );
  }

  const body = await response.json() as { success: boolean; data: BackendTokens };
  if (!body?.data?.accessToken || !body?.data?.refreshToken) {
    throw new Error('Token refresh returned an incomplete payload');
  }
  return body.data;
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
    const err = body?.error as { message?: string; details?: string[] } | undefined;
    const msg = err?.details?.length ? err.details.join(', ') : (err?.message ?? `Registration failed: ${response.status}`);
    throw new Error(msg);
  }
}
