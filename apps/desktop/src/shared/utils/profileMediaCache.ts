const AVATAR_PREFIX = 'regieart:avatarCache:';
const BANNER_PREFIX = 'regieart:bannerCache:';

// Session-scoped image caches written by profile/organization pages.
const CACHE_PREFIXES = [AVATAR_PREFIX, BANNER_PREFIX, 'regieart:orgLogo:', 'regieart:orgBanner:'];
const LEGACY_KEYS = ['regieart:myAvatarCache', 'regieart:myBannerCache'];

export function avatarCacheKey(userId: string): string {
  return `${AVATAR_PREFIX}${userId}`;
}

export function bannerCacheKey(userId: string): string {
  return `${BANNER_PREFIX}${userId}`;
}

export function readProfileMedia(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeProfileMedia(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota or disabled storage */ }
}

export function removeProfileMedia(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function clearProfileMediaCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && CACHE_PREFIXES.some((prefix) => k.startsWith(prefix))) keys.push(k);
    }
    [...keys, ...LEGACY_KEYS].forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
