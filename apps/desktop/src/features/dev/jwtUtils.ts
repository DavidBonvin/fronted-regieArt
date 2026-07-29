export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  exp?: number;
  iat?: number;
  realm_access?: { roles: string[] };
  [key: string]: unknown;
}

export interface TokenTimeInfo {
  secondsRemaining: number;
  label: string;
  status: 'valid' | 'expiring' | 'expired';
  progressPercent: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenTimeInfo(exp: number, iat?: number): TokenTimeInfo {
  const now = Math.floor(Date.now() / 1000);
  const remaining = exp - now;
  const total = iat != null ? exp - iat : 300;

  if (remaining <= 0) {
    return { secondsRemaining: 0, label: 'Expired', status: 'expired', progressPercent: 0 };
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const progressPercent = Math.max(0, Math.min(100, (remaining / total) * 100));

  return {
    secondsRemaining: remaining,
    label,
    status: remaining < 60 ? 'expiring' : 'valid',
    progressPercent,
  };
}
