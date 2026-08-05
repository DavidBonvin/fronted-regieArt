import { getPresignedDownloadUrl } from './storage.service';

const cache = new Map<string, { url: string; expiresAt: number }>();
const inFlight = new Map<string, Promise<string>>();

function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url);
    if (
      u.hostname.endsWith('.r2.cloudflarestorage.com') &&
      !u.searchParams.has('X-Amz-Signature')
    ) {
      return u.pathname.slice(1); // strip leading "/"
    }
  } catch {}
  return null;
}

export async function resolveImageUrl(rawUrl: string | null | undefined): Promise<string | null> {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;

  const key = extractR2Key(rawUrl);
  if (!key) return rawUrl; // already signed or different domain

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + 120_000) return hit.url;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = getPresignedDownloadUrl(key)
    .then(({ downloadUrl, expiresAt }) => {
      cache.set(key, { url: downloadUrl, expiresAt: new Date(expiresAt).getTime() });
      inFlight.delete(key);
      return downloadUrl;
    })
    .catch(() => {
      inFlight.delete(key);
      return rawUrl;
    });

  inFlight.set(key, promise);
  return promise;
}

export async function resolveImageUrls(
  rawUrls: (string | null | undefined)[],
): Promise<(string | null)[]> {
  return Promise.all(rawUrls.map(resolveImageUrl));
}

export function clearImageCache(): void {
  cache.clear();
  inFlight.clear();
}
