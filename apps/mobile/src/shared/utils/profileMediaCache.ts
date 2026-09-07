import AsyncStorage from '@react-native-async-storage/async-storage';

const AVATAR_PREFIX = '@regieart:avatarCache:';
const BANNER_PREFIX = '@regieart:bannerCache:';

// Session-scoped image caches written by profile/organization screens.
const CACHE_PREFIXES = [AVATAR_PREFIX, BANNER_PREFIX, '@regieart:orgLogo:', '@regieart:orgBanner:'];
const LEGACY_KEYS = ['@regieart:myAvatarCache', '@regieart:myBannerCache'];

export function avatarCacheKey(userId: string): string {
  return `${AVATAR_PREFIX}${userId}`;
}

export function bannerCacheKey(userId: string): string {
  return `${BANNER_PREFIX}${userId}`;
}

export async function readProfileMedia(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key).catch(() => null);
}

export async function writeProfileMedia(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value).catch(() => {});
}

export async function removeProfileMedia(key: string): Promise<void> {
  await AsyncStorage.removeItem(key).catch(() => {});
}

export async function clearProfileMediaCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter((k) => CACHE_PREFIXES.some((prefix) => k.startsWith(prefix)));
    await AsyncStorage.multiRemove([...stale, ...LEGACY_KEYS]);
  } catch { /* ignore */ }
}
